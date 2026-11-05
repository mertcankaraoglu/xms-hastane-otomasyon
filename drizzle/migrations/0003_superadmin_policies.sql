create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'superadmin') then
    insert into public.user_roles(user_id, role) values (new.id, 'superadmin');
  end if;
  return new;
end $$;

drop policy if exists "own roles visible" on public.user_roles;
create policy "own roles visible" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'superadmin'));

drop policy if exists "staff manage closed" on public.closed_days;
create policy "superadmin manage closed" on public.closed_days for all to authenticated
  using (public.has_role(auth.uid(), 'superadmin')) with check (public.has_role(auth.uid(), 'superadmin'));