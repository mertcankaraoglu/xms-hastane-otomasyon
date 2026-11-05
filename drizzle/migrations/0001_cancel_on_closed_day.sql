alter table public.appointments add column if not exists cancel_reason text;

create or replace function public.cancel_appointments_on_closed_day()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.appointments
  set status = 'cancelled',
      cancel_reason = 'Hastane kapalı' || coalesce(' (' || new.reason || ')', '')
  where status in ('pending','confirmed')
    and (starts_at at time zone 'Europe/Istanbul')::date = new.day;
  return new;
end $$;

create trigger closed_day_cancels_appointments
after insert or update on public.closed_days
for each row execute function public.cancel_appointments_on_closed_day();