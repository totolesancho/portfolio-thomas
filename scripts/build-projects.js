#!/usr/bin/env node
/* ------------------------------------------------------------------
   build-projects.js
   Génère automatiquement les pages /projets/<slug>.html à partir de :
     - data/projects.json   (source de vérité, éditée via Decap CMS)
     - projets/_template.html  (template universel ; le slug est lu
       depuis l'URL côté client par assets/js/render-project.js)

   Comportement :
     1. Pour chaque projet du JSON → crée/met à jour projets/<slug>.html
        (juste une copie du template — le contenu est rendu côté JS).
     2. Supprime les pages orphelines (slug plus présent dans le JSON).
     3. Préserve _template.html, jamais touché.

   Lancement :
     - manuel : npm run build
     - auto   : Vercel le lance via "buildCommand" (cf. vercel.json)
   ------------------------------------------------------------------ */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TEMPLATE_PATH  = join(ROOT, 'projets', '_template.html');
const PROJECTS_JSON  = join(ROOT, 'data', 'projects.json');
const PROJETS_DIR    = join(ROOT, 'projets');

function log(...args) { console.log('[build-projects]', ...args); }

function main() {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error('[build-projects] Template introuvable :', TEMPLATE_PATH);
    process.exit(1);
  }
  if (!existsSync(PROJECTS_JSON)) {
    console.error('[build-projects] projects.json introuvable :', PROJECTS_JSON);
    process.exit(1);
  }

  const template = readFileSync(TEMPLATE_PATH, 'utf-8');
  const data = JSON.parse(readFileSync(PROJECTS_JSON, 'utf-8'));
  const projects = Array.isArray(data.projects) ? data.projects : [];

  if (projects.length === 0) {
    log('Aucun projet dans projects.json — rien à générer.');
    return;
  }

  // 1. Slugs valides (depuis le JSON)
  const validSlugs = new Set(
    projects
      .map((p) => (p.slug || '').trim())
      .filter((s) => s && /^[a-z0-9-]+$/.test(s))
  );

  // 2. Génère/met à jour chaque page projet
  let created = 0;
  let updated = 0;
  for (const slug of validSlugs) {
    const filePath = join(PROJETS_DIR, `${slug}.html`);
    const existed = existsSync(filePath);
    const currentContent = existed ? readFileSync(filePath, 'utf-8') : null;

    // Écrit seulement si nouveau OU contenu obsolète (template a changé)
    if (currentContent !== template) {
      writeFileSync(filePath, template, 'utf-8');
      if (existed) updated++; else created++;
    }
  }

  // 3. Supprime les pages orphelines
  // (un fichier .html dans projets/ qui n'est PAS _template.html
  //  et dont le slug n'existe plus dans projects.json)
  const filesInDir = readdirSync(PROJETS_DIR);
  let removed = 0;
  for (const fname of filesInDir) {
    if (!fname.endsWith('.html')) continue;
    if (fname === '_template.html') continue;
    const slug = fname.replace(/\.html$/, '');
    if (!validSlugs.has(slug)) {
      unlinkSync(join(PROJETS_DIR, fname));
      removed++;
      log(`Supprimé (orphelin) : ${fname}`);
    }
  }

  log(`✓ ${projects.length} projet(s) dans le JSON`);
  log(`  - créés    : ${created}`);
  log(`  - màj      : ${updated}`);
  log(`  - orphelins supprimés : ${removed}`);
  log('Done.');
}

main();
