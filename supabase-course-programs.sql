-- Programme propre à chaque formation : exactement quatre éléments ordonnés.
create table if not exists public.course_programs (
    id uuid primary key default gen_random_uuid(),
    course_id text not null references public.courses(id) on delete cascade,
    content text not null check (length(trim(content)) > 0),
    position smallint not null check (position between 1 and 4),
    created_at timestamptz not null default now(),
    unique (course_id, position)
);

create index if not exists course_programs_course_id_idx
on public.course_programs(course_id);

alter table public.course_programs enable row level security;

grant select on table public.course_programs to anon, authenticated;

drop policy if exists "Lecture publique des programmes" on public.course_programs;

create policy "Lecture publique des programmes"
on public.course_programs
for select
using (true);

-- Reprise des quatre anciennes valeurs pour les formations déjà présentes.
insert into public.course_programs (course_id, content, position)
select
    courses.id,
    defaults.content,
    defaults.position
from public.courses as courses
cross join (
    values
        (1, 'Diagnostic complet hardware iPhone & Android'),
        (2, 'Changement de vitre et écrans (tous modèles)'),
        (3, 'Soudure de connecteurs de charge et petits composants'),
        (4, 'Flashage, déblocage et restauration système')
) as defaults(position, content)
on conflict (course_id, position) do nothing;

comment on table public.course_programs is
'Les quatre éléments ordonnés du programme affiché sur la page de chaque formation.';
