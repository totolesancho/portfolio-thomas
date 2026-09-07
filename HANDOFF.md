# HANDOFF — Portfolio Thomas Etcheverry

> **Document de reprise complet.** Si tu changes de compte Claude, d'assistant IA, ou que tu reviens sur le projet dans 6 mois : tout ce qu'il faut savoir est ici.
>
> **Pour un assistant IA qui découvre le projet** : lis ce fichier en entier avant de toucher au code. Les sections ⚠️ **PIÈGES** contiennent des bugs déjà rencontrés et résolus — ne les réintroduis pas.
>
> Dernière mise à jour : mai 2026

---

## 1. Vue d'ensemble

Portfolio de **Thomas Etcheverry**, vidéaste / réalisateur freelance (Paris & remote).

Migré depuis **Framer** (20 €/mois) vers une solution **auto-hébergée gratuite**.

| Élément | Valeur |
|---|---|
| **Site live** | https://thomas-etcheverry.vercel.app |
| **Admin CMS** | https://thomas-etcheverry.vercel.app/admin/ |
| **Repo GitHub** | https://github.com/totolesancho/portfolio-thomas |
| **Hébergement** | Vercel (compte : totolesancho) |
| **Ancien site** | https://thomas-etcheverry.framer.ai (encore en ligne, source des assets d'origine) |
| **Email pro** | thomas.etche.prod@gmail.com |
| **Coût mensuel** | 0 € (hors nom de domaine custom si acheté un jour) |

**Nom de domaine custom** : pas encore acheté. Le jour où c'est fait → le brancher dans Vercel → Settings → Domains, puis mettre à jour `admin/config.yml` (`base_url`) et l'OAuth App GitHub (cf. §9).

---

## 2. Stack technique

Volontairement **minimaliste, sans framework, sans build complexe**.

| Couche | Techno |
|---|---|
| **HTML** | Statique, une page par route |
| **CSS** | Tailwind CSS via **CDN** (`cdn.tailwindcss.com`) + CSS custom inline dans chaque `<style>` |
| **JS** | Vanilla, aucun bundler, aucune dépendance runtime |
| **Contenu** | Fichiers JSON dans `data/` |
| **CMS** | Decap CMS v3.1.10 (pinné, cf. ⚠️ piège §12) |
| **Auth CMS** | GitHub OAuth via 2 serverless functions Vercel (`/api/auth`, `/api/callback`) |
| **Build** | Un seul script Node : `scripts/build-projects.js` (génère les pages projet) |
| **Formulaire** | Formspree — ID : `mredlpnl` |
| **Vidéos** | YouTube (nocookie embed) + TikTok (embed v2) |
| **Polices** | Google Fonts : Bowlby One (display), Caveat (script), Inter (sans), Permanent Marker, Bungee Outline |

**Node requis** : ≥ 18 (le build script utilise ESM + `node:fs`).

---

## 3. Structure des fichiers

### Fichiers actifs (à maintenir)

```
portfolio-thomas/
├── index.html                  # Page d'accueil — TOUT le CSS custom du site est ici
├── projets.html                # Catalogue (grille + filtres par catégorie)
├── mentions-legales.html       # Page légale (noindex)
│
├── projets/
│   ├── _template.html          # ⚠️ TEMPLATE SOURCE — ne jamais supprimer
│   └── <slug>.html × 12        # Générés automatiquement, copies exactes du template
│
├── data/
│   ├── site.json               # Contenu page d'accueil
│   ├── projects.json           # Les 12 projets
│   └── testimonials.json       # Les 3 témoignages
│
├── assets/
│   ├── js/
│   │   ├── render.js           # Peuple index.html depuis site.json + projects.json + testimonials.json
│   │   ├── render-catalogue.js # Peuple projets.html (grille + filtres)
│   │   ├── render-project.js   # Peuple les pages projet (lit le slug dans l'URL)
│   │   └── burger.js           # Menu mobile + sticky CTA — injecté sur TOUTES les pages
│   ├── uploads/                # Images uploadées via Decap CMS
│   ├── projects/<slug>/        # Galeries photos par projet
│   └── favicon.png             # Favicon (récupérée de l'ancien site Framer)
│
├── admin/
│   ├── index.html              # Decap CMS + custom widget focal_point + preview templates
│   └── config.yml              # Schéma du CMS (collections, champs)
│
├── api/
│   ├── auth.js                 # Démarre le flow OAuth GitHub
│   └── callback.js             # Échange code → token, postMessage vers Decap
│
├── scripts/
│   └── build-projects.js       # Génère projets/<slug>.html depuis _template.html
│
├── package.json                # scripts: dev, cms, build
├── vercel.json                 # Config déploiement + headers cache
├── README.md                   # Quick-start (moins détaillé que ce fichier)
└── HANDOFF.md                  # ← ce fichier
```

