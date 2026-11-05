
create type public.app_role as enum ('admin','reception');
create type public.appointment_status as enum ('pending','confirmed','arrived','completed','cancelled','no_show');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id)
$$;

create policy "own roles visible" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- first user becomes admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text not null default 'stethoscope',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.departments to anon, authenticated;
grant insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;
alter table public.departments enable row level security;
create policy "public read departments" on public.departments for select to anon, authenticated using (true);
create policy "staff manage departments" on public.departments for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  full_name text not null,
  title text not null default 'Uzm. Dr.',
  specialty text,
  bio text,
  photo_url text,
  slot_minutes int not null default 20,
  working_hours jsonb not null default '{"1":["09:00","17:00"],"2":["09:00","17:00"],"3":["09:00","17:00"],"4":["09:00","17:00"],"5":["09:00","17:00"]}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.doctors to anon, authenticated;
grant insert, update, delete on public.doctors to authenticated;
grant all on public.doctors to service_role;
alter table public.doctors enable row level security;
create policy "public read active doctors" on public.doctors for select to anon using (active);
create policy "auth read doctors" on public.doctors for select to authenticated using (active or public.is_staff(auth.uid()));
create policy "staff manage doctors" on public.doctors for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.assistants (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.assistants to authenticated;
grant all on public.assistants to service_role;
alter table public.assistants enable row level security;
create policy "staff manage assistants" on public.assistants for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  tc_no text unique,
  phone text not null,
  email text,
  birth_date date,
  gender text,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.patients to authenticated;
grant all on public.patients to service_role;
alter table public.patients enable row level security;
create policy "staff manage patients" on public.patients for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text),1,8)),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending',
  complaint text,
  source text not null default 'panel',
  created_at timestamptz not null default now()
);
create unique index appointments_no_double_booking on public.appointments(doctor_id, starts_at) where status <> 'cancelled';
create index appointments_starts_idx on public.appointments(starts_at);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "staff manage appointments" on public.appointments for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.visit_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  diagnosis text,
  notes text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.visit_notes to authenticated;
grant all on public.visit_notes to service_role;
alter table public.visit_notes enable row level security;
create policy "staff manage notes" on public.visit_notes for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.closed_days (
  day date primary key,
  reason text
);
grant select on public.closed_days to anon, authenticated;
grant insert, update, delete on public.closed_days to authenticated;
grant all on public.closed_days to service_role;
alter table public.closed_days enable row level security;
create policy "public read closed" on public.closed_days for select to anon, authenticated using (true);
create policy "staff manage closed" on public.closed_days for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- public helpers
create or replace function public.get_booked_slots(_doctor_id uuid, _from timestamptz, _to timestamptz)
returns setof timestamptz language sql stable security definer set search_path = public as $$
  select starts_at from public.appointments
  where doctor_id=_doctor_id and status <> 'cancelled' and starts_at >= _from and starts_at < _to
$$;
grant execute on function public.get_booked_slots(uuid, timestamptz, timestamptz) to anon, authenticated;

create or replace function public.book_appointment(
  _doctor_id uuid, _starts_at timestamptz, _full_name text, _tc_no text, _phone text, _email text, _complaint text)
returns text language plpgsql security definer set search_path = public as $$
declare d public.doctors; p_id uuid; c text;
begin
  select * into d from public.doctors where id=_doctor_id and active;
  if d.id is null then raise exception 'Doktor bulunamadı'; end if;
  if _starts_at < now() then raise exception 'Geçmiş bir saat seçilemez'; end if;
  if exists(select 1 from public.closed_days where day = (_starts_at at time zone 'Europe/Istanbul')::date) then
    raise exception 'Seçilen gün hastane kapalı'; end if;
  if length(coalesce(_full_name,'')) < 3 or length(coalesce(_phone,'')) < 10 then raise exception 'Eksik bilgi'; end if;
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
grant execute on function public.book_appointment(uuid, timestamptz, text, text, text, text, text) to anon, authenticated;

create or replace function public.lookup_appointment(_code text, _phone text)
returns table(code text, starts_at timestamptz, status public.appointment_status, doctor_name text, department_name text, patient_name text)
language sql stable security definer set search_path = public as $$
  select a.code, a.starts_at, a.status, d.title || ' ' || d.full_name, dp.name, p.full_name
  from public.appointments a join public.patients p on p.id=a.patient_id
  join public.doctors d on d.id=a.doctor_id join public.departments dp on dp.id=d.department_id
  where a.code = upper(_code) and right(regexp_replace(p.phone,'\D','','g'),10) = right(regexp_replace(_phone,'\D','','g'),10)
$$;
grant execute on function public.lookup_appointment(text, text) to anon, authenticated;

