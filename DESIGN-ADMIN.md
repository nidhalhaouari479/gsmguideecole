# Design system de l’espace admin — GSM Guide Academy

3 novembre 2026

## Principes

L’espace admin est un outil de travail quotidien : il doit être calme, dense et rapide à lire, pas spectaculaire. Ce document décrit le système tel qu’il est codé dans GSM Guide Academy (Next.js 16, React 19, Tailwind CSS v4, framer-motion, lucide-react) pour le reproduire à l’identique dans un autre projet.

1. **Trois plans de surface.** Le fond de l’application (`shell`, gris bleuté), un panneau de contenu flottant (`canvas`, presque blanc) et les cartes blanches posées dessus. La profondeur vient de ces trois tons et d’ombres très légères, jamais de bordures épaisses.
2. **La couleur porte un sens.** Le bleu de marque sert aux actions principales et à l’élément actif. Vert = payé / validé, rouge (rose) = dû / danger, ambre = en attente / remise. Tout le reste est en gris ardoise.
3. **Une seule action primaire par zone.** Un bouton bleu par en-tête de page ou par modale ; les autres actions sont secondaires (blanches) ou fantômes.
4. **Les données ne bougent pas.** Pas d’effet de soulèvement au survol sur les écrans de données ; seuls les boutons réagissent (légère réduction à 97 % au clic).
5. **Chiffres alignés.** Tous les montants et dates utilisent `tabular-nums` et le format `fr-FR` (« 1 200 DT »).
6. **Aucune boîte native du navigateur.** `alert`, `confirm` et `prompt` sont remplacés par des toasts et des boîtes de dialogue codées (section Retours utilisateur).
7. **Mobile = application.** Sous 768 px, les modales deviennent des feuilles qui montent du bas et la barre latérale devient un tiroir.

## Fondations

Tous les tokens sont déclarés dans le bloc `@theme` de `globals.css` (Tailwind v4) : ils deviennent automatiquement des classes (`bg-brand-blue`, `bg-shell`, `shadow-[var(--shadow-card)]`…). Pour changer de marque, seules les quatre couleurs `brand-*` changent.

### Couleurs

| Token | Valeur | Usage |
| --- | --- | --- |
| `--color-brand-blue` | #2572B0 | Bouton primaire, élément actif, barre de progression, liens |
| `--color-brand-blue-dark` | #1D5E93 | Survol des surfaces bleues |
| `--color-brand-soft` | #EEF5FB | Fonds légers de marque (tuile d’icône, compteur d’onglet actif) |
| `--color-brand-green` | #A1B83E | Accent secondaire (halo de la carte HeroStat) |
| `--color-shell` | #F0F2F6 | Fond de l’application et de la barre latérale |
| `--color-canvas` | #FBFCFD | Panneau de contenu flottant et barre du haut |
| `white` | #FFFFFF | Cartes, modales, champs |
| `--color-navy-950` | #0B1626 | Fond de la carte HeroStat (un seul KPI mis en avant par écran) |
| `--color-focus` | #475569 | Anneau de focus clavier, volontairement neutre |

Couleurs d’état (palette Tailwind standard) : succès `emerald-50 / 500 / 700`, danger `rose-50 / 500 / 600 / 700`, attente `amber-50 / 500 / 800`, info `sky-50 / 500 / 700`. Texte : titres `slate-900`, texte courant `slate-700`, texte secondaire `slate-500`, désactivé `slate-400`. Bordures : `slate-200` (ou `slate-200/80` sur les cartes).

### Ombres et rayons

| Token | Valeur | Usage |
| --- | --- | --- |
| `--shadow-card` | 0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.05) | Cartes, boutons secondaires, champs |
| `--shadow-lift` | 0 10px 24px -10px rgba(15,23,42,.16), 0 2px 6px -2px rgba(15,23,42,.06) | Survol d’une carte cliquable |
| `--shadow-pop` | 0 24px 48px -12px rgba(15,23,42,.22), 0 8px 16px -8px rgba(15,23,42,.08) | Modales, menus, palette de recherche |
| `--shadow-brand` | 0 1px 2px rgba(29,94,147,.25), 0 4px 12px -4px rgba(37,114,176,.45) | Bouton primaire |

