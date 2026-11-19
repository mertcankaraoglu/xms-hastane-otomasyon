CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists(select 1 from public.user_roles where user_id=_user_id and ((role='admin' and active) or role='superadmin'))
$$;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- Raises with HINT = machine-readable code.
CREATE OR REPLACE FUNCTION public._booking_fail(_code text, _msg text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION '%', _msg USING HINT = _code, ERRCODE = 'P0001'; END $$;
REVOKE ALL ON FUNCTION public._booking_fail(text, text) FROM PUBLIC, anon, authenticated;

-- Shared slot validation; takes an advisory lock per doctor for the rest of the transaction.
CREATE OR REPLACE FUNCTION public._validate_slot(_doctor_id uuid, _starts_at timestamptz, _exclude uuid DEFAULT NULL)
RETURNS public.doctors LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.doctors; loc timestamp; dow text; rng jsonb; s int; e int; t int; ends timestamptz;
BEGIN
  SELECT * INTO d FROM public.doctors WHERE id=_doctor_id;
  IF d.id IS NULL THEN PERFORM public._booking_fail('doctor_not_found','Doktor bulunamadı'); END IF;
  IF NOT d.active THEN PERFORM public._booking_fail('doctor_inactive','Bu doktor şu anda randevu kabul etmiyor'); END IF;
  IF _starts_at IS NULL OR _starts_at <= now() THEN PERFORM public._booking_fail('past_time','Geçmiş bir saat seçilemez'); END IF;
  loc := _starts_at AT TIME ZONE 'Europe/Istanbul';
  IF EXISTS(SELECT 1 FROM public.closed_days WHERE day = loc::date) THEN
    PERFORM public._booking_fail('hospital_closed','Seçilen gün hastane kapalı'); END IF;
  dow := extract(isodow FROM loc)::int::text;
  rng := d.working_hours -> dow;
  IF rng IS NULL OR jsonb_typeof(rng) <> 'array' OR d.slot_minutes <= 0 THEN
    PERFORM public._booking_fail('outside_working_hours','Doktor bu gün çalışmıyor'); END IF;
  s := split_part(rng->>0, ':', 1)::int*60 + split_part(rng->>0, ':', 2)::int;
  e := split_part(rng->>1, ':', 1)::int*60 + split_part(rng->>1, ':', 2)::int;
  t := extract(hour FROM loc)::int*60 + extract(minute FROM loc)::int;
  IF extract(second FROM loc) <> 0 OR t < s OR t + d.slot_minutes > e OR (t - s) % d.slot_minutes <> 0 THEN
    PERFORM public._booking_fail('invalid_slot','Seçilen saat doktorun randevu saatlerine uygun değil'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('appt:' || _doctor_id::text, 0));
  ends := _starts_at + make_interval(mins => d.slot_minutes);
  IF EXISTS(SELECT 1 FROM public.appointments a WHERE a.doctor_id=_doctor_id AND a.status <> 'cancelled'
            AND (_exclude IS NULL OR a.id <> _exclude) AND a.starts_at < ends AND a.ends_at > _starts_at) THEN
    PERFORM public._booking_fail('slot_taken','Bu saat dolu, lütfen başka bir saat seçin'); END IF;
  RETURN d;
END $$;
REVOKE ALL ON FUNCTION public._validate_slot(uuid, timestamptz, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.book_appointment(_doctor_id uuid, _starts_at timestamptz, _full_name text, _tc_no text, _phone text, _email text, _complaint text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.doctors; p_id uuid; p_phone text; c text; ph10 text; n int;
BEGIN
  IF _phone IS NULL OR length(_phone) > 20 OR _phone !~ '^[0-9 ()-]+$' THEN
    PERFORM public._booking_fail('invalid_phone','Telefon numarası 0 ile başlayan 11 rakam olmalı'); END IF;
  _phone := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF _phone !~ '^0[1-9][0-9]{9}$' THEN
    PERFORM public._booking_fail('invalid_phone','Telefon numarası 0 ile başlayan 11 rakam olmalı'); END IF;
  IF length(coalesce(trim(_full_name),'')) < 3 THEN PERFORM public._booking_fail('invalid_input','Eksik bilgi'); END IF;
  _tc_no := nullif(trim(coalesce(_tc_no,'')),'');
  IF _tc_no IS NOT NULL AND _tc_no !~ '^[0-9]{11}$' THEN PERFORM public._booking_fail('invalid_input','TC kimlik no 11 haneli olmalı'); END IF;
  ph10 := right(_phone, 10);

  d := public._validate_slot(_doctor_id, _starts_at);

  IF _tc_no IS NOT NULL THEN
    SELECT id, phone INTO p_id, p_phone FROM public.patients WHERE tc_no=_tc_no;
    IF p_id IS NOT NULL AND right(regexp_replace(p_phone,'\D','','g'),10) <> ph10 THEN
      PERFORM public._booking_fail('tc_phone_mismatch','Bu TC kimlik numarası farklı bir telefonla kayıtlı. Lütfen kayıtlı telefonunuzu girin veya hastaneyi arayın.'); END IF;
  END IF;

  SELECT count(*) INTO n FROM public.appointments a JOIN public.patients p ON p.id=a.patient_id
   WHERE a.status IN ('pending','confirmed') AND a.starts_at > now()
     AND ((_tc_no IS NOT NULL AND p.tc_no=_tc_no) OR right(regexp_replace(p.phone,'\D','','g'),10)=ph10);
  IF n >= 3 THEN PERFORM public._booking_fail('too_many_active','En fazla 3 ileri tarihli aktif randevunuz olabilir'); END IF;

  IF EXISTS(SELECT 1 FROM public.appointments a JOIN public.patients p ON p.id=a.patient_id
     WHERE a.doctor_id=_doctor_id AND a.status <> 'cancelled'
       AND (a.starts_at AT TIME ZONE 'Europe/Istanbul')::date = (_starts_at AT TIME ZONE 'Europe/Istanbul')::date
       AND ((_tc_no IS NOT NULL AND p.tc_no=_tc_no) OR right(regexp_replace(p.phone,'\D','','g'),10)=ph10)) THEN
    PERFORM public._booking_fail('same_day_duplicate','Aynı gün aynı doktordan zaten randevunuz var'); END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.patients(full_name, tc_no, phone, email)
    VALUES (trim(_full_name), _tc_no, _phone, nullif(_email,'')) RETURNING id INTO p_id;
  END IF;
  BEGIN
    INSERT INTO public.appointments(patient_id, doctor_id, starts_at, ends_at, complaint, source)
    VALUES (p_id, _doctor_id, _starts_at, _starts_at + make_interval(mins => d.slot_minutes), nullif(_complaint,''), 'online')
    RETURNING code INTO c;
  EXCEPTION WHEN unique_violation THEN
    PERFORM public._booking_fail('slot_taken','Bu saat az önce doldu, lütfen başka bir saat seçin');
  END;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.book_appointment(uuid, timestamptz, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, timestamptz, text, text, text, text, text) TO anon, authenticated, service_role;

-- Staff: create (optional new patient) + appointment atomically.
CREATE OR REPLACE FUNCTION public.panel_create_appointment(_doctor_id uuid, _starts_at timestamptz, _patient_id uuid, _full_name text, _tc_no text, _phone text, _status public.appointment_status, _complaint text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE d public.doctors; p_id uuid := _patient_id; p_phone text; c text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING HINT='forbidden'; END IF;
  d := public._validate_slot(_doctor_id, _starts_at);
  IF p_id IS NULL THEN
    _phone := regexp_replace(coalesce(_phone,''), '[^0-9]', '', 'g');
    IF _phone !~ '^0[1-9][0-9]{9}$' THEN PERFORM public._booking_fail('invalid_phone','Telefon numarası 0 ile başlayan 11 rakam olmalı'); END IF;
    IF length(coalesce(trim(_full_name),'')) < 3 THEN PERFORM public._booking_fail('invalid_input','Hasta adı eksik'); END IF;
    _tc_no := nullif(trim(coalesce(_tc_no,'')),'');
    IF _tc_no IS NOT NULL AND _tc_no !~ '^[0-9]{11}$' THEN PERFORM public._booking_fail('invalid_input','TC kimlik no 11 haneli olmalı'); END IF;
    IF _tc_no IS NOT NULL THEN
      SELECT id, phone INTO p_id, p_phone FROM public.patients WHERE tc_no=_tc_no;
      IF p_id IS NOT NULL AND right(regexp_replace(p_phone,'\D','','g'),10) <> right(_phone,10) THEN
        PERFORM public._booking_fail('tc_phone_mismatch','Bu TC kimlik numarası farklı bir telefonla kayıtlı; hastayı aramadan seçin.'); END IF;
    END IF;
    IF p_id IS NULL THEN
      INSERT INTO public.patients(full_name, tc_no, phone) VALUES (trim(_full_name), _tc_no, _phone) RETURNING id INTO p_id;
    END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM public.patients WHERE id=p_id) THEN
    PERFORM public._booking_fail('invalid_input','Hasta bulunamadı');
  END IF;
  BEGIN
    INSERT INTO public.appointments(patient_id, doctor_id, starts_at, ends_at, status, complaint, source)
    VALUES (p_id, _doctor_id, _starts_at, _starts_at + make_interval(mins => d.slot_minutes), coalesce(_status,'confirmed'), nullif(_complaint,''), 'panel')
    RETURNING code INTO c;
  EXCEPTION WHEN unique_violation THEN
    PERFORM public._booking_fail('slot_taken','Bu saat dolu');
  END;
  RETURN c;
END $$;
REVOKE ALL ON FUNCTION public.panel_create_appointment(uuid, timestamptz, uuid, text, text, text, public.appointment_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.panel_create_appointment(uuid, timestamptz, uuid, text, text, text, public.appointment_status, text) TO authenticated, service_role;

-- Server-only RPCs
REVOKE ALL ON FUNCTION public.log_integration_event(text, text, uuid, text, text, text, text, text, jsonb, jsonb, text, text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_integration_event(text, text, uuid, text, text, text, text, text, jsonb, jsonb, text, text, integer, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION public.api_hit(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.api_hit(text, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.chat_append_assistant(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_append_assistant(uuid, text, text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.kb_fallback(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kb_fallback(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.match_kb(extensions.vector, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_kb(extensions.vector, integer) TO authenticated, service_role;

-- Visitors may only append their own 'user' messages.
CREATE OR REPLACE FUNCTION public.chat_append(_id uuid, _token text, _role text, _content text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _n int;
BEGIN
  IF NOT public.chat_check(_id, _token) THEN RAISE EXCEPTION 'invalid conversation'; END IF;
  IF _role IS DISTINCT FROM 'user' OR length(_content) > 8000 THEN RAISE EXCEPTION 'invalid message'; END IF;
  SELECT message_count INTO _n FROM chat_conversations WHERE id = _id FOR UPDATE;
  IF _n >= 80 THEN RAISE EXCEPTION 'conversation limit reached'; END IF;
  INSERT INTO chat_messages(conversation_id, role, content, sources) VALUES (_id, 'user', _content, NULL);
  UPDATE chat_conversations SET message_count = message_count + 1, updated_at = now() WHERE id = _id;
END $$;

-- Reception cannot delete; only admin/superadmin.
DROP POLICY IF EXISTS "staff manage doctors" ON public.doctors;
CREATE POLICY "staff insert doctors" ON public.doctors FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update doctors" ON public.doctors FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admin delete doctors" ON public.doctors FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "staff manage departments" ON public.departments;
CREATE POLICY "staff insert departments" ON public.departments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update departments" ON public.departments FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admin delete departments" ON public.departments FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "staff manage patients" ON public.patients;
CREATE POLICY "staff read patients" ON public.patients FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update patients" ON public.patients FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "admin delete patients" ON public.patients FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "kb staff delete" ON public.kb_articles;
CREATE POLICY "kb admin delete" ON public.kb_articles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "staff delete conv" ON public.chat_conversations;
CREATE POLICY "admin delete conv" ON public.chat_conversations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));