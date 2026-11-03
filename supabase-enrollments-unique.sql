-- Un étudiant ne peut être inscrit qu'une seule fois à une même session.
-- À exécuter dans l'éditeur SQL de Supabase.

-- 1. Fusionner les doublons existants : on garde une seule ligne par (user_id, session_id)
--    (celle qui a le plus de paiement, sinon la plus ancienne) et on y reporte le total payé.
with ranked as (
    select
        id,
        user_id,
        session_id,
        row_number() over (
            partition by user_id, session_id
            order by coalesce(amount_paid, 0) desc, (receipt_url is not null) desc, created_at asc
        ) as rn
    from public.enrollments
),
dupes as (
    select r.id, k.id as keep_id
    from ranked r
    join ranked k on k.user_id = r.user_id and k.session_id = r.session_id and k.rn = 1
    where r.rn > 1
),
paid_dupes as (
    select keep_id, sum(coalesce(e.amount_paid, 0)) as extra
    from dupes d
    join public.enrollments e on e.id = d.id
    group by keep_id
),
merged as (
    update public.enrollments e
    set amount_paid = coalesce(e.amount_paid, 0) + p.extra
    from paid_dupes p
    where e.id = p.keep_id and p.extra > 0
    returning e.id
)
delete from public.enrollments e
using dupes d
where e.id = d.id;

-- 2. Empêcher tout nouveau doublon (même en cas de double clic / requêtes simultanées).
create unique index if not exists enrollments_user_session_unique
    on public.enrollments (user_id, session_id);
