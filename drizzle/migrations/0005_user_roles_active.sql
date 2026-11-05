ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role and (active or role='superadmin'))
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  select exists(select 1 from public.user_roles where user_id=_user_id and (active or role='superadmin'))
$$;