Rayons : `rounded-lg` (8 px) pour boutons et petits blocs, `rounded-[10px]` pour champs et recherche, `rounded-xl` (12 px) pour tuiles d’icône et onglets, `rounded-2xl` (16 px) pour cartes, modales et panneau de contenu, `rounded-full` pour badges et avatars.

### Typographie

Police : Inter (via `next/font`), avec `font-feature-settings: "cv11", "ss01"` et lissage antialiased. Le conteneur `.admin-dashboard` fixe la base à 13,5 px, interligne 1,5.

| Rôle | Taille | Graisse | Détail |
| --- | --- | --- | --- |
| Titre de page (h1) | 22 px, 26 px dès `sm` | 600 | letter-spacing -0,02em |
| Titre de carte ou de modale | 15 px | 600 | tracking-tight |
| Grand chiffre (StatCard) | 24 px | 600 | tabular-nums, leading-none |
| Grand chiffre (HeroStat) | 34 px | 600 | blanc sur navy |
| Texte courant | 13,5 px | 400 | `text-sm` est forcé à 13,5 px dans l’admin |
| Cellule de tableau | 13 px | 400 | |
| En-tête de tableau | 11,5 px | 600 | majuscules, tracking 0,02em |
| Libellé de champ | 12,5 px | 500 | |
| Petit texte, badge | 12 à 12,5 px | 500 | |

Aucune taille sous 12 px n’est permise dans l’admin : les classes `text-[8px]` à `text-[10px]` sont remontées à 12 px, et `font-black` / `font-extrabold` ramenés à 700.

### Espacements

Grille de 4 px (échelle Tailwind). Repères : padding de carte 20 px (`p-5`), padding de modale 20 px horizontal, gouttière de page 12 px mobile / 20 px tablette / 32 px desktop (`px-3 sm:px-5 lg:px-8`), écart entre boutons 8 px (`gap-2`).

## Structure de page

L’écran est un shell fixe à la taille de la fenêtre : seule la zone de contenu défile, la barre latérale et la barre du haut ne bougent jamais.

```
┌─ shell (#F0F2F6) ─────────────────────────────────────────────────────────┐
│ GSM Guide Academy      ┌─ panneau canvas (#FBFCFD), rounded-2xl ─────────┐ │
│ ┌──────────────────┐   │ Bonjour, Administrateur        (cloche) (compte)│ │
│ │ Rechercher… Ctrl K│  │ Date du jour                                    │ │
│ └──────────────────┘   ├─────────────────────────────────────────────────┤ │
│ GÉNÉRAL                │ Administration › Sessions                       │ │
│ ┃ Tableau de bord ┃    │ PageHeader : titre de page    [Action primaire] │ │
│   Étudiants            │ ┌─StatCard─┐ ┌─StatCard─┐ ┌─StatCard─┐          │ │
│ FORMATIONS             │ └──────────┘ └──────────┘ └──────────┘          │ │
│   Sessions             │ ┌─ Card ────────────────────────────────────┐   │ │
│   Finances             │ │ [SearchInput]  [FilterTabs]               │   │ │
│                        │ │ EN-TÊTE DE TABLEAU (COLLANT)              │   │ │
│                        │ │ Ligne du tableau                          │   │ │
│ ┌──────────────────┐   │ │ Ligne du tableau                          │   │ │
│ │Profil · Réduire  │   │ └───────────────────────────────────────────┘   │ │
│ └──────────────────┘   └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
  Fixe : barre latérale 264 px (72 px repliée), barre du haut 64 px
  Défile : uniquement la zone main (sous la barre du haut)
```

Le fond gris (`shell`) porte la barre latérale ; le panneau arrondi (`canvas`) porte la barre du haut et la zone `main`, la seule qui défile.

```tsx
<div className="admin-dashboard fixed inset-0 flex overflow-hidden bg-shell text-slate-900">
  <aside className="hidden h-full w-[264px] shrink-0 flex-col bg-shell md:flex">{/* sidebar */}</aside>
  <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas md:rounded-2xl md:border md:border-slate-200/70 md:shadow-[var(--shadow-card)]">
      <header className="shrink-0 border-b border-slate-200/70 bg-canvas/85 backdrop-blur-xl">{/* h-16 */}</header>
      <main className="flex-1 overflow-y-auto px-3 pt-5 pb-8 sm:px-5 lg:px-8 lg:pt-6">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  </div>
</div>
```

