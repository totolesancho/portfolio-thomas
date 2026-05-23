/* ------------------------------------------------------------------
   render-catalogue.js — projets.html
   - Filter chips par catégorie
   - Bento en rangées propres (hero / three / two) — pas de gaps irréguliers
   - Re-render à chaque filtre pour garder le tetris parfait
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

  /* Parse focal "X% Y%" / "X% Y% / Z%" / "center" → string CSS inline */
  function focalToCSS(val) {
    if (!val) return 'background-position:center; background-size:cover;';
    const v = String(val).trim().toLowerCase();
    const keywords = {
      'center':{x:50,y:50},'top':{x:50,y:0},'bottom':{x:50,y:100},
      'left':{x:0,y:50},'right':{x:100,y:50},
      'left top':{x:0,y:0},'top left':{x:0,y:0},
      'right top':{x:100,y:0},'top right':{x:100,y:0},
      'left bottom':{x:0,y:100},'bottom left':{x:0,y:100},
      'right bottom':{x:100,y:100},'bottom right':{x:100,y:100},
    };
    const slashIdx = v.indexOf('/');
    const posStr  = slashIdx >= 0 ? v.slice(0, slashIdx).trim() : v;
    const zoomStr = slashIdx >= 0 ? v.slice(slashIdx + 1).trim() : '';
    let x = 50, y = 50;
    if (keywords[posStr]) { x = keywords[posStr].x; y = keywords[posStr].y; }
    else { const m = posStr.match(/^([\d.]+)%\s+([\d.]+)%$/); if (m) { x = parseFloat(m[1]); y = parseFloat(m[2]); } }
    let size = 'cover';
    if (zoomStr) { const z = parseFloat(zoomStr); if (!isNaN(z) && z > 0 && z !== 100) size = z + '%'; }
    return `background-position:${x}% ${y}%; background-size:${size}; background-repeat:no-repeat; background-color:#000;`;
  }

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

    // Grid uniforme : tous les cards en format carré-landscape (aspect 4:3 via CSS)
    gridWrap.innerHTML = `<div class="cat-grid">${items.map((p) => cardHTML(p)).join('')}</div>`;

    // Reveal animation
    gridWrap.querySelectorAll('.cat-card').forEach((el) => {
      el.classList.add('r');
      if (window.__revealObserver) window.__revealObserver.observe(el);
    });
  }

  function cardHTML(p) {
    const css = focalToCSS(p.thumb_focal);
    const sub = p.card_subtitle || (p.client + ' · ' + p.year);
    return `
      <a href="./projets/${escapeHTML(p.slug)}.html"
         class="cat-card"
         data-category="${escapeHTML(p.category || '')}">
        <div class="cat-card-thumb" style="background-image:url('${escapeAttr(p.thumb)}'); ${css}"></div>
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
