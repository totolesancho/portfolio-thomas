/* ------------------------------------------------------------------
   render-catalogue.js — projets.html
   - Filter chips par catégorie
   - Bento en rangées propres (hero / three / two) — pas de gaps irréguliers
   - Re-render à chaque filtre pour garder le tetris parfait
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

  let projects = null;
  try {
    const r = await fetch('./data/projects.json', { cache: 'no-store' });
    if (r.ok) projects = await r.json();
  } catch (e) { console.warn('[catalogue] fetch fail', e); return; }
  if (!projects || !Array.isArray(projects.projects)) return;

  const ALL = projects.projects;
  const CATS = ['TOUS', 'PUB', 'REEL', 'AFTERMOVIE', 'SHOWREEL', 'DOCU', 'CORPO'];
  let currentFilter = 'TOUS';

  // ---------- FILTER BAR ----------
  const filterBar = document.querySelector('[data-cat-block="filter_bar"]');
  if (filterBar) {
    const counts = { TOUS: ALL.length };
    ALL.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });

    filterBar.innerHTML = CATS
      .filter((c) => c === 'TOUS' || counts[c] > 0)
      .map(
        (c) => `<button class="filter-chip${c === 'TOUS' ? ' active' : ''}" data-cat="${c}">${c}<span class="count">${counts[c] || 0}</span></button>`
      )
      .join('');
  }

  // ---------- RENDER GRID (called on init + filter change) ----------
  const gridWrap = document.querySelector('[data-cat-block="catalogue_grid"]');

  function renderGrid(cat) {
    if (!gridWrap) return;
    const items = cat === 'TOUS' ? ALL : ALL.filter((p) => p.category === cat);

    if (items.length === 0) {
      gridWrap.innerHTML = `<div class="empty-state">— Aucun projet dans cette catégorie pour l'instant —</div>`;
      return;
    }

    // Pattern de rangées propres :
    // - mixed-hv : Horizontal + Vertical (H gauche, V droite)
    // - mixed-vh : Vertical + Horizontal (V gauche, H droite — inversé)
    // - three    : 3 verticales (4:5)
    // - hero     : 1 grosse horizontale 16:9 (rare, pour ouvrir/fermer)
    // Boucle : hero → mixed-hv → three → mixed-vh → ...
    const PATTERN = [
      { type: 'hero',     size: 1, shapes: ['hori'] },
      { type: 'mixed-hv', size: 2, shapes: ['hori', 'vert'] },
      { type: 'three',    size: 3, shapes: ['vert', 'vert', 'vert'] },
      { type: 'mixed-vh', size: 2, shapes: ['vert', 'hori'] },
    ];

    let i = 0;
    let html = '';
    let patternIdx = 0;
    while (i < items.length) {
      let row = PATTERN[patternIdx % PATTERN.length];
      let remaining = items.length - i;

      // Adapter si moins d'items restants
      if (remaining < row.size) {
        if (remaining === 1) row = { type: 'hero', size: 1, shapes: ['hori'] };
        else if (remaining === 2) row = { type: 'mixed-hv', size: 2, shapes: ['hori', 'vert'] };
        else if (remaining === 3) row = { type: 'three', size: 3, shapes: ['vert','vert','vert'] };
      }

      const slice = items.slice(i, i + row.size);
      html += `<div class="cat-row row-${row.type}">` +
        slice.map((p, idx) => cardHTML(p, row.shapes[idx] || 'vert')).join('') +
        '</div>';
      i += row.size;
      patternIdx++;
    }
    gridWrap.innerHTML = html;

    // Reveal animation
    gridWrap.querySelectorAll('.cat-card').forEach((el) => {
      el.classList.add('r');
      if (window.__revealObserver) window.__revealObserver.observe(el);
    });
  }

  function cardHTML(p, shape) {
    const focal = p.thumb_focal || 'center';
    const sub = p.card_subtitle || (p.client + ' · ' + p.year);
    return `
      <a href="./projets/${escapeHTML(p.slug)}.html"
         class="cat-card"
         data-shape="${shape || 'vert'}"
         data-category="${escapeHTML(p.category || '')}">
        <div class="cat-card-thumb" style="background-image:url('${escapeAttr(p.thumb)}'); background-position:${escapeAttr(focal)};"></div>
        <div class="cat-card-veil"></div>
        <div class="cat-card-meta">
          <span class="cat-card-cat">${escapeHTML(p.category || '')}</span>
          <div class="cat-card-sub">${escapeHTML(sub)}</div>
        </div>
      </a>`;
  }

  // Initial render
  renderGrid('TOUS');

  // ---------- FILTER CLICK HANDLER ----------
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = cat;
      renderGrid(cat);

      // Smooth scroll au top de la grille
      const top = gridWrap.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ---------- URL hash filter (e.g. projets.html#REEL) ----------
  if (window.location.hash) {
    const hashCat = window.location.hash.slice(1).toUpperCase();
    const chip = document.querySelector(`.filter-chip[data-cat="${hashCat}"]`);
    if (chip) setTimeout(() => chip.click(), 100);
  }

  function escapeHTML(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/'/g, '%27').replace(/"/g, '%22');
  }
})();