### Barre latérale

- Largeur 264 px dépliée, 72 px repliée (icônes seules, nom en infobulle). L’état est mémorisé dans `localStorage` (clé `gsm:sidebar-collapsed`).
- De haut en bas : logo (hauteur 64 px), bouton de recherche avec raccourci `Ctrl` + `K`, navigation groupée, carte profil, bouton « Réduire le menu ».
- Groupes de navigation avec un petit titre : Général, Personnes, Formations, Gestion.
- Lien : hauteur 36 px, `rounded-lg`, texte 13,5 px, icône lucide 18 px. Inactif = `text-slate-600`, icône `slate-400`, survol `bg-white/70`. Actif = fond blanc, `shadow-card`, `ring-1 ring-slate-200/70`, texte `slate-900` en 600, icône bleu de marque (trait 2,2), plus une barre verticale verte de 3 × 20 px collée au bord gauche.
- Le lien actif porte `aria-current="page"`.

### Barre du haut

- Hauteur 64 px, fond `canvas` à 85 % avec flou (`backdrop-blur-xl`), bordure basse `slate-200/70`.
- À gauche : salutation (« Bonjour, Administrateur », 15 px 600) et date du jour en dessous (12 px, `slate-500`). Sur mobile : bouton menu + nom de la section.
- À droite : cloche de notifications (bouton 44 px, icône 24 px, pastille rouge 20 px avec le nombre, « 9+ » au-delà), puis le menu du compte.

### Contenu

- Fil d’Ariane discret (12 px, `slate-500`, chevron `slate-300`) au-dessus du titre, masqué sur mobile.
- Chaque changement de page entre en fondu avec un décalage de 4 px (0,2 s).
- Une page commence toujours par `PageHeader` (titre, description, actions à droite), puis une rangée de `StatCard`, puis une `Card` qui contient la barre d’outils (recherche + filtres + vue) et le tableau ou la grille.

## Composants

Tous les composants vivent dans un seul fichier, `src/components/admin/ui.tsx`. Une page admin n’écrit presque jamais de classes de style à la main : elle assemble ces briques.

| Composant | Rôle | Props principales |
| --- | --- | --- |
| `PageHeader` | Titre de page + actions | `title`, `description`, `actions`, `eyebrow` |
| `Card` / `CardHeader` | Conteneur blanc, `rounded-2xl`, padding 20 px | `padded`, `title`, `description`, `actions` |
| `StatCard` | Indicateur chiffré avec tuile d’icône 36 px | `label`, `value`, `hint`, `icon`, `tone`, `onClick`, `active` |
| `HeroStat` | Le KPI vedette, fond navy avec halos bleu et vert | `label`, `value`, `hint`, `icon`, `footer` |
| `Badge` / `StatusBadge` | Pastille d’état avec point de couleur | `tone`, `dot` ; `status` (approved, pending, rejected) |
| `ProgressBar` | Barre de 6 px, bleue puis verte quand complète | `value`, `max`, `label` |
| `Button` / `buttonClass()` | Bouton ou classes de bouton | `variant`, `size`, `icon`, `loading` |
| `IconButton` | Bouton carré 36 px avec icône seule | `label` (obligatoire), `icon`, `variant` |
| `SearchInput` | Champ de recherche avec loupe | `value`, `onChange`, `placeholder`, `label` |
| `FilterTabs` | Onglets segmentés avec compteurs | `options`, `value`, `onChange` |
| `Toolbar` | Ligne recherche + filtres au-dessus d’un tableau | `children` |
| `table` | Objet de classes pour `<table>` | `table.table`, `thead`, `th`, `tbody`, `tr`, `td` |
| `Field` + `inputClass` / `selectClass` / `textareaClass` | Champ de formulaire avec libellé, aide, erreur | `label`, `htmlFor`, `hint`, `error`, `required` |
| `Modal` | Boîte de dialogue, feuille du bas sur mobile | `open`, `onClose`, `title`, `description`, `footer`, `size` |
| `EmptyState` / `LoadingState` / `Skeleton` | États vide et chargement | `icon`, `title`, `description`, `action` |
| `formatDT()` | Format monétaire « 1 200 DT » | `value` |

