# Portfolio Thomas Etcheverry

Site portfolio statique avec **CMS intégré (Decap CMS)** — édition du contenu via interface web, hébergement gratuit sur Vercel.

---

## ⚡ TL;DR

- **Site live** : déployé sur Vercel
- **Édition du contenu** : `ton-site.com/admin` (login GitHub)
- **Pas de build step** : HTML + JS vanilla, lit `data/*.json` en live
- **Formulaire contact** : Formspree gratuit
- **Coût total** : ~0,8 €/mois (juste le domaine custom)

---

## Stack

- **Front** : HTML / Tailwind CSS (CDN) / Vanilla JS
- **Contenu** : JSON dans `data/` (édité via Decap CMS)
- **Hébergement** : Vercel (gratuit illimité)
- **CMS** : Decap CMS (anciennement Netlify CMS — open source, gratuit)
- **Auth CMS** : GitHub OAuth via Vercel serverless functions (`/api/auth` + `/api/callback`)
- **Formulaire** : Formspree (50 messages/mois gratuits)
- **Polices** : Google Fonts (Bowlby One, Caveat, Inter, Special Elite, etc.)

---

## 📁 Structure des fichiers

```
portfolio-thomas/
├── index.html              # Page d'accueil (charge data/*.json)
├── projets/
│   ├── _template.html      # Template de référence (ne pas supprimer)
│   ├── publicite-hiving.html
│   ├── galeries-lafayette.html
│   └── ... (10 pages — chacune charge son contenu depuis data/projects.json via le slug)
├── data/
│   ├── site.json           # Contenu page d'accueil
│   ├── projects.json       # Les 10 projets
│   └── testimonials.json   # Les témoignages
├── assets/
│   ├── js/
│   │   ├── render.js           # Charge data/*.json sur index.html
│   │   └── render-project.js   # Charge le bon projet sur /projets/<slug>.html
│   ├── uploads/            # Images uploadées via Decap CMS (créé auto)
│   └── *.jpg/.png/.mp4     # Assets existants
├── admin/
│   ├── index.html          # UI Decap CMS (à ton-site.com/admin)
│   └── config.yml          # Schéma des collections CMS
├── api/
│   ├── auth.js             # OAuth GitHub : start
│   └── callback.js         # OAuth GitHub : exchange code → token
├── package.json
├── vercel.json
└── README.md
```

---

## 🚀 Démarrage rapide local

### 1) Installer Node (si pas déjà fait)

```bash
brew install node
```

### 2) Lancer le serveur preview

```bash
npx serve -l 4321 .
# puis ouvre http://localhost:4321
```

### 3) Lancer Decap CMS en local (édition sans GitHub)

Dans un **deuxième terminal** :

```bash
npx decap-server
```

Puis va sur **http://localhost:4321/admin** — tu auras l'interface admin sans avoir besoin de login GitHub. Les modifications sont écrites directement dans tes fichiers locaux `data/*.json`.

> ⚠️ Le mode `local_backend` est défini dans `admin/config.yml`. À désactiver en prod si tu veux forcer GitHub OAuth.

---

## 🌐 Déploiement Vercel

### Méthode recommandée : GitHub auto-deploy

1. **Créer un repo GitHub** `portfolio-thomas`
2. **Push tout le dossier** :
   ```bash
   cd portfolio-thomas
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin git@github.com:TON-USERNAME/portfolio-thomas.git
   git push -u origin main
   ```
3. Sur **vercel.com** → **Add New** → **Project** → sélectionner le repo → **Deploy**
4. URL fournie : `https://portfolio-thomas-xxx.vercel.app`

Chaque `git push` redéploie automatiquement.

### Méthode rapide (sans GitHub)

```bash
npm i -g vercel
cd portfolio-thomas
vercel        # première fois — login + setup
vercel --prod # déploiement production
```

---

## 🔐 Setup Decap CMS production (GitHub OAuth)

Pour que `ton-site.com/admin` fonctionne en ligne, il faut :

### Étape 1 — Créer un GitHub OAuth App

1. Va sur **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Remplis :
   - **Application name** : `Portfolio Thomas CMS`
   - **Homepage URL** : `https://ton-site.vercel.app`
   - **Authorization callback URL** : `https://ton-site.vercel.app/api/callback`
3. Clique **Register application**
4. Note le **Client ID**
5. Clique **Generate a new client secret** → note le **Client Secret**

### Étape 2 — Ajouter les env vars dans Vercel

Dans **Vercel → ton projet → Settings → Environment Variables**, ajouter :

| Name                  | Value                                                |
|-----------------------|------------------------------------------------------|
| `GITHUB_CLIENT_ID`     | (le Client ID copié plus haut)                       |
| `GITHUB_CLIENT_SECRET` | (le Client Secret généré)                            |