### Fichiers legacy (peuvent être supprimés)

Des dizaines de `index-v*.html` (v3 → v18), `index-cinema-alt.html`, `framer-home.html`, `framer-projets.html`, `index-framer-backup.html`. Ce sont des **snapshots d'itérations de design** gardés pendant la construction. Ils ne sont pas servis par le site. Tu peux les supprimer sans risque si tu veux nettoyer le repo.

---

## 4. Architecture de rendu — comment le contenu arrive dans les pages

**Principe** : le HTML contient des placeholders avec des attributs `data-*`. Au chargement, un script JS fetch le JSON et remplit les placeholders.

### Page d'accueil (`index.html` → `render.js`)

```html
<span data-cms="hero.title_line1">JE FAIS</span>
```
→ `render.js` lit `site.json`, trouve `hero.title_line1`, remplace le `textContent`.

Conventions d'attributs :
- `data-cms="chemin.dans.json"` → remplace le texte
- `data-cms-block="nom"` → bloc entier généré en JS (marquees, bento, témoignages)
- `data-bento-slot="1..4"` → les 4 cards featured de l'accueil

**Fallback** : si le fetch échoue, le HTML statique reste affiché. C'est voulu.

### Catalogue (`projets.html` → `render-catalogue.js`)

Lit `projects.json`, génère les chips de filtre (par catégorie, avec compteurs) et la grille de cards. Re-render complet à chaque changement de filtre.

### Pages projet (`projets/<slug>.html` → `render-project.js`)

**Point clé** : les 12 pages projet sont des **copies byte-à-byte identiques** de `_template.html`. Le script lit le slug dans l'URL :

```js
const match = window.location.pathname.match(/\/projets\/([^/]+?)(?:\.html?)?$/i);
const slug = match[1];  // ex: "publicite-hiving"
```

puis trouve le projet correspondant dans `projects.json` et peuple les `data-proj="..."`.

**Conséquence** : pour modifier le design d'une page projet, tu modifies `_template.html` puis tu lances `npm run build` → les 12 pages sont régénérées.

---

## 5. Schémas de données

### `data/site.json`

```
meta            → { title, description }              (SEO)
hero            → { status_text, status_visible, title_line1, title_line2,
                    graffiti_tag, tagline, cta_label, cta_href, photo }
marquee_formats → [ "MARIAGE", "AFTERMOVIE", ... ]     (bandeau noir défilant)
projets_section → { kicker, title_prefix, title_suffix }
marquee_clients → [ "HIVING", "UBER EATS", ... ]
about           → { kicker, title_main, title_script, body, stack }
showreel        → { kicker, duration, video, poster }
cv_video        → { kicker, quote_main, quote_sub, circle_photo, youtube_id, duration }
testimonials_kicker → string
contact         → { kicker, title, intro, intro_accent, field_*_label,
                    submit_label, formspree_id }
footer          → { tagline, copyright }
social          → { instagram, tiktok, linkedin }
```

### `data/projects.json` → `{ projects: [ ... ] }`

Chaque projet (structure **PLATE**, cf. ⚠️ piège §12) :