### Boutons

Base commune : `rounded-lg`, police 600, transition 150 ms, `active:scale-[0.97]`, désactivé à 50 % d’opacité, anneau de focus `ring-2 ring-focus/50`.

| Variante | Apparence | Quand l’utiliser |
| --- | --- | --- |
| `primary` | Dégradé bleu #2D7FC2 → #2572B0, texte blanc, `shadow-brand` | L’action principale de la zone, une seule |
| `secondary` | Blanc, bordure `slate-200`, `shadow-card` | Actions courantes (Annuler, Modifier, Remise) |
| `ghost` | Transparent, survol `slate-100` | Icônes de barre d’outils, fermer |
| `danger` | Blanc, texte et bordure rose | Supprimer, retirer |
| `success` | Vert `emerald-600`, texte blanc | Valider un paiement |

Tailles : `sm` = 32 px de haut, texte 13 px ; `md` = 36 px, texte 13,5 px. Les boutons d’action importants d’une ligne de tableau passent à 40 × 40 px avec une icône de 20 px pour rester faciles à viser.

```tsx
<Button variant="primary" icon={Plus}>Nouvelle session</Button>
<Button loading={saving}>Enregistrer</Button>
<IconButton icon={Trash2} label="Supprimer" variant="danger" />
```

### Cartes de statistiques

`StatCard` : carte blanche, libellé 13 px `slate-500` en haut à gauche, tuile d’icône 36 px en haut à droite, valeur 24 px en dessous. Le `tone` colore la valeur et la tuile : `success` vert, `danger` rose, `warning` ambre, `info` bleu ciel, `neutral` (tuile bleu de marque). Cliquable, elle se soulève de 2 px et l’état `active` ajoute un anneau bleu : c’est le seul cas où une carte bouge.

### Badges

Pilule `rounded-full`, padding 10 × 2 px, texte 12 px 500, anneau intérieur d’une teinte plus foncée, point de 6 px devant le texte. Exemple : `bg-emerald-50 text-emerald-700 ring-emerald-200` + point `bg-emerald-500` pour « Validé ».

### Tableaux

- `thead` collant (`sticky top-0`) sur fond `slate-50/95` flouté.
- En-têtes 11,5 px, majuscules, 600, `slate-500`, séparation `border-slate-200/80`.
- Cellules 13 px, padding 16 × 12 px, 20 px sur la première et la dernière colonne.
- Lignes séparées par `divide-slate-100`, survol `bg-slate-50/80`.
- Sous 768 px, le tableau est masqué et remplacé par une liste de cartes empilées (`md:hidden` / `hidden md:table`).
- Une cellule de paiement montre « payé / total », une `ProgressBar` et « Reste : X DT » en rose ou « Soldé » en vert.

### Formulaires

Champs : hauteur 38 px, `rounded-[10px]`, bordure `slate-300`, `shadow-card`, survol `slate-400`, focus `border-slate-500` + `ring-2 ring-focus/20`. Libellé 12,5 px 500 au-dessus, astérisque rouge si obligatoire, aide en 12 px `slate-500`, erreur en 12 px rose avec `role="alert"`. Les montants ont le suffixe « DT » posé à droite dans le champ.

### Recherche et filtres

`SearchInput` : 288 px de large dès `sm`, loupe 16 px à gauche. `FilterTabs` : conteneur `#EEF1F5` arrondi 12 px avec padding 4 px ; onglet actif blanc avec ombre et compteur sur fond `brand-soft`, onglets inactifs `slate-500`.

### Modales

Fond `slate-900/30` flouté de 3 px. Boîte blanche `rounded-2xl`, `shadow-pop`, hauteur max 90 % de l’écran. En-tête fixe (titre 15 px 600, description `slate-500`, bouton fermer), corps qui défile, pied fixe sur fond `slate-50/70` avec les boutons à droite (Annuler puis l’action primaire). Tailles : `sm` 448 px, `md` 512 px, `lg` 672 px, `xl` 896 px, `2xl` 1152 px. Entrée : fondu + 8 px + échelle 0,98 en 0,15 s. Fermeture par `Échap`, clic sur le fond ou le bouton.