create or replace function public.cancel_appointment_public(_code text, _phone text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.appointments a set status='cancelled'
  from public.patients p
  where p.id=a.patient_id and a.code=upper(_code) and a.status in ('pending','confirmed') and a.starts_at > now()
    and right(regexp_replace(p.phone,'\D','','g'),10) = right(regexp_replace(_phone,'\D','','g'),10);
  get diagnostics n = row_count;
  return n > 0;
end $$;
grant execute on function public.cancel_appointment_public(text, text) to anon, authenticated;

-- seed
insert into public.departments(name, description, icon, sort_order) values
('Kardiyoloji','Kalp ve damar hastalıkları tanı ve tedavisi','heart-pulse',1),
('Nöroloji','Beyin, omurilik ve sinir sistemi hastalıkları','brain',2),
('Ortopedi ve Travmatoloji','Kemik, eklem ve kas sistemi','bone',3),
('Dahiliye','İç hastalıkları ve genel sağlık kontrolü','stethoscope',4),
('Kadın Hastalıkları ve Doğum','Kadın sağlığı, gebelik takibi ve doğum','baby',5),
('Çocuk Sağlığı ve Hastalıkları','Yenidoğandan ergenliğe çocuk sağlığı','smile',6),
('Göz Hastalıkları','Görme bozuklukları ve göz cerrahisi','eye',7),
('Kulak Burun Boğaz','KBB hastalıkları ve cerrahisi','ear',8),
('Dermatoloji','Cilt, saç ve tırnak hastalıkları','scan-face',9),
('Genel Cerrahi','Genel cerrahi girişimler ve takibi','scissors',10);

insert into public.doctors(department_id, full_name, title, specialty)
select d.id, x.name, x.title, x.spec from (values
 (1,'Ahmet Yılmaz','Prof. Dr.','Girişimsel Kardiyoloji'),(1,'Elif Demir','Uzm. Dr.','Ekokardiyografi'),(1,'Murat Kaya','Doç. Dr.','Ritim Bozuklukları'),
 (2,'Zeynep Arslan','Prof. Dr.','Epilepsi'),(2,'Can Öztürk','Uzm. Dr.','Baş Ağrısı'),
 (3,'Burak Şahin','Doç. Dr.','Spor Yaralanmaları'),(3,'Selin Koç','Uzm. Dr.','Omurga Cerrahisi'),(3,'Emre Aydın','Op. Dr.','Protez Cerrahisi'),
 (4,'Ayşe Çelik','Uzm. Dr.','Diyabet'),(4,'Mehmet Yıldız','Uzm. Dr.','Hipertansiyon'),(4,'Deniz Polat','Doç. Dr.','Gastroenteroloji'),
 (5,'Gizem Erdoğan','Op. Dr.','Yüksek Riskli Gebelik'),(5,'Seda Kurt','Op. Dr.','Tüp Bebek'),
 (6,'Oğuz Aksoy','Uzm. Dr.','Çocuk Alerjisi'),(6,'Merve Doğan','Uzm. Dr.','Yenidoğan'),(6,'Kerem Uçar','Doç. Dr.','Çocuk Kardiyolojisi'),
 (7,'Hakan Taş','Op. Dr.','Katarakt'),(7,'Ebru Güneş','Op. Dr.','Retina'),
 (8,'Serkan Bulut','Op. Dr.','Rinoloji'),(8,'Pınar Acar','Op. Dr.','Odyoloji'),
 (9,'Cem Özkan','Uzm. Dr.','Estetik Dermatoloji'),(9,'Nazlı Kılıç','Uzm. Dr.','Akne ve Egzama'),
 (10,'Tolga Er','Prof. Dr.','Laparoskopik Cerrahi'),(10,'İrem Yavuz','Op. Dr.','Meme Cerrahisi'),(10,'Barış Tekin','Op. Dr.','Obezite Cerrahisi')
) as x(o,name,title,spec) join public.departments d on d.sort_order=x.o;

insert into public.assistants(doctor_id, full_name, phone)
select id, 'Asst. ' || split_part(full_name,' ',1) || ' Ekibi', '0212 555 00 ' || lpad((row_number() over())::text,2,'0')
from public.doctors where title in ('Prof. Dr.','Doç. Dr.');

insert into public.patients(full_name, tc_no, phone, email) values
('Ali Veli','10000000146','05321112233','ali@example.com'),
('Fatma Öz','10000000254','05332223344',null),
('Hasan Kara','10000000362','05443334455',null),
('Esra Yurt','10000000470','05554445566','esra@example.com'),
('Okan Sarı','10000000588','05065556677',null),
('Buse Ateş','10000000696','05376667788',null),
('Kemal Er','10000000704','05427778899',null),
('Derya Can','10000000812','05308889900',null);

-- sample appointments over past 10 and next 7 days
insert into public.appointments(patient_id, doctor_id, starts_at, ends_at, status, complaint, source)
select p.id, d.id, ts, ts + interval '20 minutes',
  case when ts < now() then (array['completed','completed','completed','no_show','cancelled'])[1 + (abs(hashtext(p.id::text||ts::text)) % 5)]::public.appointment_status
       else (array['pending','confirmed'])[1 + (abs(hashtext(d.id::text||ts::text)) % 2)]::public.appointment_status end,
  (array['Kontrol','Ağrı şikayeti','Rutin muayene','Tahlil sonucu','Baş dönmesi'])[1 + (abs(hashtext(ts::text)) % 5)],
  (array['online','panel'])[1 + (abs(hashtext(p.id::text)) % 2)]
from generate_series(-10, 7) g(dayoff)
cross join lateral (select (date_trunc('day', now() at time zone 'Europe/Istanbul') + make_interval(days => g.dayoff) + make_interval(hours => 9 + (abs(hashtext(g.dayoff::text||k::text)) % 8))) at time zone 'Europe/Istanbul' as ts, k from generate_series(1,6) k) t
cross join lateral (select id from public.patients order by md5(id::text || t.k::text || g.dayoff::text) limit 1) p
cross join lateral (select id from public.doctors order by md5(id::text || t.k::text || g.dayoff::text) limit 1) d
where extract(isodow from t.ts at time zone 'Europe/Istanbul') < 6
on conflict do nothing;

insert into public.visit_notes(appointment_id, patient_id, doctor_id, diagnosis, notes)
select id, patient_id, doctor_id, 'Genel değerlendirme', 'Muayene yapıldı, kontrol önerildi.' from public.appointments where status='completed' limit 15;
