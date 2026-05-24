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

  // ---------- VIDEO HELPERS (YouTube + TikTok) ----------
  // Decap peut sauver videos comme ['id1', 'id2'] (legacy) OU [{id:'id1'}, {id:'id2'}] (config actuelle)
  const videos = Array.isArray(p.videos)
    ? p.videos.map((v) => (typeof v === 'string' ? v : (v && v.id))).filter(Boolean)
    : [];

  // Détecte plateforme + extrait ID depuis ID brut OU URL complète
  function parseVideo(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    // TikTok URL : extraire l'ID de /video/<id>
    const tt = s.match(/tiktok\.com\/.*?\/video\/(\d+)/i);
    if (tt) return { kind: 'tiktok', id: tt[1] };
    // TikTok URL avec format différent (vm.tiktok.com/XXX) — non supporté en embed direct, on garde le link
    if (/tiktok\.com/i.test(s)) return { kind: 'tiktok_link', url: s };
    // YouTube URL : extraire l'ID
    const yt = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) return { kind: 'youtube', id: yt[1] };
    // Sinon : on suppose YouTube ID brut (11 chars typique)
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { kind: 'youtube', id: s };
    // ID numérique long → TikTok ID brut
    if (/^\d{15,}$/.test(s)) return { kind: 'tiktok', id: s };
    // Fallback : YouTube
    return { kind: 'youtube', id: s };
  }

  function videoEmbedHTML(raw, extraClass) {
    const v = parseVideo(raw);
    if (!v) return '';
    if (v.kind === 'youtube') {
      return `<iframe src="https://www.youtube-nocookie.com/embed/${escapeHTML(v.id)}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white&cc_load_policy=0"
                class="absolute inset-0 w-full h-full ${extraClass||''}" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen></iframe>`;
    }
    if (v.kind === 'tiktok') {
      // TikTok official embed iframe
      return `<iframe src="https://www.tiktok.com/embed/v2/${escapeHTML(v.id)}"
                class="absolute inset-0 w-full h-full ${extraClass||''}" frameborder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen></iframe>`;
    }
    return '';
  }

  // ---------- MAIN VIDEO ----------
  const mainVideoEl = document.querySelector('[data-proj="video_main"]');
  if (mainVideoEl && videos.length > 0) {
    const v = parseVideo(videos[0]);
    if (v && v.kind === 'youtube') {
      mainVideoEl.src = 'https://www.youtube-nocookie.com/embed/' + v.id + '?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white&cc_load_policy=0';
    } else if (v && v.kind === 'tiktok') {
      // Remplace l'iframe YouTube par une iframe TikTok dans le même container
      mainVideoEl.src = 'https://www.tiktok.com/embed/v2/' + v.id;
    }
  }

  // ---------- SECONDARY VIDEOS (si > 1) ----------
  const secondaryWrap = document.querySelector('[data-proj="secondary_videos_section"]');
  const secondaryGrid = document.querySelector('[data-proj="secondary_videos_grid"]');
  if (secondaryWrap && secondaryGrid && videos.length > 1) {
    secondaryWrap.style.display = '';
    const secondaryCount = videos.length - 1;
    // 3 layouts :
    // - "full" (override projet) → 1 col toujours, chaque vidéo pleine largeur
    // - secondaryCount === 1 → 1 col (même taille que main)
    // - sinon → 2 cols (par défaut)
    const layout = (p.secondary_videos_layout || 'auto').toLowerCase();
    const useFull = layout === 'full' || secondaryCount === 1;
    if (useFull) {
      secondaryGrid.classList.remove('md:grid-cols-2');
      secondaryGrid.classList.add('md:grid-cols-1');
    } else {
      secondaryGrid.classList.remove('md:grid-cols-1');
      secondaryGrid.classList.add('md:grid-cols-2');
    }
    secondaryGrid.innerHTML = videos
      .slice(1)
      .map((vid) => `<div class="relative bg-ink overflow-hidden aspect-video r">${videoEmbedHTML(vid)}</div>`)
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
  const impactSection = document.querySelector('[data-proj="impact_block"]');
  const impactList = document.querySelector('[data-proj="impact_list"]');
  if (impactList) {
    const isEmpty = (v) => !v || v === '—' || String(v).trim() === '';
    // Nouveau format : impacts: [string] OU [{text}]  (priorité)
    let bullets = [];
    if (Array.isArray(p.impacts) && p.impacts.length) {
      bullets = p.impacts
        .map((it) => typeof it === 'string' ? it : (it && it.text))
        .filter((s) => !isEmpty(s));
    }
    // Fallback legacy : metric1/label1 + metric2/label2
    if (bullets.length === 0) {
      const legacy = [
        (!isEmpty(p.impact_metric1) || !isEmpty(p.impact_label1)) && { metric: p.impact_metric1, label: p.impact_label1 },
        (!isEmpty(p.impact_metric2) || !isEmpty(p.impact_label2)) && { metric: p.impact_metric2, label: p.impact_label2 },
      ].filter(Boolean);
      bullets = legacy.map(({ metric, label }) => {
        const m = isEmpty(metric) ? '' : metric;
        const l = isEmpty(label)  ? '' : label;
        return m && l ? `${m} — ${l}` : (m || l);
      });
    }
    if (bullets.length === 0) {
      // Cache le bloc impact si rien à afficher
      if (impactSection) impactSection.style.display = 'none';
    } else {
      impactList.innerHTML = bullets
        .map((txt) => `<li style="display:flex;gap:10px;align-items:baseline"><span style="color:var(--cream);opacity:.7;font-size:1.1em;line-height:1">•</span><span>${escapeHTML(txt)}</span></li>`)
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