```
slug            string    URL du projet — /projets/<slug>. Immuable une fois publié.
num             string    "01" → "12" (2 chiffres, affichage seulement)
title           string
client          string
card_subtitle   string    Affiché sous la vignette (ex: "Hiving Food · 2025")
year            string    "YYYY"
format          string    ex: "16:9 · 02:14"
role            string    ex: "RÉALISATION · CADRAGE · MONTAGE"
category        enum      PUB | REEL | AFTERMOVIE | SHOWREEL | DOCU | CORPO
featured        boolean   Affiché dans le bento de l'accueil ?
featured_order  int       0 = pas featured, 1→4 = position dans le bento
thumb           string    Path absolu, ex: "/assets/uploads/xxx.avif"
thumb_focal     string    "center" | "top" | ... | "47% 32%" | "47% 32% / 120%"
videos          array     ["YouTubeID"] ou ["https://tiktok.com/@x/video/123"]
images          array     [{ img: "/assets/...", focal: "center" }]
brief           text
approche_1      text
approche_2      text
stack_camera    string    (optionnel)
stack_optique   string    (optionnel)
stack_montage   string    (optionnel)
stack_sound     string    (optionnel)
impacts         array     [{ text: "220K vues TikTok" }, ...]  ← liste à puces libre
secondary_videos_layout  "auto" | "full"   (optionnel — "full" = vidéos secondaires pleine largeur)
```

**Champs legacy encore présents mais ignorés par le render** : `stack_etalonnage`, `impact_metric1/2`, `impact_label1/2`. Le render fait un fallback sur `impact_*` si `impacts[]` est vide, donc c'est safe de les laisser.

### `data/testimonials.json` → `{ testimonials: [ ... ] }`

```
num          "01" | "02" | "03"
quote        text
client       string    Nom de la personne
role         string    (peut être vide)
style        enum      ink (noir) | rec (rouge) | cream (beige)
photo        string    Path image (optionnel)
photo_focal  string    Focal point (optionnel)
emoji        string    Fallback si pas de photo
```

### Le format `focal` — position + zoom

Utilisé pour `thumb_focal`, `images[].focal`, `photo_focal`.

| Valeur | Interprétation |
|---|---|
| `center`, `top`, `left bottom`… | Mots-clés CSS classiques |
| `47% 32%` | `background-position: 47% 32%` + `background-size: cover` |
| `47% 32% / 120%` | `background-position: 47% 32%` + `background-size: 120%` |

