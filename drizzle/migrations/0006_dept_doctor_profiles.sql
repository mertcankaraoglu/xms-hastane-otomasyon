CREATE OR REPLACE FUNCTION public.tr_slugify(_t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(lower(translate(_t, 'çğıöşüÇĞİÖŞÜI', 'cgiosucgiosui')), '[^a-z0-9]+', '-', 'g'))
$$;

ALTER TABLE public.departments
  ADD COLUMN slug text,
  ADD COLUMN short_description text,
  ADD COLUMN long_description text,
  ADD COLUMN services text[] NOT NULL DEFAULT '{}',
  ADD COLUMN cover_url text;
UPDATE public.departments SET slug = public.tr_slugify(name);
CREATE UNIQUE INDEX departments_slug_key ON public.departments(slug);

ALTER TABLE public.doctors
  ADD COLUMN slug text,
  ADD COLUMN education jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN certifications text[] NOT NULL DEFAULT '{}';
UPDATE public.doctors SET slug = public.tr_slugify(full_name);
CREATE UNIQUE INDEX doctors_slug_key ON public.doctors(slug);

CREATE OR REPLACE FUNCTION public.set_slug() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE base text; src text; candidate text; n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN NEW.slug := public.tr_slugify(NEW.slug); RETURN NEW; END IF;
  src := CASE WHEN TG_TABLE_NAME = 'doctors' THEN NEW.full_name ELSE NEW.name END;
  base := public.tr_slugify(src); candidate := base;
  LOOP
    EXECUTE format('SELECT 1 FROM public.%I WHERE slug = $1 AND id <> $2', TG_TABLE_NAME) USING candidate, NEW.id;
    EXIT WHEN NOT FOUND;
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate; RETURN NEW;
END $$;
CREATE TRIGGER departments_slug BEFORE INSERT OR UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_slug();
CREATE TRIGGER doctors_slug BEFORE INSERT OR UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.set_slug();

CREATE TABLE public.department_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.department_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_faqs TO authenticated;
GRANT ALL ON public.department_faqs TO service_role;
ALTER TABLE public.department_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read faqs" ON public.department_faqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "staff manage faqs" ON public.department_faqs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "public read media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "staff upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()));
CREATE POLICY "staff update media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_staff(auth.uid()));
CREATE POLICY "staff delete media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_staff(auth.uid()));