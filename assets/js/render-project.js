/* ------------------------------------------------------------------
   render-project.js — Lit le slug dans l'URL, fetch /data/projects.json
   et populate la page projet (template v2 avec gallery + multi-vidéos).
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

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
  const videos = Array.isArray(p.videos) ? p.videos.filter(Boolean) : [];
  const mainVideoEl = document.querySelector('[data-proj="video_main"]');
  if (mainVideoEl && videos.length > 0) {
    mainVideoEl.src = 'https://www.youtube.com/embed/' + videos[0] + '?rel=0&modestbranding=1';
  }

  // ---------- SECONDARY VIDEOS (si > 1) ----------
  const secondaryWrap = document.querySelector('[data-proj="secondary_videos_section"]');
  const secondaryGrid = document.querySelector('[data-proj="secondary_videos_grid"]');
  if (secondaryWrap && secondaryGrid && videos.length > 1) {
    secondaryWrap.style.display = '';
    secondaryGrid.innerHTML = videos
      .slice(1)
      .map(
        (vid, i) =>
          `<div class="relative bg-ink overflow-hidden aspect-video r">
            <iframe src="https://www.youtube.com/embed/${escapeHTML(vid)}?rel=0&modestbranding=1"
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
  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  if (galSection && galGrid && images.length > 0) {
    galSection.style.display = '';
    galGrid.innerHTML = images
      .map(
        (img, i) =>
          `<div class="gallery-tile r ${i % 2 === 1 ? 'd1' : ''}" onclick="window.__openLightbox && window.__openLightbox('${escapeAttr(img)}')">
            <div class="gallery-img" style="background-image:url('${escapeAttr(img)}')"></div>
          </div>`
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
      p.stack_etalonnage && { label: 'Étalonnage', val: p.stack_etalonnage },
      p.stack_sound && { label: 'Sound', val: p.stack_sound },
    ].filter(Boolean);
    stackList.innerHTML = items
      .map((it) => `<li>· ${escapeHTML(it.label)} : ${escapeHTML(it.val)}</li>`)
      .join('');
  }

  // ---------- IMPACT ----------
  setText('impact_metric1', p.impact_metric1);
  setText('impact_label1', p.impact_label1);
  setText('impact_metric2', p.impact_metric2);
  setText('impact_label2', p.impact_label2);

  // Hide impact block 2 if empty
  const impact2 = document.querySelector('[data-proj="impact_block2"]');
  if (impact2 && (!p.impact_metric2 || p.impact_metric2 === '—' || p.impact_metric2 === '')) {
    impact2.style.display = 'none';
  }

  // ---------- PREV / NEXT ----------
  setAttr('prev_link', 'href', './' + prev.slug + '.html');
  setText('prev_title', prev.title);
  setAttr('next_link', 'href', './' + next.slug + '.html');
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
