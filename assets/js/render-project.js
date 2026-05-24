/* ------------------------------------------------------------------
   render-project.js — Lit le slug dans l'URL, fetch /data/projects.json
   et populate la page projet (template v2 avec gallery + multi-vidéos).
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

  /* Parse focal point string : "X% Y%" / "X% Y% / Z%" / "center" / etc.
     Retourne un string CSS prêt à coller dans un style="" inline */
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

  const path = window.location.pathname;
  const match = path.match(/\/projets\/([^/]+?)(?:\.html?)?$/i);
  if (!match) return;
  const slug = match[1];
  if (slug === '_template' || slug === 'index') return;

  let projects = null;
  try {
    const r = await fetch('../data/projects.json', { cache: 'no-store' });
    if (r.ok) projects = await r.json();
  } catch (e) {
    console.warn('[render-project] fetch error', e);
    return;
  }
  if (!projects || !Array.isArray(projects.projects)) return;

  const idx = projects.projects.findIndex((p) => p.slug === slug);
  if (idx === -1) {
    console.warn('[render-project] no project for slug:', slug);
    return;
  }
  const p = projects.projects[idx];
  const next = projects.projects[(idx + 1) % projects.projects.length];
  const prev = projects.projects[(idx - 1 + projects.projects.length) % projects.projects.length];

  // ---------- META ----------
  document.title = p.title + ' — Thomas Etcheverry';
  const md = document.querySelector('meta[name="description"]');
  if (md && p.brief) md.setAttribute('content', p.brief);

  const setText = (key, value) => {
    if (value == null || value === '') return;
    document.querySelectorAll(`[data-proj="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  };
  const setAttr = (key, attr, value) => {
    if (value == null) return;
    document.querySelectorAll(`[data-proj="${key}"]`).forEach((el) => {
      el.setAttribute(attr, value);
    });
  };

  // ---------- HERO ----------
  setText('num', 'PROJET ' + p.num + ' / 10');
  setText('title', p.title);
  setText('client', p.client);
  setText('year', p.year);
  setText('format', p.format);
  setText('role', p.role);

  // ---------- MAIN VIDEO ----------
  // Decap peut sauver videos comme ['id1', 'id2'] (legacy) OU [{id:'id1'}, {id:'id2'}] (config actuelle)
  // On normalise pour gérer les 2 cas
  const videos = Array.isArray(p.videos)
    ? p.videos.map((v) => (typeof v === 'string' ? v : (v && v.id))).filter(Boolean)
    : [];
  const mainVideoEl = document.querySelector('[data-proj="video_main"]');
  if (mainVideoEl && videos.length > 0) {
    mainVideoEl.src = 'https://www.youtube-nocookie.com/embed/' + videos[0] + '?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white&cc_load_policy=0';
  }

  // ---------- SECONDARY VIDEOS (si > 1) ----------
  const secondaryWrap = document.querySelector('[data-proj="secondary_videos_section"]');
  const secondaryGrid = document.querySelector('[data-proj="secondary_videos_grid"]');
  if (secondaryWrap && secondaryGrid && videos.length > 1) {
    secondaryWrap.style.display = '';
    const secondaryCount = videos.length - 1;
    // S'il n'y a qu'1 seule vidéo secondaire → pleine largeur (même taille que la main).
    // Sinon → grille 2 colonnes (par défaut du template).
    if (secondaryCount === 1) {
      secondaryGrid.classList.remove('md:grid-cols-2');
      secondaryGrid.classList.add('md:grid-cols-1');
    } else {
      secondaryGrid.classList.remove('md:grid-cols-1');
      secondaryGrid.classList.add('md:grid-cols-2');
    }
    secondaryGrid.innerHTML = videos
      .slice(1)
      .map(
        (vid, i) =>
          `<div class="relative bg-ink overflow-hidden aspect-video r">
            <iframe src="https://www.youtube-nocookie.com/embed/${escapeHTML(vid)}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white&cc_load_policy=0"
                    class="absolute inset-0 w-full h-full" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen></iframe>
          </div>`
      )
      .join('');
    // Re-observe new .r elements
    secondaryGrid.querySelectorAll('.r').forEach((el) => {
      if (window.__revealObserver) window.__revealObserver.observe(el);
    });
  }

  // ---------- IMAGE GALLERY ----------
  const galSection = document.querySelector('[data-proj="gallery_section"]');
  const galGrid = document.querySelector('[data-proj="gallery_grid"]');
  // Idem pour images : peut être ['url'] (legacy) OU [{img:'url', focal:'X% Y% / Z%'}] (avec picker)
  const galleryItems = Array.isArray(p.images)
    ? p.images.map((im) => {
        if (typeof im === 'string') return { img: im, focal: 'center' };
        if (im && typeof im === 'object') return { img: im.img, focal: im.focal || 'center' };
        return null;
      }).filter((it) => it && it.img)
    : [];
  // Alias pour compat ancien code
  const images = galleryItems.map((it) => it.img);
  if (galSection && galGrid && galleryItems.length > 0) {
    galSection.style.display = '';
    galGrid.innerHTML = galleryItems
      .map(
        (it, i) => {
          const css = focalToCSS(it.focal);
          return `<div class="gallery-tile r ${i % 2 === 1 ? 'd1' : ''}" onclick="window.__openLightbox && window.__openLightbox('${escapeAttr(it.img)}')">
            <div class="gallery-img" style="background-image:url('${escapeAttr(it.img)}'); ${css}"></div>
          </div>`;
        }
      )
      .join('');
    galGrid.querySelectorAll('.r').forEach((el) => {
      if (window.__revealObserver) window.__revealObserver.observe(el);
    });
  }

  // ---------- BRIEF & APPROCHE ----------
  setText('brief', p.brief);
  setText('approche_1', p.approche_1);
  setText('approche_2', p.approche_2);

  // ---------- STACK ----------
  const stackList = document.querySelector('[data-proj="stack_list"]');
  if (stackList) {
    const items = [
      p.stack_camera && { label: 'Caméra', val: p.stack_camera },
      p.stack_optique && { label: 'Optique', val: p.stack_optique },
      p.stack_montage && { label: 'Montage', val: p.stack_montage },
      p.stack_sound && { label: 'Sound', val: p.stack_sound },
    ].filter(Boolean);
    stackList.innerHTML = items
      .map((it) => `<li style="display:flex;gap:10px;align-items:baseline"><span style="color:var(--rec);font-size:1.1em;line-height:1">•</span><span><strong>${escapeHTML(it.label)} :</strong> ${escapeHTML(it.val)}</span></li>`)
      .join('');
  }

  // ---------- IMPACT ----------
  const impactList = document.querySelector('[data-proj="impact_list"]');
  if (impactList) {
    const isEmpty = (v) => !v || v === '—' || String(v).trim() === '';
    const impacts = [
      (!isEmpty(p.impact_metric1) || !isEmpty(p.impact_label1)) && { metric: p.impact_metric1, label: p.impact_label1 },
      (!isEmpty(p.impact_metric2) || !isEmpty(p.impact_label2)) && { metric: p.impact_metric2, label: p.impact_label2 },
    ].filter(Boolean);
    if (impacts.length === 0) {
      impactList.innerHTML = '<li style="opacity:.6">—</li>';
    } else {
      impactList.innerHTML = impacts
        .map((it) => {
          const metric = isEmpty(it.metric) ? '' : `<strong>${escapeHTML(it.metric)}</strong>`;
          const label  = isEmpty(it.label)  ? '' : escapeHTML(it.label);
          const sep    = metric && label ? ' — ' : '';
          return `<li style="display:flex;gap:10px;align-items:baseline"><span style="color:var(--cream);opacity:.7;font-size:1.1em;line-height:1">•</span><span>${metric}${sep}${label}</span></li>`;
        })
        .join('');
    }
  }

  // ---------- PREV / NEXT ----------
  setAttr('prev_link', 'href', './' + prev.slug);
  setText('prev_title', prev.title);
  setAttr('next_link', 'href', './' + next.slug);
  setText('next_title', next.title);

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
