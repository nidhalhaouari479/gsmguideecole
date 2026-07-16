-- Montant minimal demandé lorsqu'un étudiant choisit de payer
-- au moment de réserver une formation.
alter table public.courses
add column if not exists reservation_amount numeric(10, 2);

-- Les formations déjà créées conservent l'ancienne avance de 400 DT.
update public.courses
set reservation_amount = 400
where reservation_amount is null;

alter table public.courses
alter column reservation_amount set default 400,
alter column reservation_amount set not null;

alter table public.courses
drop constraint if exists courses_reservation_amount_nonnegative;

alter table public.courses
add constraint courses_reservation_amount_nonnegative
check (reservation_amount >= 0);

comment on column public.courses.reservation_amount is
'Montant minimum à verser avec un justificatif lors de la réservation. Une réservation sans paiement reste possible.';
