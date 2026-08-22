create table if not exists public.session_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    course_id text not null references public.courses(id) on delete cascade,
    request_type text not null check (request_type in ('create_session', 'next_session')),
    full_name text not null,
    email text not null,
    phone text not null,
    availability text not null,
    message text,
    status text not null default 'pending' check (status in ('pending', 'processed', 'rejected')),
    processed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists session_requests_status_idx on public.session_requests(status);
create index if not exists session_requests_course_id_idx on public.session_requests(course_id);
create index if not exists session_requests_created_at_idx on public.session_requests(created_at desc);
create unique index if not exists session_requests_one_pending_idx on public.session_requests(user_id, course_id) where status = 'pending';

alter table public.session_requests enable row level security;

drop policy if exists "Students can create session requests" on public.session_requests;
create policy "Students can create session requests" on public.session_requests for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Students can view own session requests" on public.session_requests;
create policy "Students can view own session requests" on public.session_requests for select to authenticated using (auth.uid() = user_id);

grant insert, select on public.session_requests to authenticated;
