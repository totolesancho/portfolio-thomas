/* ------------------------------------------------------------------
   render-project.js — Sur chaque page /projets/<slug>.html, détecte
   le slug depuis l'URL, fetch /data/projects.json, et peuple la page.
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

  // Slug depuis l'URL : /projets/publicite-hiving.html → publicite-hiving
  // Supporte aussi /projets/publicite-hiving (sans .html) si cleanUrls activé
  const path = window.location.pathname;
  const match = path.match(/\/projets\/([^/]+?)(?:\.html?)?$/i);
  if (!match) {
    console.warn('[render-project] no slug detected in URL');
    return;
  }
  const slug = match[1];
  if (slug === '_template' || slug === 'index') return; // pas de render sur le template

  let projects = null;
  let site = null;
  try {
    const [pRes, sRes] = await Promise.all([
      fetch('../data/projects.json', { cache: 'no-store' }),
      fetch('../data/site.json', { cache: 'no-store' }),
    ]);
    if (pRes.ok) projects = await pRes.json();
    if (sRes.ok) site = await sRes.json();
  } catch (e) {
    console.warn('[render-project] fetch error', e);
    return;
  }
  if (!projects || !Array.isArray(projects.projects)) return;

  const idx = projects.projects.findIndex((p) => p.slug === slug);
  if (idx === -1) {
    console.warn('[render-project] no project found for slug:', slug);
    return;
  }
  const p = projects.projects[idx];
  const next = projects.projects[(idx + 1) % projects.projects.length];
  const prev = projects.projects[(idx - 1 + projects.projects.length) % projects.projects.length];

  // ---------- META ----------
  document.title = p.title + ' — Thomas Etcheverry';
  const md = document.querySelector('meta[name="description"]');
  if (md && p.brief) md.setAttribute('content', p.brief);

  // ---------- HELPERS ----------
  const setText = (key, value) => {
    if (value == null) return;
    document.querySelectorAll(`[data-proj="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  };
  const setHTML = (key, value) => {
    if (value == null) return;
    document.querySelectorAll(`[data-proj="${key}"]`).forEach((el) => {
      el.innerHTML = value;
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

  // ---------- VIDEO EMBEDS ----------
  const v1 = document.querySelector('[data-proj="video1"]');
  if (v1 && p.youtube_id) {
    v1.src = 'https://www.youtube.com/embed/' + p.youtube_id + '?rel=0&modestbranding=1';
  }
  const v2Wrap = document.querySelector('[data-proj="video2_wrap"]');
  const v2 = document.querySelector('[data-proj="video2"]');
  if (p.youtube_id_2 && v2) {
    v2.src = 'https://www.youtube.com/embed/' + p.youtube_id_2 + '?rel=0&modestbranding=1';
    if (v2Wrap) v2Wrap.style.display = '';
  } else if (v2Wrap) {
    v2Wrap.style.display = 'none';
  }

  // ---------- CASE STUDY ----------
  setText('brief', p.brief);
  setText('production_year', p.year);
  setText('approche_1', p.approche_1);
  setText('approche_2', p.approche_2);

  // Stack list
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

  // Impact
  setText('impact_metric1', p.impact_metric1);
  setText('impact_label1', p.impact_label1);
  setText('impact_metric2', p.impact_metric2);
  setText('impact_label2', p.impact_label2);

  // ---------- PREV / NEXT NAV ----------
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
})();
