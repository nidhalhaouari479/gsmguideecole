-- Exécutez ce script dans Supabase > SQL Editor.
-- Il ajoute une remarque administrative générale à chaque étudiant.

alter table public.profiles
    add column if not exists admin_note text,
    add column if not exists admin_note_updated_at timestamptz,
    add column if not exists admin_note_updated_by uuid references auth.users(id) on delete set null;

comment on column public.profiles.admin_note
    is 'Remarque interne générale concernant l’étudiant.';

comment on column public.profiles.admin_note_updated_at
    is 'Date de dernière modification de la remarque étudiant.';

comment on column public.profiles.admin_note_updated_by
    is 'Administrateur ayant modifié la remarque étudiant.';
