/* ------------------------------------------------------------------
   render.js — Charge le contenu depuis /data/*.json et l'injecte
   dans le DOM. Fallback : si le fetch échoue, le HTML statique reste.
   Décap CMS édite les JSON → un git push redéploie → contenu mis à jour.
   ------------------------------------------------------------------ */

(async function () {
  'use strict';

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
      slot.href = `./projets/${p.slug}.html`;
      const thumbEl = slot.querySelector('.bento-thumb');
      if (thumbEl) {
        thumbEl.style.backgroundImage = `url('${p.thumb}')`;
        thumbEl.style.backgroundPosition = p.thumb_focal || 'center';
      }
      const catEl = slot.querySelector('.bento-cat');
      if (catEl) catEl.textContent = p.category || '';
      const titleEl = slot.querySelector('.bento-title');
      if (titleEl) titleEl.textContent = p.title;
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
          return `
            <figure class="aspect-square ${s.fig} p-7 md:p-9 flex flex-col justify-between r ${delay}">
              <div class="flex justify-between items-start">
                <div class="w-12 h-12 ${s.avatarBg} flex items-center justify-center text-2xl">${escapeHTML(t.emoji || '')}</div>
                <span class="${s.numCls}" style="${s.numStyle}">${escapeHTML(t.num || '')}</span>
              </div>
              <blockquote class="display text-xl md:text-2xl" style="line-height:1.15; letter-spacing:0.005em; font-feature-settings:'liga' 0;">
                &quot;${escapeHTML(t.quote)}&quot;
              </blockquote>
              <figcaption>
                <div class="${s.clientCls}" style="${s.clientStyle}">${escapeHTML(t.client)}</div>
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
