-- Exécutez ce script dans Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.attendance_records (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    seance_key text not null,
    seance_date date not null,
    scheduled_start time not null,
    scheduled_end time,
    status text not null default 'present'
        check (status in ('present', 'absent', 'late', 'excused')),
    arrival_time time default '09:00',
    note text,
    recorded_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint attendance_one_record_per_student
        unique (session_id, seance_key, user_id)
);

create index if not exists attendance_records_session_idx
    on public.attendance_records(session_id);

create index if not exists attendance_records_user_idx
    on public.attendance_records(user_id);

create index if not exists attendance_records_date_idx
    on public.attendance_records(seance_date);

create or replace function public.set_attendance_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists attendance_records_updated_at on public.attendance_records;
create trigger attendance_records_updated_at
before update on public.attendance_records
for each row execute function public.set_attendance_updated_at();

alter table public.attendance_records enable row level security;

drop policy if exists "Admins can read attendance" on public.attendance_records;
create policy "Admins can read attendance"
on public.attendance_records
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "Admins can insert attendance" on public.attendance_records;
create policy "Admins can insert attendance"
on public.attendance_records
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "Admins can update attendance" on public.attendance_records;
create policy "Admins can update attendance"
on public.attendance_records
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "Admins can delete attendance" on public.attendance_records;
create policy "Admins can delete attendance"
on public.attendance_records
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);
