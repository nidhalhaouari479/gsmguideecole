# Automatisations SMS WinSMS

## Objectif

L'application utilise WinSMS pour informer automatiquement les étudiants après une action importante. Les SMS sont envoyés côté serveur avec le Sender ID configuré, sans exposer la clé API au navigateur.

## Configuration

Variables requises dans `.env.local` et dans l'hébergeur :

```env
WINSMS_API_KEY=votre_cle_api
WINSMS_SENDER_ID=Gsm Guide
ADMIN_PHONE_NUMBER=+21600000000
CRON_SECRET=une_longue_valeur_aleatoire
```

Après une modification des variables, redémarrer le serveur. En production, ajouter les mêmes variables au projet Vercel puis redéployer.

Exécuter une fois `supabase-sms-notifications.sql` dans Supabase SQL Editor. La table créée conserve le destinataire, le type d'événement, le message, la référence WinSMS, le résultat et l'erreur éventuelle. Une clé unique empêche le même événement réussi d'être envoyé deux fois.

## Actions SMS installées

| Événement | Déclencheur | Destinataire | Contenu principal |
|---|---|---|---|
| `student_registered` | Inscription terminée sur le site | Nouvel étudiant | Bienvenue et confirmation du compte |
| `student_account_created` | Compte créé manuellement par le staff | Nouvel étudiant | Bienvenue et identifiant email |
| `account_blocked` | Compte bloqué | Étudiant | Blocage et invitation à contacter l'administration |
| `account_unblocked` | Compte débloqué | Étudiant | Accès rétabli |
| Suppression du compte | Suppression définitive | Étudiant | Information envoyée avant la suppression |
| `reservation_submitted` | Réservation sans justificatif | Étudiant | Demande reçue et en attente |
| `payment_submitted` | Réservation avec justificatif | Étudiant | Justificatif et montant reçus |
| `payment_installment_submitted` | Nouvelle tranche envoyée | Étudiant | Montant reçu et validation en cours |
| `reservation_approved` | Réservation acceptée | Étudiant | Place confirmée |
| `reservation_rejected` | Réservation refusée | Étudiant | Refus et contact administration |
| `payment_approved` | Paiement accepté | Étudiant | Total payé et montant restant |
| `payment_rejected` | Paiement refusé | Étudiant | Refus du justificatif |
| `payment_added` | Paiement ajouté manuellement | Étudiant | Nouveau paiement, total payé et reste |
| `payment_completed` | Le reste devient égal à zéro | Étudiant | Formation entièrement payée |
| `enrollment_created` | Ajout manuel à une session | Étudiant | Formation, date de début et montant |
| `enrollment_removed` | Retrait d'une session sans paiement | Étudiant | Annulation de l'inscription |
| `session_request_processed` | Demande de session traitée | Étudiant demandeur | Confirmation du traitement |
| `session_request_rejected` | Demande de session refusée | Étudiant demandeur | Refus et contact administration |
| `requested_session_available` | Création d'une session correspondant à une demande | Tous les demandeurs | Nouvelle session disponible |
| `session_updated` | Modification du planning | Tous les inscrits validés | Nouveau planning et date |
| `session_cancelled` | Suppression d'une session | Tous les inscrits validés | Annulation avant suppression des données |
| `attendance_present` | Présence enregistrée | Étudiant | Statut présent |
| `attendance_absent` | Absence enregistrée | Étudiant | Statut absent |
| `attendance_late` | Retard enregistré | Étudiant | Statut en retard |
| `attendance_excused` | Absence excusée | Étudiant | Statut excusé |
| `session_reminder_24h` | Environ 24 h avant une séance | Tous les inscrits validés | Formation, heure et salle |
| SMS manuel | Bouton dans la fiche étudiant | Étudiant sélectionné | Texte libre de l'administrateur |

## Rappel automatique

`vercel.json` appelle `/api/cron/sms-reminders` toutes les heures. La route sélectionne les séances commençant dans 23 à 25 heures. Vercel transmet `Authorization: Bearer CRON_SECRET`. Sans `CRON_SECRET`, la route refuse l'appel.

Pour tester manuellement sans envoyer de données dans l'URL :

```bash
curl -H "Authorization: Bearer VOTRE_CRON_SECRET" http://localhost:3000/api/cron/sms-reminders
```

Attention : cet appel peut réellement envoyer les rappels éligibles. L'anti-doublon empêche un second envoi après une réussite enregistrée.

## Règles techniques

- Le numéro tunisien à 8 chiffres reçoit automatiquement le préfixe `216`.
- Les caractères non numériques, `+` et le préfixe `00` sont retirés.
- Chaque message est compacté et limité à 157 caractères conformément à la documentation WinSMS fournie.
- Les SMS automatiques sont déclenchés uniquement après la réussite de l'écriture métier, sauf l'annulation d'une session et la suppression d'un compte, envoyées avant la suppression pour conserver les destinataires.
- Une panne WinSMS ne fait pas échouer un paiement, une inscription ou une modification de séance.
- Les erreurs sont enregistrées avec le statut `failed`; une nouvelle tentative reste possible.
- Les envois de groupe sont réalisés individuellement afin de conserver un journal et une protection anti-doublon par étudiant.

## Fichiers concernés

- `src/lib/winsms.ts` : client WinSMS, normalisation, journalisation et envois collectifs.
- `src/app/api/admin/sms/route.ts` : SMS manuel sécurisé.
- `src/app/api/admin/payments/actions/route.ts` : acceptation ou refus.
- `src/app/api/admin/payments/route.ts` : paiement manuel et solde restant.
- `src/app/api/enrollments/reserve/route.ts` et `tranche/route.ts` : réception des demandes.
- `src/app/api/admin/enrollments/route.ts` : ajout ou retrait d'une session.
- `src/app/api/admin/sessions/route.ts` : création, modification et annulation.
- `src/app/api/session-requests/route.ts` : traitement des demandes.
- `src/app/api/admin/presence/route.ts` : statuts de présence.
- `src/app/api/admin/students/route.ts`, `auth/profile/route.ts` et `admin/actions/route.ts` : cycle de vie du compte.
- `src/app/api/cron/sms-reminders/route.ts` : rappels automatiques.

## Exploitation et coûts

Les événements de présence peuvent consommer beaucoup de crédits, car chaque sauvegarde d'un nouveau statut déclenche un SMS. Pour réduire les coûts, désactiver en priorité `attendance_present` et conserver seulement les absences et retards. Avant un envoi collectif, vérifier le solde WinSMS et tester avec quelques numéros.

Les étudiants doivent avoir fourni un numéro valide et avoir accepté de recevoir des communications opérationnelles. Ne pas utiliser ces automatisations pour des campagnes marketing sans consentement approprié.