### États vides et chargement

`EmptyState` : icône dans un rond `slate-100` de 40 px, titre 14 px 600, description `slate-500`, action optionnelle. `LoadingState` : cinq lignes squelettes (avatar rond + deux barres + pilule) qui pulsent, avec un texte caché pour les lecteurs d’écran. Jamais de grand spinner au centre de la page.

## Retours utilisateur

Le fichier `src/components/FeedbackHost.tsx` remplace `alert`, `confirm` et `prompt` du navigateur. On le monte une seule fois dans le layout racine (`<FeedbackHost />`), puis on appelle ses fonctions depuis n’importe quel composant client, sans contexte React ni hook.

| Fonction | Remplace | Affichage |
| --- | --- | --- |
| `notify.success(message, titre?)` | `alert` après une réussite | Toast bordure verte, icône coche, disparaît après 4,5 s |
| `notify.error(message, titre?)` | `alert` d’erreur | Toast bordure rose, `role="alert"`, disparaît après 7 s |
| `notify.info` / `notify.warning` | `alert` d’information | Toast gris ou ambre, 4,5 s |
| `await confirmDialog({...})` | `confirm` | Boîte centrée, renvoie `true` ou `false` |
| `await promptDialog({...})` | `prompt` | Boîte avec un champ, renvoie le texte ou `null` |

```tsx
import { confirmDialog, notify } from '@/components/FeedbackHost';

const ok = await confirmDialog({
  title: 'Retirer Ali de cette session ?',
  message: 'Son compte étudiant ne sera pas supprimé.',
  confirmLabel: 'Retirer de la session',
  tone: 'danger',
});
if (!ok) return;
// … appel API
notify.success('Étudiant retiré de la session.');
```

**Toasts.** En haut à droite (en haut et centrés sur mobile), 384 px de large au maximum, quatre au plus à l’écran, carte blanche `rounded-xl` avec ombre, icône 18 px de la couleur du ton, bouton de fermeture. Ils ne bloquent jamais l’écran.

**Boîtes de confirmation.** Fond `slate-900/40` flouté, boîte de 448 px, icône de 40 px dans un rond (triangle rose pour `danger`, « i » bleu sinon), titre 16 px 600, message 14 px `slate-600`. Pied gris clair : Annuler à gauche, bouton de confirmation plein à droite (rose pour `danger`, bleu sinon). Le bouton de confirmation reçoit le focus, `Entrée` confirme, `Échap` ou un clic sur le fond annule. Les demandes simultanées s’affichent l’une après l’autre.

**Règles d’écriture.**

- Le titre d’une confirmation est une question qui nomme l’objet : « Supprimer ce paiement ? », pas « Êtes-vous sûr ? ».
- Le bouton dit l’action exacte : « Retirer de la session », « Envoyer le SMS », jamais « OK ».
- Une erreur de validation apparaît en toast rouge et ne vide pas le formulaire.
- Chaque action réussie (créer, enregistrer, supprimer) confirme par un toast vert qui reprend le montant ou le nom concerné.

## Mobile et accessibilité

Le seuil unique est 768 px (`md`) : en dessous, l’admin se comporte comme une application mobile.

### Mobile (moins de 768 px)

- La barre latérale disparaît ; un bouton menu dans la barre du haut ouvre un tiroir à gauche (largeur min(85 vw, 288 px), animation ressort, fond flouté).
- Toutes les modales deviennent des feuilles qui montent du bas : pleine largeur, 92 % de la hauteur au maximum, coins supérieurs arrondis à 24 px. Cette règle est en CSS global dans `globals.css`, aucun composant n’a à la gérer.
- Les champs passent à 16 px de texte pour éviter le zoom automatique d’iOS.
- Les tableaux deviennent des listes de cartes ; les boutons d’une carte prennent toute la largeur.
- Les marges respectent les encoches avec `env(safe-area-inset-top)` et `env(safe-area-inset-bottom)`.
- Pas de surbrillance au toucher (`-webkit-tap-highlight-color: transparent`) ni de rebond vertical.

