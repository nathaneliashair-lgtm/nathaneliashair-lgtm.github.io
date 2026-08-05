/*
 * Hydratation du contenu depuis content.json (fichier statique) + interactions.
 * Tout le texte est injecté via textContent (aucun innerHTML avec données) — anti-XSS.
 */
(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  // ------------------------------------------------------------- nav
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');

  function onScroll() {
    nav.classList.toggle('nav--solid', window.scrollY > 30);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('nav--open');
    burger.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav__mobile a').forEach((a) =>
    a.addEventListener('click', () => {
      nav.classList.remove('nav--open');
      burger.setAttribute('aria-expanded', 'false');
    })
  );

  // ------------------------------------------------------------- reveal
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          observer.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  function observeReveals(root) {
    (root || document)
      .querySelectorAll('.reveal:not(.is-visible), .reveal-img:not(.is-visible)')
      .forEach((el) => observer.observe(el));
  }
  observeReveals();

  // Parallax léger de la photo du hero (effet de profondeur discret)
  const heroImg = document.getElementById('heroImg');
  if (heroImg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      window.matchMedia('(min-width: 941px)').matches) {
    let raf = 0;
    window.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 14;
        const y = (e.clientY / window.innerHeight - 0.5) * 14;
        heroImg.style.transform = `scale(1.06) translate(${x}px, ${y}px)`;
        raf = 0;
      });
    }, { passive: true });
  }

  // ------------------------------------------------------------- helpers
  function get(obj, dotted) {
    return dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function bindContent(content) {
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const val = get(content, el.dataset.bind);
      if (typeof val === 'string' && val) el.textContent = val;
    });
    document.querySelectorAll('[data-bind-href]').forEach((el) => {
      const val = get(content, el.dataset.bindHref);
      if (typeof val === 'string' && /^https:\/\//.test(val)) el.href = val;
    });
    document.querySelectorAll('[data-bind-src]').forEach((el) => {
      const val = get(content, el.dataset.bindSrc);
      if (typeof val === 'string' && /^\/(img|uploads)\//.test(val)) el.src = val;
    });
    const desc = document.querySelector('[data-bind-attr="content:seo.description"]');
    if (desc && content.seo?.description) desc.setAttribute('content', content.seo.description);

    // téléphone
    const phone = content.links?.phone || '';
    if (/^\+?[0-9]{8,15}$/.test(phone)) {
      document.getElementById('phoneLink').href = 'tel:' + phone;
    }
    if (content.contact?.phoneLabel) {
      document.getElementById('phoneLabel').textContent = content.contact.phoneLabel;
    }
    if (content.contact?.address) {
      document.getElementById('addressItem').hidden = false;
      document.getElementById('addressLabel').textContent = content.contact.address;
    }

    // Instagram / Waze : afficher cartes + icônes footer uniquement si le lien existe
    const has = (v) => typeof v === 'string' && /^https:\/\//.test(v);
    const toggle = (id, show) => { const el = document.getElementById(id); if (el) el.hidden = !show; };
    toggle('instaItem', has(content.links?.instagram));
    toggle('footerInsta', has(content.links?.instagram));
    toggle('fbItem', has(content.links?.facebook));
    toggle('footerFb', has(content.links?.facebook));
    toggle('footerWaze', has(content.links?.waze));
    toggle('fabWaze', has(content.links?.waze));
  }

  // ------------------------------------------------------------- vidéo
  // Lecture à la demande : la vidéo n'est téléchargée qu'au clic (preload="none"),
  // puis on rend les contrôles natifs pour la pause / le son / le plein écran.
  const promo = document.getElementById('promoVideo');
  const promoPlay = document.getElementById('videoPlay');
  if (promo && promoPlay) {
    promoPlay.addEventListener('click', () => {
      promo.controls = true;
      const started = promo.play();
      if (started && typeof started.catch === 'function') started.catch(() => {});
      promoPlay.hidden = true;
    });
    promo.addEventListener('ended', () => {
      promo.currentTime = 0;
      promo.controls = false;
      promoPlay.hidden = false;
    });
  }

  // ------------------------------------------------------------- services
  function renderServices(items) {
    const grid = document.getElementById('servicesGrid');
    grid.textContent = '';
    grid.classList.toggle('services__menu--short', items.length <= 4);
    items.forEach((s, i) => {
      const row = document.createElement('article');
      row.className = 'menu-item reveal';
      row.style.transitionDelay = `${Math.min(i * 70, 420)}ms`;

      const head = document.createElement('div');
      head.className = 'menu-item__head';
      const name = document.createElement('h3');
      name.className = 'menu-item__name';
      name.textContent = s.name;
      const dots = document.createElement('span');
      dots.className = 'menu-item__dots';
      dots.setAttribute('aria-hidden', 'true');
      const price = document.createElement('span');
      price.className = 'menu-item__price';
      price.textContent = s.price;
      head.append(name, dots, price);

      const desc = document.createElement('p');
      desc.className = 'menu-item__desc';
      desc.textContent = s.desc;

      row.append(head, desc);
      grid.append(row);
    });
    observeReveals(grid);
  }

  // ------------------------------------------------------------- gallery
  let galleryItems = [];
  let lightboxIndex = 0;

  function renderGallery(items) {
    galleryItems = items;
    const grid = document.getElementById('galleryGrid');
    grid.textContent = '';
    items.forEach((g, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery__item reveal';
      btn.style.transitionDelay = `${Math.min((i % 3) * 80, 240)}ms`;
      btn.setAttribute('aria-label', g.alt || 'תמונה מהגלריה');

      const img = document.createElement('img');
      img.src = g.src;
      img.alt = g.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      btn.append(img);

      if (g.alt) {
        const cap = document.createElement('span');
        cap.className = 'gallery__cap';
        cap.textContent = g.alt;
        btn.append(cap);
      }

      btn.addEventListener('click', () => openLightbox(i));
      grid.append(btn);
    });
    observeReveals(grid);
  }

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  let lastFocus = null;

  function openLightbox(i) {
    lightboxIndex = i;
    lastFocus = document.activeElement;
    updateLightbox();
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('lightboxClose').focus();
  }
  function updateLightbox() {
    const item = galleryItems[lightboxIndex];
    if (!item) return;
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || '';
  }
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  function step(dir) {
    lightboxIndex = (lightboxIndex + dir + galleryItems.length) % galleryItems.length;
    updateLightbox();
  }

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => step(-1));
  document.getElementById('lightboxNext').addEventListener('click', () => step(1));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') step(-1); // RTL : flèche droite = précédent
    if (e.key === 'ArrowLeft') step(1);
  });

  // ------------------------------------------------------------- hours
  function renderHours(items) {
    const list = document.getElementById('hoursList');
    list.textContent = '';
    items.forEach((h) => {
      const row = document.createElement('div');
      row.className = 'reveal';
      const dt = document.createElement('dt');
      dt.textContent = h.day;
      const dd = document.createElement('dd');
      dd.textContent = h.time;
      row.append(dt, dd);
      list.append(row);
    });
    observeReveals(list);
  }

  // ------------------------------------------------------------- load
  fetch('content.json')
    .then((r) => r.json())
    .then((content) => {
      bindContent(content);
      renderServices(content.services?.items || []);
      renderGallery(content.gallery?.items || []);
      renderHours(content.hours?.items || []);
      if (content.seo?.title) document.title = content.seo.title;
    })
    .catch(() => {
      /* le HTML statique reste affiché */
    });
})();
