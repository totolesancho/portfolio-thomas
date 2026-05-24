/* ------------------------------------------------------------------
   render.js — Charge le contenu depuis /data/*.json et l'injecte
   dans le DOM. Fallback : si le fetch échoue, le HTML statique reste.
   Décap CMS édite les JSON → un git push redéploie → contenu mis à jour.
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

  /* Helper : parse focal → string CSS prêt à coller en inline style */
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
    return `background-position:${x}% ${y}%; background-size:${size}; background-repeat:no-repeat;`;
  }

  /* Parse focal "X% Y%" / "X% Y% / Z%" / "center" → applique sur un élément DOM */
  function applyFocal(el, val) {
    if (!el) return;
    if (!val) { el.style.backgroundPosition = 'center'; el.style.backgroundSize = 'cover'; return; }
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
    el.style.backgroundPosition = `${x}% ${y}%`;
    let size = 'cover';
    if (zoomStr) { const z = parseFloat(zoomStr); if (!isNaN(z) && z > 0 && z !== 100) size = z + '%'; }
    el.style.backgroundSize = size;
    el.style.backgroundRepeat = 'no-repeat';
  }

  const fetchJSON = async (path) => {
    try {
      const r = await fetch(path, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      console.warn('[render] Could not load ' + path, e);
      return null;
    }
  };

  // Helper : set text by data-cms attribute
  const setText = (key, value) => {
    if (value == null) return;
    document.querySelectorAll(`[data-cms="${key}"]`).forEach((el) => {
      el.textContent = value;
    });
  };
  const setHTML = (key, value) => {
    if (value == null) return;
    document.querySelectorAll(`[data-cms="${key}"]`).forEach((el) => {
      el.innerHTML = value;
    });
  };
  const setAttr = (key, attr, value) => {
    if (value == null) return;
    document.querySelectorAll(`[data-cms="${key}"]`).forEach((el) => {
      el.setAttribute(attr, value);
    });
  };

  // ---------- LOAD ALL DATA ----------
  const [site, projects, testimonials] = await Promise.all([
    fetchJSON('./data/site.json'),
    fetchJSON('./data/projects.json'),
    fetchJSON('./data/testimonials.json'),
  ]);

  // ---------- SITE.JSON ----------
  if (site) {
    // Meta
    if (site.meta) {
      if (site.meta.title) document.title = site.meta.title;
      if (site.meta.description) {
        const md = document.querySelector('meta[name="description"]');
        if (md) md.setAttribute('content', site.meta.description);
      }
    }

    // Hero
    if (site.hero) {
      setText('hero.status_text', site.hero.status_text ? '↓ ' + site.hero.status_text : '');
      setText('hero.title_line1', site.hero.title_line1);
      setText('hero.title_line2', site.hero.title_line2);
      setText('hero.graffiti_tag', site.hero.graffiti_tag);
      setText('hero.tagline', site.hero.tagline ? '— ' + site.hero.tagline : '');
      setText('hero.cta_label', site.hero.cta_label);
      setAttr('hero.cta_link', 'href', site.hero.cta_href);
      setAttr('hero.photo', 'src', site.hero.photo);

      // Status pill visibility
      const statusPill = document.querySelector('[data-cms-block="hero.status"]');
      if (statusPill) {
        statusPill.style.display = site.hero.status_visible === false ? 'none' : '';
      }
    }

    // Marquee FORMATS
    if (Array.isArray(site.marquee_formats) && site.marquee_formats.length) {
      const target = document.querySelector('[data-cms-block="marquee_formats"]');
      if (target) {
        const items = site.marquee_formats;
        // double the list for seamless loop
        const doubled = [...items, ...items, ...items, ...items];
        target.innerHTML = doubled
          .map(
            (it, i) =>
              `<span class="mx-6">${escapeHTML(it)}</span><span class="mx-6 text-rec">✦</span>`
          )
          .join('');
      }
    }

    // Projets section labels
    if (site.projets_section) {
      setText('projets.kicker', site.projets_section.kicker);
      setText('projets.title_prefix', site.projets_section.title_prefix);
      setText('projets.title_suffix', site.projets_section.title_suffix);
    }

    // Marquee CLIENTS
    if (Array.isArray(site.marquee_clients) && site.marquee_clients.length) {
      const target = document.querySelector('[data-cms-block="marquee_clients"]');
      if (target) {
        const items = site.marquee_clients;
        const doubled = [...items, ...items, ...items, ...items];
        target.innerHTML = doubled
          .map(
            (it) =>
              `<span class="mx-10">${escapeHTML(it)}</span><span class="mx-10 text-rec">✦</span>`
          )
          .join('');
      }
    }

    // About
    if (site.about) {
      setText('about.kicker', site.about.kicker);
      setText('about.title_main', site.about.title_main);
      setText('about.title_script', site.about.title_script);
      setText('about.body', site.about.body);
      setText('about.stack', site.about.stack);
    }

    // Showreel
    if (site.showreel) {
      setText('showreel.kicker', site.showreel.kicker);
      setText('showreel.duration', site.showreel.duration);
      setAttr('showreel.video', 'src', site.showreel.video);
      setAttr('showreel.poster', 'poster', site.showreel.poster);
    }

    // CV vidéo
    if (site.cv_video) {
      setText('cv_video.kicker', site.cv_video.kicker);
      setText('cv_video.quote_main', site.cv_video.quote_main);
      setText('cv_video.quote_sub', site.cv_video.quote_sub);
      setAttr('cv_video.circle_photo', 'src', site.cv_video.circle_photo);
      // Si YouTube ID renseigné → on REMPLACE le slot par une iframe
      const slot = document.querySelector('[data-cms="cv_video.player_slot"]');
      if (slot && site.cv_video.youtube_id && site.cv_video.youtube_id.trim()) {
        const id = site.cv_video.youtube_id.trim();
        slot.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&color=white&cc_load_policy=0" class="absolute inset-0 w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      }
    }

    // Testimonials kicker
    setText('testimonials.kicker', site.testimonials_kicker);

    // Contact
    if (site.contact) {
      setText('contact.kicker', site.contact.kicker);
      setText('contact.title', site.contact.title);
      setText('contact.intro', site.contact.intro);
      setText('contact.intro_accent', site.contact.intro_accent);
      setText('contact.field_name_label', site.contact.field_name_label);
      setText('contact.field_email_label', site.contact.field_email_label);
      setText('contact.field_project_label', site.contact.field_project_label);
      setText('contact.field_message_label', site.contact.field_message_label);
      setText('contact.submit_label', site.contact.submit_label);
      // Form action
      if (site.contact.formspree_id) {
        const form = document.querySelector('[data-cms="contact.form"]');
        if (form) form.action = 'https://formspree.io/f/' + site.contact.formspree_id;
      }
    }

    // Footer
    if (site.footer) {
      setText('footer.tagline', site.footer.tagline);
      setText('footer.copyright', site.footer.copyright);
    }

    // Social
    if (site.social) {
      setAttr('social.instagram', 'href', site.social.instagram);
      setAttr('social.tiktok', 'href', site.social.tiktok);
      setAttr('social.linkedin', 'href', site.social.linkedin);
    }
  }

  // ---------- BENTO 4 — featured projects ----------
  if (projects && Array.isArray(projects.projects)) {
    // Get featured projects, sorted by featured_order (1, 2, 3, 4)
    const featured = projects.projects
      .filter((p) => p.featured === true)
      .sort((a, b) => (a.featured_order || 99) - (b.featured_order || 99))
      .slice(0, 4);

    // Fill slots 1, 2, 3, 4
    featured.forEach((p, i) => {
      const slot = document.querySelector(`[data-bento-slot="${i + 1}"]`);
      if (!slot) return;
      slot.href = `./projets/${p.slug}`;
      const thumbEl = slot.querySelector('.bento-thumb');
      if (thumbEl) {
        thumbEl.style.backgroundImage = `url('${p.thumb}')`;
        applyFocal(thumbEl, p.thumb_focal);
      }
      const catEl = slot.querySelector('.bento-cat');
      if (catEl) catEl.textContent = p.category || '';
      const subEl = slot.querySelector('.bento-sub');
      if (subEl) subEl.textContent = p.card_subtitle || (p.client + ' · ' + p.year);
    });

    // Re-arm reveal for bento cards
    document.querySelectorAll('[data-bento-slot]').forEach((el) => {
      if (window.__revealObserver) window.__revealObserver.observe(el);
    });
  }

  // ---------- TESTIMONIALS ----------
  if (testimonials && Array.isArray(testimonials.testimonials)) {
    const wrap = document.querySelector('[data-cms-block="testimonials_grid"]');
    if (wrap) {
      wrap.innerHTML = testimonials.testimonials
        .map((t, i) => {
          const styleMap = {
            ink: {
              fig: 'bg-ink text-cream',
              avatarBg: 'bg-cream/10 border border-cream/20',
              numCls: 'tag',
              numStyle: 'color:var(--cream); opacity:0.5',
              clientCls: 'tag',
              clientStyle: 'color:var(--cream)',
              roleCls: 'tag tag-dim',
              roleStyle: 'opacity:0.6',
            },
            rec: {
              fig: 'bg-rec text-cream',
              avatarBg: 'bg-cream/15 border border-cream/30',
              numCls: 'tag',
              numStyle: 'color:var(--cream); opacity:0.6',
              clientCls: 'tag',
              clientStyle: 'color:var(--cream)',
              roleCls: 'tag',
              roleStyle: 'color:var(--cream); opacity:0.7',
            },
            cream: {
              fig: 'bg-cream border border-line text-ink',
              avatarBg: 'bg-ink/5 border border-line',
              numCls: 'tag tag-dim',
              numStyle: '',
              clientCls: 'tag',
              clientStyle: '',
              roleCls: 'tag tag-dim',
              roleStyle: '',
            },
          };
          const s = styleMap[t.style] || styleMap.ink;
          const delay = i === 0 ? '' : i === 1 ? 'd1' : 'd2';
          // Avatar : si photo renseignée → image circulaire avec focal point, sinon emoji
          const focalCSS = t.photo ? focalToCSS(t.photo_focal || 'center') : '';
          const avatarInner = t.photo
            ? `<div class="w-full h-full" style="background-image:url('${escapeHTML(t.photo)}'); ${focalCSS} border-radius:9999px;"></div>`
            : `<span class="text-2xl">${escapeHTML(t.emoji || '')}</span>`;
          return `
            <figure class="aspect-square ${s.fig} p-7 md:p-9 flex flex-col justify-between r ${delay}"
                    style="border-radius:8px !important;">
              <div class="flex justify-between items-start">
                <div class="w-12 h-12 ${s.avatarBg} flex items-center justify-center overflow-hidden" style="border-radius:9999px !important;">${avatarInner}</div>
                <span class="${s.numCls}" style="${s.numStyle}">${escapeHTML(t.num || '')}</span>
              </div>
              <blockquote class="display text-xl md:text-2xl" style="line-height:1.15; letter-spacing:0.005em; font-feature-settings:'liga' 0;">
                &quot;${escapeHTML(t.quote)}&quot;
              </blockquote>
              <figcaption>
                <div class="${s.clientCls}" style="${s.clientStyle}; font-weight:600;">${escapeHTML(t.client)}</div>
                <div class="${s.roleCls} mt-1" style="${s.roleStyle}">${escapeHTML(t.role)}</div>
              </figcaption>
            </figure>`;
        })
        .join('');

      wrap.querySelectorAll('.r').forEach((el) => {
        if (window.__revealObserver) window.__revealObserver.observe(el);
      });
    }
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
})();
