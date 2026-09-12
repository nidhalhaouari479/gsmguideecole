create table if not exists public.sms_notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    phone text not null,
    event_type text not null,
    event_key text not null,
    message text not null,
    status text not null check (status in ('sent', 'failed')),
    provider_code text,
    provider_reference text,
    error_message text,
    metadata jsonb not null default '{}'::jsonb,
    sent_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists sms_notifications_user_id_idx on public.sms_notifications(user_id);
create index if not exists sms_notifications_event_type_idx on public.sms_notifications(event_type);
create index if not exists sms_notifications_created_at_idx on public.sms_notifications(created_at desc);
create unique index if not exists sms_notifications_sent_event_key_idx
    on public.sms_notifications(event_key) where status = 'sent';

alter table public.sms_notifications enable row level security;
revoke all on public.sms_notifications from anon, authenticated;
