/* ------------------------------------------------------------------
   burger.js — Menu mobile partagé (style Framer)
   Pour activer sur une page : ajoute juste
     <button id="burger-btn" class="md:hidden burger-btn" aria-label="Menu">
       <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
         <line class="burger-lines" x1="1" y1="2" x2="21" y2="2"/>
         <line class="burger-lines" x1="1" y1="12" x2="21" y2="12"/>
       </svg>
     </button>
   dans ton header, puis include <script defer src="/assets/js/burger.js"></script>.
   Ce fichier injecte l'overlay + le CSS automatiquement.
   ------------------------------------------------------------------ */

(function () {
  'use strict';

  // ---------- CSS injection ----------
  const css = `
    .burger-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 44px; height: 44px;
      background: transparent; color: var(--ink, #0e0e0e);
      border: 0; cursor: pointer;
      transition: opacity .2s;
      padding: 0;
    }
    .burger-btn:hover { opacity: 0.6; }
    .burger-btn svg { display: block; }
    .burger-btn .burger-lines { stroke: currentColor; stroke-width: 2; stroke-linecap: round; }

    /* Animation : slide-down + fade quand on ouvre */
    .burger-overlay {
      position: fixed; inset: 0; z-index: 100;
      background: var(--cream, #f4f1ea);
      display: flex;
      flex-direction: column;
      padding: 16px 24px 32px;   /* same py que le header pour alignement X ↔ ≡ */
      overflow-y: auto;
      opacity: 0;
      transform: translateY(-12px);
      pointer-events: none;
      transition: opacity .25s ease, transform .35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .burger-overlay.open {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    /* Animation staggered des liens du menu */
    .burger-overlay .burger-nav a,
    .burger-overlay .burger-socials,
    .burger-overlay .burger-cta-btn {
      opacity: 0;
      transform: translateY(8px);
      transition: opacity .35s ease, transform .35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .burger-overlay.open .burger-nav a:nth-child(1) { transition-delay: .12s; opacity: 1; transform: none; }
    .burger-overlay.open .burger-nav a:nth-child(2) { transition-delay: .17s; opacity: 1; transform: none; }
    .burger-overlay.open .burger-nav a:nth-child(3) { transition-delay: .22s; opacity: 1; transform: none; }
    .burger-overlay.open .burger-nav a:nth-child(4) { transition-delay: .27s; opacity: 1; transform: none; }
    .burger-overlay.open .burger-nav a:nth-child(5) { transition-delay: .32s; opacity: 1; transform: none; }
    .burger-overlay.open .burger-socials { transition-delay: .38s; opacity: 1; transform: none; }
    .burger-overlay.open .burger-cta-btn { transition-delay: .44s; opacity: 1; transform: none; }

    .burger-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 48px;
      /* Aligné exactement comme le header de la page (px-6 py-4 = 24px / 16px) */
    }
    .burger-logo {
      font-family: 'Bowlby One', sans-serif;
      font-size: 16px;        /* même taille que le header desktop md:text-lg ≈ 18px ; sur mobile c'est text-base = 16px */
      color: var(--ink, #0e0e0e); text-decoration: none;
      letter-spacing: -0.01em;
    }
    .burger-logo .text-rec { color: var(--rec, #ff3b1c); }
    .burger-close {
      width: 44px; height: 44px;
      background: transparent; color: var(--ink, #0e0e0e);
      border: 0; cursor: pointer;
      font-size: 22px; font-weight: 400;
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0;
    }
    .burger-close:hover { opacity: 0.6; }
    .burger-nav {
      display: flex; flex-direction: column; gap: 28px;
      flex: 1;
    }
    .burger-nav a {
      font-family: 'Inter', sans-serif; font-weight: 400;
      font-size: 22px;
      color: var(--ink, #0e0e0e);
      line-height: 1; text-decoration: none;
      transition: color .2s; text-align: left;
    }
    .burger-nav a:hover, .burger-nav a:active { color: var(--rec, #ff3b1c); }
    .burger-socials {
      display: flex; gap: 12px;
      margin-top: 16px; margin-bottom: 20px;
    }
    .burger-socials a {
      width: 44px; height: 44px;
      background: var(--cream, #f4f1ea);
      border: 1px solid rgba(14,14,14,.12);
      border-radius: 8px;
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--ink, #0e0e0e); text-decoration: none;
      transition: background .2s, color .2s;
    }
    .burger-socials a:hover { background: var(--ink, #0e0e0e); color: var(--cream, #f4f1ea); }
    .burger-socials a svg { width: 18px; height: 18px; }
    .burger-cta-btn {
      display: block; width: 100%;
      background: var(--rec, #ff3b1c); color: var(--cream, #f4f1ea);
      text-align: center; padding: 18px 24px;
      border-radius: 9999px;
      font-family: 'Inter', sans-serif; font-weight: 600;
      font-size: 17px; text-decoration: none;
      transition: background .2s;
    }
    .burger-cta-btn:hover { background: var(--ink, #0e0e0e); }
    /* Lock body scroll when burger open */
    body.burger-open { overflow: hidden; }

    /* Mobile : cache les barres rouges du haut pour éviter le saut visuel
       quand on ouvre le burger (le header gagne 16px de hauteur sinon). */
    @media (max-width: 768px) {
      .dashes { display: none !important; }
    }

    /* Sticky CTA mobile — bouton "Discutons" flottant bas-droite */
    .sticky-cta {
      display: none;
      position: fixed; bottom: 18px; right: 18px;
      z-index: 90;
      background: var(--rec, #ff3b1c); color: var(--cream, #f4f1ea);
      padding: 14px 22px;
      border-radius: 9999px;
      font-family: 'Inter', sans-serif; font-weight: 600;
      font-size: 14px; text-decoration: none;
      box-shadow: 0 8px 24px rgba(255,59,28,.35), 0 2px 6px rgba(0,0,0,.15);
      transition: transform .2s, box-shadow .2s;
      align-items: center; gap: 8px;
    }
    .sticky-cta:active { transform: scale(0.96); }
    @media (max-width: 768px) { .sticky-cta { display: inline-flex; } }
    body.burger-open .sticky-cta { display: none !important; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- Détermine si on est sur l'accueil ou une sous-page ----------
  // Les ancres (#cv-video, #about, etc.) doivent renvoyer à l'accueil si on
  // est sur une autre page, pas tenter de scroll sur la page courante.
  const path = window.location.pathname;
  const isHome = path === '/' || path === '/index.html' || path === '/index';
  const homePrefix = isHome ? '' : '/';
  const anchorTo = (anchor) => isHome ? anchor : (homePrefix + anchor);
  const linkProjets = isHome ? './projets' : '/projets';
  const linkHome = isHome ? './' : '/';

  // ---------- Overlay HTML ----------
  const overlayHTML = `
    <div class="burger-overlay" id="burger-overlay">
      <div class="burger-header">
        <a href="${linkHome}" class="burger-logo">THOMAS ETCHEVERRY<span class="text-rec">®</span></a>
        <button class="burger-close" id="burger-close" aria-label="Fermer">✕</button>
      </div>
      <nav class="burger-nav">
        <a href="${linkHome}">Accueil</a>
        <a href="${linkProjets}">Projets</a>
        <a href="${anchorTo('#cv-video')}">CV Vidéo</a>
        <a href="${anchorTo('#showreel')}">Showreel</a>
        <a href="${anchorTo('#about')}">À propos</a>
      </nav>
      <div class="burger-socials">
        <a data-cms="social.instagram" href="#" target="_blank" rel="noopener" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>
        </a>
        <a data-cms="social.tiktok" href="#" target="_blank" rel="noopener" aria-label="TikTok">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>
        </a>
        <a data-cms="social.linkedin" href="#" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8 17v-7H5.5v7H8zm-1.25-8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18 17v-4.5c0-2-1-3-2.5-3-1.2 0-1.85.6-2 .9V10H11v7h2.5v-4c0-.7.5-1.25 1.25-1.25S16 12.3 16 13v4h2z"/></svg>
        </a>
      </div>
      <a href="${anchorTo('#contact')}" class="burger-cta-btn">Discutons →</a>
    </div>
  `;

  // Si une overlay existe déjà dans la page, on ne fait rien (page legacy avec overlay inline)
  if (!document.getElementById('burger-overlay')) {
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
  }

  // ---------- Sticky CTA mobile (bouton flottant "Discutons") ----------
  if (!document.querySelector('.sticky-cta')) {
    const stickyHTML = `
      <a href="${anchorTo('#contact')}" class="sticky-cta" aria-label="Me contacter">
        <span>Discutons</span>
        <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="5" x2="12" y2="5"/><polyline points="8,1 12,5 8,9"/>
        </svg>
      </a>`;
    document.body.insertAdjacentHTML('beforeend', stickyHTML);
  }

  // ---------- Wiring : open / close ----------
  const btn = document.getElementById('burger-btn');
  const overlay = document.getElementById('burger-overlay');
  const closeBtn = document.getElementById('burger-close');
  if (!btn || !overlay || !closeBtn) return;

  const open = () => { overlay.classList.add('open'); document.body.classList.add('burger-open'); };
  const close = () => { overlay.classList.remove('open'); document.body.classList.remove('burger-open'); };
  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  // Click sur un lien du menu = close
  overlay.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
  // Echap pour fermer
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
