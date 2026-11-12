CREATE OR REPLACE FUNCTION public.book_appointment(_doctor_id uuid, _starts_at timestamptz, _full_name text, _tc_no text, _phone text, _email text, _complaint text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare d public.doctors; p_id uuid; c text;
begin
  if _phone is null or length(_phone) > 20 or _phone !~ '^[0-9 ()-]+$' then
    raise exception 'Telefon numarası 0 ile başlayan 11 rakam olmalı';
  end if;
  _phone := regexp_replace(_phone, '[^0-9]', '', 'g');
  if _phone !~ '^0[1-9][0-9]{9}$' then
    raise exception 'Telefon numarası 0 ile başlayan 11 rakam olmalı';
  end if;
  select * into d from public.doctors where id=_doctor_id and active;
  if d.id is null then raise exception 'Doktor bulunamadı'; end if;
  if _starts_at < now() then raise exception 'Geçmiş bir saat seçilemez'; end if;
  if exists(select 1 from public.closed_days where day = (_starts_at at time zone 'Europe/Istanbul')::date) then
    raise exception 'Seçilen gün hastane kapalı'; end if;
  if length(coalesce(_full_name,'')) < 3 then raise exception 'Eksik bilgi'; end if;
  if _tc_no is not null and _tc_no <> '' then
    select id into p_id from public.patients where tc_no=_tc_no;
  end if;
  if p_id is null then
    insert into public.patients(full_name, tc_no, phone, email)
    values (_full_name, nullif(_tc_no,''), _phone, nullif(_email,'')) returning id into p_id;
  end if;
  begin
    insert into public.appointments(patient_id, doctor_id, starts_at, ends_at, complaint, source)
    values (p_id, _doctor_id, _starts_at, _starts_at + make_interval(mins => d.slot_minutes), _complaint, 'online')
    returning code into c;
  exception when unique_violation then
    raise exception 'Bu saat az önce doldu, lütfen başka bir saat seçin';
  end;
  return c;
end $$;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, timestamptz, text, text, text, text, text) TO anon, authenticated;
DO $$
DECLARE phone text; rejected boolean;
BEGIN
  FOREACH phone IN ARRAY ARRAY['0532123456', '053212345678', '15321234567', '----------', '0532123456a'] LOOP
    rejected := false;
    BEGIN
      PERFORM public.book_appointment(null, null, 'Validation Test', '', phone, '', '');
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'Telefon numarası 0 ile başlayan 11 rakam olmalı' THEN rejected := true; ELSE RAISE; END IF;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Invalid phone was accepted'; END IF;
  END LOOP;
END $$;