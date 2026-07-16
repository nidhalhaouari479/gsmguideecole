-- Exécutez ce script dans Supabase > SQL Editor.
-- Il ajoute une remarque administrative à chaque dossier Finance.

alter table public.enrollments
    add column if not exists finance_note text,
    add column if not exists finance_note_updated_at timestamptz,
    add column if not exists finance_note_updated_by uuid references auth.users(id) on delete set null;

comment on column public.enrollments.finance_note
    is 'Remarque interne ajoutée par un administrateur depuis Finance.';

comment on column public.enrollments.finance_note_updated_at
    is 'Date de dernière modification de la remarque Finance.';

comment on column public.enrollments.finance_note_updated_by
    is 'Administrateur ayant modifié la remarque Finance.';