### Accessibilité

- **Focus visible partout** : `focus-visible:ring-2 ring-focus/50` (gris ardoise), jamais aux couleurs de la marque pour ne pas être confondu avec un état actif.
- **Icônes seules** : `IconButton` exige un `label`, utilisé comme `aria-label` et infobulle. Les icônes décoratives ont `aria-hidden`.
- **Lien d’évitement** « Aller au contenu » en premier élément, visible au focus clavier.
- **Rôles** : modales `role="dialog"` et `aria-modal`, confirmations `role="alertdialog"`, barre de progression `role="progressbar"` avec ses valeurs, chargement `role="status"`, toasts d’erreur `role="alert"`.
- **Navigation** : `aria-current="page"` sur le lien actif et dans le fil d’Ariane ; onglets de filtre avec `aria-pressed`.
- **Mouvement réduit** : avec `prefers-reduced-motion`, toutes les animations et transitions de l’admin tombent à 0,01 ms.
- **Contraste** : texte secondaire jamais plus clair que `slate-500` (#475569 après réglage) sur fond blanc ; aucune taille sous 12 px.
- **Cibles tactiles** : 36 px minimum, 40 à 44 px pour la cloche et les actions de ligne.

## Mise en place dans un nouveau projet

Le système tient en quatre fichiers à copier et trois dépendances ; compter environ une heure pour un projet Next.js neuf.

**Dépendances** (versions utilisées ici) : Next.js 16 et React 19, Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/postcss`), `framer-motion` 12, `lucide-react` 0.576.

```bash
npm install framer-motion lucide-react
npm install -D tailwindcss @tailwindcss/postcss
```

| Fichier à copier depuis GSM Guide Academy | Ce qu’il apporte |
| --- | --- |
| `src/app/globals.css` (bloc `@theme`, règles `.admin-dashboard`, règles mobiles, `custom-scrollbar`, `prefers-reduced-motion`) | Tokens, échelle typographique, feuilles du bas, barres de défilement |
| `src/components/admin/ui.tsx` | Tous les composants de la section Composants |
| `src/components/FeedbackHost.tsx` | Toasts et boîtes de confirmation |
| `src/app/admin/layout.tsx` | Shell fixe, barre latérale repliable, barre du haut, recherche `Ctrl` + `K`, notifications |

**Étapes**

1. Copier le bloc `@theme` dans le `globals.css` du nouveau projet, puis remplacer les quatre couleurs `brand-*` par celles de la nouvelle marque.
2. Copier les règles CSS qui commencent par `.admin-dashboard` (typographie, mobile, barre latérale, mouvement réduit) et les règles `custom-scrollbar`. Ne pas copier les règles du site public (`site-muted`, `premium-card` du site).
3. Charger Inter avec `next/font/google` sur le `<body>` du layout racine.
4. Copier `ui.tsx` et `FeedbackHost.tsx`, puis monter `<FeedbackHost />` une seule fois dans le layout racine.
5. Copier `admin/layout.tsx` et adapter : le tableau `allNavigation` (nom, lien, icône lucide, groupe), la liste `NAV_GROUPS`, le logo, la vérification de connexion et la source des notifications.
6. Construire chaque page sur le même modèle : `PageHeader` → rangée de `StatCard` → `Card` avec `Toolbar` et tableau → `Modal` pour les formulaires.
7. Remplacer toute utilisation de `alert`, `confirm` ou `prompt` par `notify`, `confirmDialog` ou `promptDialog`.

**Checklist avant livraison**

- [ ] Une seule action primaire bleue par en-tête et par modale
- [ ] Aucun texte sous 12 px, montants en `tabular-nums` et format fr-FR
- [ ] Les couleurs vert / rose / ambre ne servent qu’à des états
- [ ] Chaque bouton icône a un `label`
- [ ] Le tableau a une version cartes sous 768 px
- [ ] Les modales s’ouvrent en feuille du bas sur mobile
- [ ] Aucun `alert`, `confirm` ou `prompt` du navigateur ne reste dans le code
- [ ] La barre latérale reste fixe quand on fait défiler une longue page