Le parsing est dupliqué dans 3 fichiers (`render.js`, `render-catalogue.js`, `render-project.js`) sous forme de fonction `focalToCSS()` / `applyFocal()`. **Si tu modifies la logique, modifie les 3.** (Pas de module system, c'est le prix du zéro-build.)

---

## 6. Le CMS (Decap)

### Accès
`https://thomas-etcheverry.vercel.app/admin/` → "Login with GitHub" → autorise → tu édites.

Chaque publication = un **commit GitHub** → Vercel redéploie automatiquement (~30 s).

### Collections configurées (`admin/config.yml`)

1. **🏠 Contenu du site** → `data/site.json`
2. **🎬 Projets** → `data/projects.json` (liste, champs préfixés ① → ⑧ pour la lisibilité)
3. **💬 Témoignages** → `data/testimonials.json`

### Custom widget `focal_point`

Défini dans `admin/index.html`. C'est un **picker visuel** :
- Affiche l'image source (lue depuis un champ frère, configuré via `image_field:`)
- Click sur l'image → pose le focal point
- Slider zoom 50-200 %
- Aperçu live de la card au ratio configuré (`preview_aspect:`)

Utilisé sur 3 champs : `thumb_focal` (image_field: `thumb`), `images[].focal` (image_field: `img`), `photo_focal` (image_field: `photo`).

Le widget lit `this.props.forID` pour retrouver l'index de l'item dans la liste, avec fallback sur une recherche récursive.

---

## 7. Le build script

`scripts/build-projects.js` — lancé par `npm run build`, et **automatiquement par Vercel à chaque deploy** (`buildCommand` dans `vercel.json`).

Ce qu'il fait :
1. Lit `data/projects.json` + `projets/_template.html`
2. Pour chaque slug valide (`^[a-z0-9-]+$`) → écrit `projets/<slug>.html` (copie du template)
3. Supprime les `.html` orphelins dans `projets/` (slug plus présent dans le JSON)
4. Ne touche jamais `_template.html`

**Idempotent** : ne réécrit un fichier que si son contenu diffère du template.

**Conséquence pratique** : tu ajoutes un projet dans Decap → publish → Vercel build → la page détail existe. **Aucune action manuelle.**

---

## 8. Déploiement Vercel

### `vercel.json`

```jsonc
{
  "buildCommand": "npm run build",
  "outputDirectory": ".",
  "cleanUrls": true,        // /projets au lieu de /projets.html
  "trailingSlash": false,
  "headers": [ /* voir ci-dessous */ ]
}
```

### Stratégie de cache (⚠️ important — cf. piège §12)

| Route | Cache-Control |
|---|---|
| `/assets/(js\|css)/(.*)` | `max-age=0, must-revalidate` — les JS doivent pouvoir être mis à jour instantanément |
| `/assets/(.*)` (médias) | `max-age=86400, stale-while-revalidate=604800` |
| `/data/(.*)` | `no-cache, no-store, must-revalidate` |
| `/(.*\.html)?` | `max-age=0, must-revalidate` |
| `/admin/(.*)` | `no-cache` + `X-Frame-Options: SAMEORIGIN` |

Les `<script src>` portent aussi un cache-buster `?v=<timestamp>` (ajouté manuellement lors d'un fix de cache). Si tu changes profondément un JS et que les users ne voient pas la mise à jour, incrémente ce timestamp.

### Variables d'environnement Vercel

Configurées dans **Vercel → Settings → Environment Variables** :

| Nom | Contenu |
|---|---|
| `GITHUB_CLIENT_ID` | ID public de l'OAuth App GitHub |
| `GITHUB_CLIENT_SECRET` | 🔒 Secret — **jamais dans le repo** |

🔒 **Note sécurité** : le Client Secret a été exposé en clair dans une conversation pendant le développement. **Il devrait être régénéré** (GitHub → Settings → Developer settings → OAuth Apps → ton app → "Generate a new client secret"), puis mis à jour dans Vercel. À faire si ce n'est pas déjà fait.

---

## 9. OAuth GitHub — setup et migration

### Configuration actuelle

**GitHub → Settings → Developer settings → OAuth Apps → "Portfolio Thomas CMS"**

| Champ | Valeur |
|---|---|
| Homepage URL | `https://thomas-etcheverry.vercel.app` |
| Authorization callback URL | `https://thomas-etcheverry.vercel.app/api/callback` |

### Comment ça marche

1. Decap ouvre une **popup** vers `<base_url>/api/auth`
2. `api/auth.js` construit l'URL GitHub OAuth (avec `redirect_uri` dérivée dynamiquement des headers de la requête) et redirige (302)
3. L'utilisateur autorise sur GitHub
4. GitHub redirige vers `/api/callback?code=...`
5. `api/callback.js` échange le code contre un `access_token`
6. La page callback fait un **handshake postMessage** avec Decap :
   - popup → parent : `authorizing:github`
   - parent → popup : `authorizing:github`
   - popup → parent : `authorization:github:success:{token}`
7. Decap reçoit le token, ferme la popup, tu es connecté

### ⚠️ Si tu changes l'URL du site (domaine custom, rename Vercel)

**3 endroits à mettre à jour, sinon l'admin casse** :

1. `admin/config.yml` → `backend.base_url`
2. GitHub OAuth App → **Homepage URL**
3. GitHub OAuth App → **Authorization callback URL** (= `<nouvelle-url>/api/callback`)

Pas besoin de régénérer le Client Secret pour ça.

---

## 10. Design system

### Couleurs (CSS variables, définies dans chaque page)

```css
--cream: #f4f1ea;   /* fond principal */
--ink:   #0e0e0e;   /* texte / fonds sombres */
--rec:   #ff3b1c;   /* rouge signature (accents, CTA) */
--dim:   #8a8580;   /* texte secondaire */
--line:  rgba(14,14,14,0.10);
```

### Typographie

| Rôle | Police | Classe |
|---|---|---|
| Display / titres | **Bowlby One** | `.display` |
| Manuscrit / accents | **Caveat** | `.script` |
| Corps de texte | **Inter** | (par défaut sur `body`) |
| Graffiti | Permanent Marker | `.marker` |

### Classes CSS clés

| Classe | Rôle |
|---|---|
| `.tag` / `.tag-dim` | Petit label uppercase tracké (kickers) |
| `.btn-cta` | Gros bouton hero (rouge, ombre décalée) |
| `.btn-ink` | Bouton noir arrondi (pill) |
| `.btn-view-more` | Bouton "voir tous les projets" |
| `.r` / `.r.in` | Système de reveal au scroll (IntersectionObserver) |
| `.r.d1` `.d2` `.d3` | Delays staggered pour le reveal |
| `.intro.t1` → `.t6` | Animation d'entrée séquencée au load |
| `.dashes` | Bandeau de tirets rouges (masqué sur mobile) |
| `.grain` | Overlay de grain papier (fixed, mix-blend-mode multiply) |
| `.hero-fold` | Wrapper qui prend 100svh sur mobile |
| `.nav-cv-link` | Lien "CV Vidéo" avec trait orange dessiné (SVG inline) |
| `.sticky-cta` | Bouton flottant mobile (injecté par `burger.js`) |

### Layouts

- **Bento accueil** : 2 rangées, alternance horizontal (16:9) / vertical (9:16). Sur mobile → 1 colonne, tout en 16:9.
- **Catalogue** : grille uniforme, cards en **4:3**. 3 cols desktop → 2 cols tablette → 2 cols mobile.
- **Galerie projet** : toujours 2 colonnes, cards 4:3.
- **Témoignages** : 3 colonnes desktop → **carousel horizontal swipe** sur mobile (scroll-snap).

---

## 11. Responsive — règles mobile appliquées

Toutes dans le `<style>` de `index.html` (`@media (max-width: 640px)` et `768px`), plus quelques-unes injectées par `burger.js` pour s'appliquer partout.

| Élément | Comportement mobile |
|---|---|
| **Hero** | `.hero-fold` prend `100svh - 70px`, contenu centré → seule la hero est visible à l'arrivée |
| **Badge "Ouvert aux collabs"** | Masqué |
| **Barres rouges `.dashes`** | Masquées (sinon le logo saute de 16px à l'ouverture du burger) |
| **Animation du titre hero** | Désactivée (`.intro.t1` → opacity 1, pas de transition) |
| **Bandeau noir marquee** | `margin-top: 80px`, `margin-bottom: 64px` |
| **Bento projets** | 1 colonne, cards 16:9, gap 14px |
| **Catalogue** | 2 colonnes, gap 12px, meta compacts (font 8px) |
| **Témoignages** | Carousel horizontal, cards à 85% de largeur, `min-height: 460px`, hint "← Swipe →" |
| **CV vidéo** | Quote card en mode "mini-note" (padding réduit, cercle 52px) |
| **Sticky CTA** | Bouton flottant "Discutons" bas-droite, masqué quand le burger est ouvert |
| **Burger** | Overlay fade + slide-down, liens en cascade, logo aligné pile sur celui du header |
| **Touch targets** | 44×44 px minimum |
| **Padding sections** | 72-96px vertical (aération) |

---

## 12. ⚠️ PIÈGES CONNUS — bugs déjà rencontrés, ne pas réintroduire

### A. Le JSON des projets est PLAT — ne jamais wrapper dans des `object` Decap

Le render lit `p.title`, `p.thumb`, `p.slug` **directement à la racine**. Si tu ajoutes un `widget: "object"` dans `admin/config.yml` pour grouper visuellement des champs, Decap va **nester le JSON** et casser tout le rendu.

→ Pour grouper visuellement, utilise des **préfixes dans les labels** (①, ②, ③…) et l'ordre des champs. C'est ce qui est fait actuellement.

### B. Tailwind CDN ne voit pas les classes injectées après le load

Tailwind CDN scanne le DOM **au chargement**. Toute classe Tailwind ajoutée par JS après coup (ex : `md:hidden` sur le bouton burger injecté par `burger.js`) **n'aura aucun CSS généré**.

→ Pour tout élément injecté en JS, écris du **CSS pur** dans le bloc `<style>` de `burger.js`.

Symptôme rencontré : le bouton burger était visible sur desktop.

### C. Reset global `border-radius: 0 !important`

`projets.html` et `projets/_template.html` ont :
```css
*, *::before, *::after { border-radius: 0 !important; }
```
→ Tout élément qui doit être arrondi sur ces pages a besoin de `border-radius: X !important`.

Symptôme rencontré : boutons "Discutons" et sticky CTA carrés sur les pages projet.

### D. Cache Vercel `immutable` sur `/assets/*`

L'ancienne config mettait `max-age=31536000, immutable` sur **tout** `/assets/`, JS compris → les navigateurs mobiles ne re-téléchargeaient jamais les scripts, les deploys étaient invisibles.

→ Résolu (cf. §8). Ne repasse jamais les JS en `immutable` sans hash dans le nom de fichier.

### E. Paths d'images relatifs cassés par les clean URLs

Avec `cleanUrls: true`, la page `/projets/publicite-hiving` a pour base `/projets/`. Un path `./assets/x.png` se résout en `/projets/assets/x.png` → 404.

→ **Tous les paths d'images dans les JSON doivent être absolus** : `/assets/...`

### F. YAML : ne pas mélanger flow et block style

Ceci est **invalide** et casse tout le CMS (écran d'erreur Decap) :
```yaml
- { label: "Champ", name: "x", widget: "select",
    options:
      - { label: "A", value: 0 }    # ← block list dans un flow mapping
  }
```
→ Écris le champ **entièrement en block style** si tu as besoin d'une liste d'options :
```yaml
- label: "Champ"
  name: "x"
  widget: "select"
  options:
    - { label: "A", value: 0 }
```

Valide toujours avec `npx js-yaml admin/config.yml` avant de push.

### G. Version Decap pinnée

`admin/index.html` charge `decap-cms@3.1.10` **exactement**. Les versions plus récentes ont eu un mismatch app/core provoquant un `appendChild of null` (écran blanc). Ne passe pas en `@latest` sans tester.

### H. Listes Decap : string vs objet

Une liste Decap avec `field: { name: "id", widget: "string" }` produit `[{id: "x"}]`, pas `["x"]`. Le render normalise les deux formes (`videos`, `images`). Si tu ajoutes une liste, **prévois le fallback**.

### I. Popup OAuth bloquée

Si le login admin ne fait "rien" au clic avec l'erreur `Cannot read properties of null (reading 'focus')` dans la console → **c'est le bloqueur de popup du navigateur**. Autoriser les popups pour le domaine, vider le localStorage du site, ou tester en navigation privée.

---

## 13. Workflows courants

### Lancer en local

```bash
npm run dev     # sert le site sur http://localhost:4321
npm run cms     # (autre terminal) proxy Decap local — nécessite local_backend: true dans config.yml
npm run build   # régénère les pages projet
```

⚠️ `local_backend: true` dans `admin/config.yml` doit rester **commenté** en production.

### Ajouter un projet

**Via le CMS (recommandé)** : `/admin` → 🎬 Projets → "Add Projets" → remplir → Publish. La page détail est générée automatiquement au build.

**En direct dans le JSON** : ajouter un objet dans `data/projects.json`, puis `npm run build` avant de commit.

### Modifier le design d'une page projet

1. Éditer `projets/_template.html`
2. `npm run build` (régénère les 12 pages)
3. Commit + push

**Ne jamais éditer un `projets/<slug>.html` directement** — il sera écrasé au prochain build.

### Modifier un texte de l'accueil

Via `/admin` → 🏠 Contenu du site. Ou directement dans `data/site.json`.

### Changer la vidéo CV

Deux endroits, indépendants :
- **Section CV sur l'accueil** : `site.json` → `cv_video.youtube_id`
- **Page projet CV** : `projects.json` → projet `cv-video` → `videos[]`

---

## 14. État actuel du contenu

**12 projets** :

| # | Slug | Catégorie | Featured |
|---|---|---|---|
| 01 | publicite-hiving | PUB | ⭐ |
| 02 | galeries-lafayette | PUB | |
| 03 | uber-eats | PUB | |
| 04 | f4-ledenon | REEL | ⭐ |
| 05 | serie-documentaire | DOCU | |
| 06 | edge-tech | REEL | ⭐ |
| 07 | digital-edge | SHOWREEL | |
| 08 | skilliance | AFTERMOVIE | |
| 09 | film-recrutement | CORPO | |
| 10 | podcast | CORPO | |
| 11 | aftermovie-hiving | AFTERMOVIE | ⭐ |
| 12 | cv-video | REEL | |

**3 témoignages** : Mattis SIMON (ink), Louis CAPELLE (rec), Maxime DEMURGER (cream) — avec photos.

---

## 15. TODO / points en attente

### Sécurité
- [ ] **Régénérer le GitHub Client Secret** (exposé en clair pendant le dev) et le mettre à jour dans Vercel

### Légal
- [ ] Compléter `mentions-legales.html` : **SIRET** et **adresse** (actuellement marqués "à compléter")

### Contenu
- [ ] Remplacer la vignette placeholder du projet `cv-video` (pointe actuellement sur `aftermovie-hiving-x-tiktok.png`)
- [ ] Vérifier que toutes les vidéos YouTube sont en **"Non répertorié"** (une vidéo en "Privé" affiche un écran noir dans l'embed)

### SEO / mise en ligne
- [ ] Acheter un **nom de domaine** et le brancher sur Vercel
- [ ] Une fois le domaine en place : créer `robots.txt` + `sitemap.xml`, ajouter les meta **Open Graph** (preview des liens partagés)
- [ ] Actuellement le site **est indexable** (pas de `noindex` sur l'accueil, le catalogue et les pages projet). Si tu ne veux pas être indexé avant d'avoir ton domaine, ajouter `<meta name="robots" content="noindex">` sur ces pages.

### Branding
- [ ] Décision en cours sur un pseudo créateur. Piste retenue : garder **Thomas Etcheverry** comme nom pro, choisir un handle court pour les réseaux (`@tometche`, `@thomas.etche`, `@etchefilms`). Le pseudo "Verry" (issu de la fin du nom) a été exploré puis écarté.

### Nettoyage optionnel
- [ ] Supprimer les ~18 fichiers `index-v*.html` et `framer-*.html` (snapshots d'itérations, non servis)

---

## 16. Commandes de référence

```bash
# Dev local
npm run dev

# Régénérer les pages projet
npm run build
node scripts/build-projects.js       # équivalent

# Valider le YAML du CMS avant de push
npx js-yaml admin/config.yml > /dev/null && echo "YAML OK"

# Vérifier que les routes OAuth répondent
curl -s -o /dev/null -w "%{http_code}\n" https://thomas-etcheverry.vercel.app/api/auth
# → 302 attendu

# Lister les projets et leurs slugs
node -e "const d=require('./data/projects.json');d.projects.forEach(p=>console.log(p.num,p.slug,p.category))"

# Vérifier l'indexation Google
# → taper dans Google : site:thomas-etcheverry.vercel.app
```

---

## 17. Contacts et accès

| Service | Compte / identifiant |
|---|---|
| **GitHub** | `totolesancho` — repo `portfolio-thomas` |
| **Vercel** | Compte lié au GitHub, projet `thomas-etcheverry` |
| **Formspree** | Form ID `mredlpnl` → envoie vers thomas.etche.prod@gmail.com |
| **YouTube** | Chaîne "Thomas Etcheverry" (vidéos en Non répertorié) |
| **TikTok** | `@totolesancho_` |

🔒 Les secrets (GitHub Client Secret) sont **uniquement** dans les variables d'environnement Vercel. Ne jamais les commit.

---

*Fin du document. Si quelque chose ici ne correspond plus à la réalité du code, le code fait foi — mets ce fichier à jour.*