Cocher **Production**, **Preview** et **Development**. Sauvegarder.

### Étape 3 — Mettre à jour `admin/config.yml`

Remplacer les 2 lignes :

```yaml
backend:
  name: github
  repo: TON-USERNAME/portfolio-thomas       # ← ton repo GitHub
  branch: main
  base_url: https://ton-site.vercel.app     # ← l'URL Vercel de TON site (pas un autre)
  auth_endpoint: /api/auth
```

Et désactiver le local_backend en prod :
```yaml
# local_backend: true   ← commenter cette ligne avant de push en prod
```

### Étape 4 — Redéployer

```bash
git add admin/config.yml
git commit -m "Configure Decap CMS prod"
git push
```

### Étape 5 — Tester

1. Va sur `https://ton-site.vercel.app/admin`
2. Clique **Login with GitHub**
3. Autorise l'OAuth App
4. Tu arrives dans l'interface CMS ✅
5. Édite un projet → **Publish** → un commit GitHub est créé → Vercel redéploie en ~30s

---

## 📝 Setup Formspree (formulaire de contact)

1. Crée un compte sur https://formspree.io avec **thomas.etche.prod@gmail.com**
2. Crée un nouveau form → note le **form ID** (ex: `xyzabc123`)
3. Va dans `/admin` → **🏠 Contenu du site** → **Section Contact** → champ **Formspree ID**
4. Colle `xyzabc123` → **Publish**

C'est tout — les messages arrivent dans ton email.

---

## ✏️ Utiliser le CMS au quotidien

Va sur `ton-site.com/admin` :

| Section CMS | Tu peux éditer |
|---|---|
| **🏠 Contenu du site** | Hero (titre, photo, CTA), À propos, Showreel, Contact, footer, social, marquees |
| **🎬 Projets** | Les 10 projets : titre, vignette, vidéos YouTube, case study complète |
| **💬 Témoignages** | Les 3 témoignages clients |

**Workflow** :
1. Click sur la section
2. Modifie les champs
3. **Publish** en haut à droite
4. → Commit GitHub auto → Vercel redéploie en 30s → site à jour

**Pour ajouter un 11e projet** : tu crées d'abord le fichier HTML correspondant dans `/projets/` (copie de `_template.html` renommé `mon-nouveau-projet.html`), tu push, puis dans le CMS tu ajoutes une entrée avec `slug: mon-nouveau-projet`.

---

## 🛠️ Modifier le design (pas le contenu)

Tout le CSS et la structure sont dans `index.html` (sections HTML inline + `<style>` en haut). Pour modifier les couleurs, fonts, layout : ouvre `index.html` dans VSCode.

Variables clés à connaître :
- Couleur fond : `--cream: #f4f1ea`
- Couleur accent : `--rec: #ff3b1c`
- Couleur texte : `--ink: #0e0e0e`
- Font display : Bowlby One
- Font script : Caveat
- Font typewriter : Special Elite

---

## 🧯 Troubleshooting

### Le CMS ne charge pas mes changements
- Vercel met ~30s à redéployer après un commit
- Vide le cache navigateur (Cmd+Shift+R)
- Les fichiers `/data/*.json` sont en `no-cache` (config dans `vercel.json`) donc ça doit être instantané côté nav

### Login GitHub échoue sur /admin
- Vérifier que `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` sont bien définis dans Vercel
- Vérifier que la callback URL dans l'OAuth App = `https://ton-site.vercel.app/api/callback` (HTTPS obligatoire)
- Vérifier que `base_url` dans `admin/config.yml` pointe vers ton site Vercel

### Une image ne s'affiche pas après upload CMS
- Vérifier que `media_folder: "assets/uploads"` existe (Decap crée le dossier la 1ère fois)
- Les chemins doivent être relatifs : `./assets/uploads/mon-image.jpg`

### Le site se charge sans le contenu CMS
- C'est OK : si le fetch des JSON échoue, le HTML statique (contenu par défaut) reste affiché
- Console navigateur (F12) → tab Network : vérifier que `data/site.json` répond 200

---

## 💰 Coût total mensuel

| Item | Coût |
|---|---|
| Hébergement Vercel (Hobby) | 0 € |
| Decap CMS | 0 € |
| GitHub | 0 € |
| Formspree (50 msg/mois) | 0 € |
| Polices Google Fonts | 0 € |
| Domaine custom (annuel, optionnel) | ~10 €/an |
| **Total** | **~0,8 €/mois** |

vs Framer = 20 €/mois → économie **~230 €/an**.

---

## 📦 Versions sauvegardées

Les versions intermédiaires du site sont conservées comme `index-vN-*.html` à la racine. Aucune n'est servie en production — c'est juste de l'historique au cas où.

Dernière version live : voir `index.html`.
