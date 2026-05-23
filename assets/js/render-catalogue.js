/* ------------------------------------------------------------------
   render-catalogue.js — Rendu de la page projets.html :
   - Filter chips par catégorie (TOUS / PUB / REEL / AFTERMOVIE / ...)
   - Bento grid avec ratios alternés (style SÔM)
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

  let projects = null;
  try {
    const r = await fetch('./data/projects.json', { cache: 'no-store' });
    if (r.ok) projects = await r.json();
  } catch (e) { console.warn('[catalogue] fetch fail', e); return; }
  if (!projects || !Array.isArray(projects.projects)) return;

  const items = projects.projects;
  const CATS = ['TOUS', 'PUB', 'REEL', 'AFTERMOVIE', 'SHOWREEL', 'DOCU', 'CORPO'];

  // ---------- FILTER BAR ----------
  const filterBar = document.querySelector('[data-cat-block="filter_bar"]');
  if (filterBar) {
    // Count per category
    const counts = {};
    items.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    counts.TOUS = items.length;

    filterBar.innerHTML = CATS
      .filter((c) => c === 'TOUS' || counts[c] > 0)
      .map(
        (c) =>
          `<button class="filter-chip${c === 'TOUS' ? ' active' : ''}" data-cat="${c}">${c}<span class="count">${counts[c] || 0}</span></button>`
      )
      .join('');
  }

  // ---------- BENTO SHAPE PATTERN ----------
  // Pattern de 6 cases (puis répété) : hero(8) + tall(4), wide(8) + small(4), medium(6) + medium(6)
  // Donne un mix harmonieux 16:9, 9:16, 4:3
  const SHAPES = ['hero', 'tall', 'wide', 'small', 'medium', 'medium'];

  // ---------- CATALOGUE GRID ----------
  const grid = document.querySelector('[data-cat-block="catalogue_grid"]');
  if (grid) {
    grid.innerHTML = items
      .map((p, i) => {
        const shape = SHAPES[i % SHAPES.length];
        const focal = p.thumb_focal || 'center';
        return `
          <a href="./projets/${escapeHTML(p.slug)}.html"
             class="cat-card r"
             data-shape="${shape}"
             data-category="${escapeHTML(p.category || '')}">
            <div class="cat-card-thumb" style="background-image:url('${escapeAttr(p.thumb)}'); background-position: ${escapeAttr(focal)};"></div>
            <div class="cat-card-veil"></div>
            <span class="cat-card-arrow">↗</span>
            <div class="cat-card-meta">
              <span class="cat-card-cat">${escapeHTML(p.category || '')}</span>
              <div class="cat-card-title">${escapeHTML(p.title)}</div>
              <div class="cat-card-sub">${escapeHTML(p.card_subtitle || (p.client + ' · ' + p.year))}</div>
            </div>
          </a>`;
      })
      .join('');

    // Reveal observer
    grid.querySelectorAll('.r').forEach((el) => {
      if (window.__revealObserver) window.__revealObserver.observe(el);
    });
  }

  // ---------- FILTER LOGIC ----------
  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');

      let visibleCount = 0;
      document.querySelectorAll('.cat-card').forEach((card) => {
        const cardCat = card.dataset.category;
        if (cat === 'TOUS' || cardCat === cat) {
          card.classList.remove('is-hidden');
          visibleCount++;
        } else {
          card.classList.add('is-hidden');
        }
      });

      // Empty state
      const existing = grid.querySelector('.empty-state');
      if (existing) existing.remove();
      if (visibleCount === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = '— Aucun projet dans cette catégorie pour l\'instant —';
        grid.appendChild(empty);
      }

      // Smooth scroll au top de la grille
      const top = grid.getBoundingClientRect().top + window.scrollY - 100;
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
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/'/g, '%27').replace(/"/g, '%22');
  }
})();
