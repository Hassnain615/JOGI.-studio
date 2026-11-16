/* ==========================================================================
   JOGI. Studio — main.js
   Vanilla JS + GSAP (ScrollTrigger, SplitText) + Lenis. No build step.

   Contents
   0. Where the content lives (content/*.json, edited from /admin)
   1. Helpers, environment flags & content loading
   2. Logo (studio vector, inlined so it can be drawn)
   3. Works grid + weave reveal + ripple hover
   4. Lightbox / case view
   5. Navigation
   6. Contact form (Netlify Forms)
   7. Smooth scroll (Lenis)
   8. Loader
   9. Hero sequence (scroll-scrubbed frames on canvas)
   10. Process (horizontal pinned timeline on desktop)
   11. Text reveals
   12. The continuous thread
   13. Footer unravel
   14. Custom cursor
   15. Boot
   ========================================================================== */

/* --------------------------------------------------------------------------
   0. Content lives in two data files, not in this script:
        content/works.json → the Selected Works (title, technique, year, use, image, alt, description, palette)
        content/site.json  → headings, about text, process steps, services, contact details, footer
   Edit them from the admin page (yoursite.com/admin) or by hand in a text editor.
   In headings, *stars* make a word italic and a new line makes a line break.
   The text written in index.html is only the fallback shown if those files fail to load.
   -------------------------------------------------------------------------- */
let WORKS = [];

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Helpers & environment flags
     ------------------------------------------------------------------------ */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DESKTOP_QUERY = '(min-width: 900px) and (min-height: 600px)';
  const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;
  // Animate only if GSAP actually loaded and the visitor has not asked for reduced motion.
  const ANIMATE = !!(window.gsap && window.ScrollTrigger) && !REDUCED;

  let lenis = null;
  const lockScroll = (lock) => {
    if (lenis) lock ? lenis.stop() : lenis.start();
    else document.body.style.overflow = lock ? 'hidden' : '';
  };

  /* ------------------------------------------------------------------------
     1b. Content — fetch content/*.json and pour it into the page before anything animates.
     ------------------------------------------------------------------------ */
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Headings: *word* → italic, new line → line break (everything else is escaped)
  const rich = (v) => esc(v).replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\r?\n/g, '<br>');
  const getJSON = (url) => fetch(url, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);

  // On Netlify, photos are resized on the fly by Netlify's image CDN, so a large upload from the
  // admin page is not sent to visitors at full size. Anywhere else (or if that fails) the original file is used.
  const LOCAL = !/^https?:$/.test(location.protocol) || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const sized = (path, w) => (LOCAL || !path || /^(https?:)?\/\//.test(path) || /\.svg$/i.test(path))
    ? path : `/.netlify/images?url=${encodeURIComponent('/' + path.replace(/^\//, ''))}&w=${w}&q=78`;
  document.addEventListener('error', (e) => { // resized version unavailable → fall back to the original file
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.dataset.raw && t.getAttribute('src') !== t.dataset.raw) t.src = t.dataset.raw;
  }, true);

  async function loadContent() {
    const [site, works] = await Promise.all([getJSON('content/site.json'), getJSON('content/works.json')]);
    if (works && Array.isArray(works.items)) WORKS = works.items.filter(w => w && w.image);
    if (site) { try { applySite(site); } catch (err) { console.warn('content/site.json could not be applied', err); } }
  }

  function applySite(c) {
    const text = (sel, v) => { if (v) $$(sel).forEach(el => { el.textContent = v; }); };
    const html = (sel, v) => { if (v) $$(sel).forEach(el => { el.innerHTML = rich(v); }); };
    const { seo = {}, hero = {}, about = {}, works = {}, process = {}, services = {}, contact = {}, footer = {} } = c;

    if (seo.title) document.title = seo.title;
    if (seo.description) { const m = $('meta[name="description"]'); if (m) m.content = seo.description; }

    text('#heroIntro .label', hero.label);
    text('.hero__sub', hero.sub);

    // About
    html('#about .section__title', about.title);
    text('.lede', about.lede);
    html('.quote p', about.quote);
    text('.quote footer', about.quote_caption);
    text('.about__portrait figcaption', about.portrait_caption);
    const portrait = $('.about__portrait img');
    if (portrait && about.portrait) { portrait.dataset.raw = about.portrait; portrait.src = sized(about.portrait, 1000); }
    if (portrait && about.portrait_alt) portrait.alt = about.portrait_alt;
    if (Array.isArray(about.paragraphs)) {
      $$('.about__story > p[data-reveal="fade"]').forEach(n => n.remove());
      $('.lede').insertAdjacentHTML('afterend', about.paragraphs.map(t => `<p data-reveal="fade">${esc(t)}</p>`).join(''));
    }
    if (Array.isArray(about.facts)) {
      $('.about__facts').innerHTML = about.facts.map(f => `<div><dt class="label">${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('');
    }

    // Works heading
    html('#works .section__title', works.title);
    text('#works .section__intro', works.intro);

    // Process — the little icons are reused in order; extra steps repeat the last icon
    html('#process .section__title', process.title);
    if (Array.isArray(process.steps) && process.steps.length) {
      const icons = $$('.step__icon').map(n => n.outerHTML);
      $('#processTrack').innerHTML = process.steps.map((st, i) => `
          <li class="step">
            <span class="step__num">${String(i + 1).padStart(2, '0')}</span>
            ${icons[Math.min(i, icons.length - 1)] || ''}
            <h3 class="step__title">${esc(st.title)}</h3>
            <p>${esc(st.text)}</p>
          </li>`).join('');
    }

    // Services (also fills the "Enquiry type" menu in the form)
    html('#services .section__title', services.title);
    if (Array.isArray(services.items) && services.items.length) {
      $('.services__list').innerHTML = services.items.map((it, i) => `
          <li class="service" data-reveal="fade">
            <span class="service__num label">${String(i + 1).padStart(2, '0')}</span>
            <h3 class="service__title">${esc(it.title)}</h3>
            <p>${esc(it.text)}</p>
          </li>`).join('');
      const select = $('#f-type');
      if (select) select.innerHTML = services.items.map(it => `<option>${esc(it.title)}</option>`).join('') + '<option>Something else</option>';
    }

    // Contact
    html('#contact .section__title', contact.title);
    text('.contact__details > p', contact.intro);
    if (contact.email) $$('a[href^="mailto:"]').forEach(a => {
      a.href = 'mailto:' + contact.email;
      if (a.textContent.includes('@')) a.textContent = contact.email;
    });
    if (contact.instagram_url) $$('a[href*="instagram.com"]').forEach(a => {
      a.href = contact.instagram_url;
      if (a.textContent.trim().startsWith('@') && contact.instagram_handle) a.textContent = contact.instagram_handle;
    });
    const phone = String(contact.whatsapp || '').replace(/\D/g, '');
    if (phone) $$('a[href*="wa.me/"]').forEach(a => { a.href = a.href.replace(/wa\.me\/\d*/, 'wa.me/' + phone); });

    // Footer
    text('.footer__base > p:first-child', footer.copyright);
    const credit = $('.footer__base p a');
    if (credit && footer.credit_name) credit.textContent = footer.credit_name;
    if (credit) { if (footer.credit_url) credit.href = footer.credit_url; else credit.removeAttribute('href'); }
  }

  /* ------------------------------------------------------------------------
     2. Logo — assets/svg/jogi-logo.svg (the studio's own vector file) is fetched
     and inlined so it can be recoloured (currentColor) and drawn on.
       data-logo="full" → whole lockup        data-logo="mark" → wordmark only (nav)
       data-draw        → also adds one outline per shape for the stroke-draw animation
     If the fetch fails (e.g. opened from file://) the <img> fallbacks in the HTML stay.
     ------------------------------------------------------------------------ */
  const LOGO_SRC = 'assets/svg/jogi-logo.svg';
  const LOGO_VIEW = { full: '60 60 705 387', mark: '72 72 680 191' };
  function loadLogo() {
    return fetch(LOGO_SRC).then(r => (r.ok ? r.text() : Promise.reject())).then(txt => {
      const m = txt.match(/\sd="([^"]+)"/);
      if (!m) return;
      const d = m[1];
      const shapes = d.split('M').filter(p => p.trim()).map(p => 'M' + p.trim()); // one outline per sub-path
      $$('[data-logo]').forEach(el => {
        const kind = el.dataset.logo === 'mark' ? 'mark' : 'full';
        const label = $('img', el) && $('img', el).alt;
        const strokes = el.hasAttribute('data-draw')
          ? `<g>${shapes.map(p => `<path class="logo-stroke" pathLength="1" d="${p}"/>`).join('')}</g>` : '';
        el.innerHTML = `<svg viewBox="${LOGO_VIEW[kind]}" focusable="false" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>` +
          `<path class="logo-fill" fill-rule="evenodd" d="${d}"/>${strokes}</svg>`;
      });
    }).catch(() => {});
  }

  // Hide / draw helpers for any pathLength="1" path
  const hidePaths = (paths) => gsap.set(paths, { strokeDasharray: '1 2', strokeDashoffset: 1.01 });
  // Outline draws itself, then the solid logo fades in over it
  function drawLogo(tl, scope, at) {
    const strokes = $$('.logo-stroke', scope), fill = $('.logo-fill', scope);
    if (!fill) return tl.fromTo(scope, { opacity: 0 }, { opacity: 1, duration: 1.2 }, at); // <img> fallback
    hidePaths(strokes);
    gsap.set(fill, { opacity: 0 });
    return tl.to(strokes, { strokeDashoffset: 0, duration: 1.5, ease: 'power2.inOut', stagger: { amount: 0.7 } }, at)
      .to(fill, { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, at + 1.25)
      .to(strokes, { opacity: 0, duration: 0.5 }, at + 1.9);
  }

  /* ------------------------------------------------------------------------
     3. Works grid + weave reveal + ripple hover
     ------------------------------------------------------------------------ */
  // Weave reveal: horizontal and vertical cover strips that retract alternately, like a loom.
  function addWeave(figure, n = 6) {
    const w = document.createElement('span');
    w.className = 'weave';
    w.setAttribute('aria-hidden', 'true');
    let html = '';
    for (let i = 0; i < n; i++) {
      const p = (i * 100 / n).toFixed(3), s = (100 / n + 0.5).toFixed(3);
      html += `<i class="weave__h" style="top:${p}%;height:${s}%"></i><i class="weave__v" style="left:${p}%;width:${s}%"></i>`;
    }
    w.innerHTML = html;
    figure.appendChild(w);
    return w;
  }
  function playWeave(w) {
    return gsap.timeline({ onComplete: () => w.remove() })
      .to($$('.weave__h', w), {
        scaleX: 0, duration: 1.15, ease: 'power3.inOut', stagger: 0.07,
        transformOrigin: i => (i % 2 ? '100% 50%' : '0% 50%')
      })
      .to($$('.weave__v', w), {
        scaleY: 0, duration: 1.15, ease: 'power3.inOut', stagger: 0.07,
        transformOrigin: i => (i % 2 ? '50% 100%' : '50% 0%')
      }, 0.45);
  }
  function weaveOnScroll(figure) {
    const w = addWeave(figure);
    ScrollTrigger.create({ trigger: figure, start: 'top 85%', once: true, onEnter: () => playWeave(w) });
  }

  function renderWorks() {
    const grid = $('#worksGrid');
    if (!WORKS.length) { grid.innerHTML = '<p class="works__empty">New work is on its way.</p>'; return; }
    grid.innerHTML = WORKS.map((w, i) => `
      <article class="work">
        <button type="button" class="work__open" data-index="${i}" aria-haspopup="dialog" aria-label="Open case view: ${esc(w.title)}">
          <figure class="work__figure">
            <img src="${esc(sized(w.image, 1200))}" data-raw="${esc(w.image)}" alt="${esc(w.alt || w.title)}" loading="lazy" decoding="async">
          </figure>
          <span class="work__meta">
            <span class="work__title">${esc(w.title)}</span>
            <span class="work__tech label">${esc(w.technique)}<br>${esc(w.year)}</span>
          </span>
        </button>
      </article>`).join('');

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('.work__open');
      if (btn) openLightbox(+btn.dataset.index);
    });
  }

  // Fabric-like ripple on hover (desktop + fine pointer only): an SVG displacement filter
  // is attached to the image just for the duration of the ripple, then removed.
  function initRipple() {
    if (!FINE_POINTER || !isDesktop()) return;
    const map = $('#rippleMap');
    let current = null;
    $$('.work__open').forEach(btn => {
      const img = $('img', btn);
      btn.addEventListener('mouseenter', () => {
        if (current && current !== img) current.style.filter = '';
        current = img;
        img.style.filter = 'url(#ripple)';
        gsap.fromTo(map, { attr: { scale: 0 } }, {
          attr: { scale: 28 }, duration: 0.55, ease: 'sine.inOut', yoyo: true, repeat: 1, overwrite: true,
          onComplete: () => { img.style.filter = ''; }
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     4. Lightbox / case view (native <dialog>: focus trap + Esc for free)
     ------------------------------------------------------------------------ */
  const lb = { el: null, index: 0 };
  function fillLightbox(i) {
    const w = WORKS[i];
    lb.index = i;
    const img = $('#lbImage');
    img.dataset.raw = w.image; img.src = sized(w.image, 2000); img.alt = w.alt || w.title || '';
    $('#lbCount').textContent = `${String(i + 1).padStart(2, '0')} / ${String(WORKS.length).padStart(2, '0')}`;
    $('#lbTitle').textContent = w.title;
    $('#lbTechnique').textContent = w.technique || '—';
    $('#lbYear').textContent = w.year || '—';
    $('#lbUse').textContent = w.use || '—';
    $('#lbDesc').textContent = w.description || '';
    $('#lbPalette').innerHTML = (w.palette || []).map(c => `<span style="background:${esc(c)}" title="${esc(c)}"></span>`).join('');
    if (ANIMATE) {
      $$('.weave', $('#lbFigure')).forEach(n => n.remove());
      playWeave(addWeave($('#lbFigure'), 7));
      gsap.fromTo($$('.lightbox__info > *'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, delay: 0.25 });
    }
  }
  function openLightbox(i) {
    fillLightbox(i);
    lb.el.showModal();
    lb.el.scrollTop = 0;
    lockScroll(true);
  }
  function stepLightbox(dir) { fillLightbox((lb.index + dir + WORKS.length) % WORKS.length); }
  function initLightbox() {
    lb.el = $('#lightbox');
    if (!lb.el.showModal) return; // very old browsers: cards simply don't open
    $('#lbClose').addEventListener('click', () => lb.el.close());
    $('#lbPrev').addEventListener('click', () => stepLightbox(-1));
    $('#lbNext').addEventListener('click', () => stepLightbox(1));
    lb.el.addEventListener('close', () => lockScroll(false));
    lb.el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  }

  /* ------------------------------------------------------------------------
     5. Navigation: mobile menu, hide-on-scroll-down, smooth anchors
     ------------------------------------------------------------------------ */
  function initNav() {
    const nav = $('#nav'), toggle = $('#navToggle');
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      if (open) nav.classList.remove('is-hidden'); // the full-screen menu lives inside the bar, so the bar must be in place
      toggle.setAttribute('aria-expanded', String(open));
      $('.nav__toggle-label', toggle).textContent = open ? 'Close' : 'Menu';
      lockScroll(open);
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });

    // Anchor links: close the menu, then glide to the target
    $$('a[href^="#"]').forEach(a => {
      if (a.hasAttribute('data-credit')) return;
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        const target = id === '#top' ? document.body : $(id);
        if (!target) return;
        if (nav.classList.contains('is-open')) setOpen(false);
        if (lenis) { e.preventDefault(); lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.8 }); }
      });
    });

    // Hide when scrolling down, show when scrolling up
    let last = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > window.innerHeight * 0.6);
      if (!nav.classList.contains('is-open')) nav.classList.toggle('is-hidden', y > last && y > window.innerHeight);
      last = y;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------------
     6. Contact form — Netlify Forms via fetch, so the visitor stays on the page.
     Without Netlify (e.g. opened locally) the request fails and we point to email.
     ------------------------------------------------------------------------ */
  function initForm() {
    const form = $('#enquiryForm'), status = $('#formStatus');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.className = 'form__status';
      status.textContent = 'Sending…';
      fetch(form.getAttribute('action') || '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(res => {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        status.textContent = 'Thank you — your enquiry is on its way. I’ll reply soon.';
      }).catch(() => {
        status.classList.add('is-error');
        status.textContent = 'Sorry, that didn’t send. Please email instead.';
      });
    });
  }

  /* ------------------------------------------------------------------------
     7. Smooth scroll (Lenis), driven by GSAP's ticker so ScrollTrigger stays in sync.
     Touch devices keep native scrolling (Lenis default) for best mobile performance.
     ------------------------------------------------------------------------ */
  function initLenis() {
    if (!window.Lenis) return;
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------------------
     8. Loader — threads draw across the screen, then weave into the logo.
     ------------------------------------------------------------------------ */
  function runLoader(onDone) {
    const loader = $('#loader'), svg = $('#loaderThreads');
    const W = window.innerWidth, H = window.innerHeight, mobile = W < 700;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    // Long, slightly slack threads crossing the screen in both directions (fewer on mobile)
    const hs = mobile ? [0.2, 0.5, 0.82] : [0.14, 0.33, 0.5, 0.68, 0.87];
    const vs = mobile ? [0.25, 0.75] : [0.12, 0.3, 0.7, 0.9];
    let d = '';
    hs.forEach((f, i) => { const y = H * f, s = (i % 2 ? 1 : -1) * 36; d += `<path pathLength="1" ${i === 1 ? 'class="is-accent"' : ''} d="M-20 ${y}C${W * 0.3} ${y + s} ${W * 0.65} ${y - s} ${W + 20} ${y}"/>`; });
    vs.forEach((f, i) => { const x = W * f, s = (i % 2 ? 1 : -1) * 30; d += `<path pathLength="1" d="M${x} -20C${x + s} ${H * 0.35} ${x - s} ${H * 0.7} ${x} ${H + 20}"/>`; });
    svg.innerHTML = d;

    const screenThreads = $$('path', svg);
    hidePaths(screenThreads);
    lockScroll(true);

    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        root.classList.remove('is-loading');
        lockScroll(false);
        onDone();
      }
    });
    tl.to(screenThreads, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.08 }, 0.1);
    drawLogo(tl, $('.loader__logo', loader), 0.7);
    tl.to(screenThreads, { opacity: 0, duration: 0.7, ease: 'power1.out' }, 2.4)
      // don't lift the curtain until the first hero frame is painted
      .add(() => { if (!seq.frames[0]) { tl.pause(); seq.first.then(() => tl.play()); } }, 3.0)
      .to(loader, { yPercent: -100, duration: 1.2, ease: 'expo.inOut' }, 3.05)
      .to('.hero__line > span', { yPercent: 0, duration: 1.4, ease: 'power4.out', stagger: 0.12 }, 3.6)
      .to('#heroIntro .label, #heroIntro .hero__sub', { opacity: 1, duration: 1.2, ease: 'power2.out' }, 4.0)
      .from(['#nav', '#heroCue'], { autoAlpha: 0, duration: 1, ease: 'power2.out' }, 3.8);
  }

  /* ------------------------------------------------------------------------
     9. Hero sequence — frames of the film (fibre → thread → yarn → weave → printed
     cloth) are painted to a canvas and scrubbed by scroll. Neighbouring frames are
     cross-faded, so 58 stills read as continuous motion at any scroll speed.

     Two sets, chosen by viewport shape:
       desktop — 16:9, 58 frames; the logo is printed into the last frames
       mobile  — square crop, 52 frames (portrait screens crop the sides, which would
                 cut the printed logo), so the logo is overlaid from the vector instead
     To replace the film: export new frames as f-001.webp … into both folders and
     update the counts below.
     ------------------------------------------------------------------------ */
  const SEQ_SETS = {
    desktop: { dir: 'assets/frames/desktop/f-', count: 58 },
    mobile: { dir: 'assets/frames/mobile/f-', count: 52 }
  };
  const seq = { mode: null, count: 0, frames: [], pos: 0, first: Promise.resolve(), canvas: null, ctx: null };
  const seqMode = () => (window.innerWidth / window.innerHeight < 1 ? 'mobile' : 'desktop');

  // Pick the frame set for the current viewport and start loading it (first frame first, then in small batches)
  function loadSequence() {
    const mode = seqMode();
    if (mode === seq.mode) return false;
    const set = SEQ_SETS[mode];
    seq.mode = mode; seq.count = set.count; seq.frames = new Array(set.count);
    const frames = seq.frames;
    const load = (i) => new Promise(done => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; if (frames === seq.frames && Math.abs(i - seq.pos) <= 1) renderSequence(); done(); };
      img.onerror = done;
      img.src = set.dir + String(i + 1).padStart(3, '0') + '.webp';
    });
    seq.first = load(ANIMATE ? 0 : set.count - 1); // the static version only ever needs the final still
    if (ANIMATE) seq.first.then(async () => {
      for (let i = 1; i < set.count && frames === seq.frames; i += 6) {
        await Promise.all([0, 1, 2, 3, 4, 5].map(k => (i + k < set.count ? load(i + k) : null)));
      }
    });
    return true;
  }

  function sizeSequence() {
    const c = seq.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    renderSequence();
  }

  function renderSequence() {
    const { ctx, canvas, frames } = seq;
    if (!ctx) return;
    const pos = Math.max(0, Math.min(seq.count - 1, seq.pos));
    const i = Math.floor(pos), t = pos - i;
    // nearest frame that has finished loading (so fast scrolling never shows a blank)
    let base = frames[i];
    for (let k = 1; !base && k < seq.count; k++) base = frames[i - k] || frames[i + k];
    if (!base) return;
    const paint = (img, alpha) => {
      const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight); // cover
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };
    paint(base, 1);
    if (t > 0.01 && frames[i] && frames[i + 1]) paint(frames[i + 1], t); // cross-fade toward the next frame
    ctx.globalAlpha = 1;
  }

  function initHero() {
    seq.canvas = $('#heroCanvas');
    seq.ctx = seq.canvas.getContext('2d');

    if (!ANIMATE) { // static: final still, with the overlay logo on portrait screens
      const still = () => {
        loadSequence();
        seq.pos = seq.count - 1;
        sizeSequence();
        $('#heroIntro').style.display = 'none';
        $('#heroPrint').style.cssText = seq.mode === 'mobile' ? 'visibility:visible;opacity:1' : '';
      };
      still();
      window.addEventListener('resize', debounce(still, 200));
      return;
    }

    loadSequence();
    sizeSequence();
    gsap.set('.hero__line > span', { yPercent: 112 });               // revealed by the loader timeline
    gsap.set('#heroIntro .label, #heroIntro .hero__sub', { opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.hero', start: 'top top',
        end: () => '+=' + window.innerHeight * (seq.mode === 'mobile' ? 2.2 : 3.2), // shorter pin on phones
        pin: true, scrub: seq.mode === 'mobile' ? 0.6 : 1.1, anticipatePin: 1, invalidateOnRefresh: true
      }
    });
    tl.to('#heroIntro', { autoAlpha: 0, y: -70, duration: 0.12, ease: 'power1.in' }, 0)
      .to('#heroCue', { autoAlpha: 0, duration: 0.06 }, 0)
      .to(seq, { pos: () => seq.count - 1, duration: 0.9, onUpdate: renderSequence }, 0)
      .fromTo('#heroPrint', { autoAlpha: 0, scale: 1.08 },
        { autoAlpha: () => (seq.mode === 'mobile' ? 1 : 0), scale: 1, duration: 0.14, ease: 'power2.out' }, 0.82)
      .to({}, { duration: 0.1 }); // hold on the finished cloth before the page moves on

    window.addEventListener('resize', debounce(() => { loadSequence(); sizeSequence(); }, 150));
  }

  /* ------------------------------------------------------------------------
     10. Process — horizontal pinned timeline on desktop, plain vertical on mobile.
     gsap.matchMedia sets up / tears down automatically across the breakpoint.
     ------------------------------------------------------------------------ */
  function initProcess() {
    const section = $('#process'), track = $('#processTrack');
    gsap.matchMedia().add(DESKTOP_QUERY, () => {
      section.classList.add('is-horizontal');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => '+=' + dist(),
          pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true
        }
      });
      return () => { section.classList.remove('is-horizontal'); gsap.set(track, { clearProps: 'transform' }); };
    });
  }

  /* ------------------------------------------------------------------------
     11. Text reveals
       data-reveal="lines" → headings rise line by line behind a soft mask
       data-reveal="label" → small labels fade in while letter-spacing tightens
       data-reveal="fade"  → body copy drifts up
     ------------------------------------------------------------------------ */
  function initReveals() {
    $$('[data-reveal="lines"]').forEach(el => {
      if (!window.SplitText) { el.dataset.reveal = 'fade'; return; }
      let played = false, tween = null;
      SplitText.create(el, {
        type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
        onSplit(self) {
          if (played) return;                       // re-split after resize: stay visible
          tween = gsap.from(self.lines, { yPercent: 112, duration: 1.4, ease: 'power4.out', stagger: 0.11, paused: true });
          return tween;
        }
      });
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => { played = true; if (tween) tween.play(); } });
    });

    $$('[data-reveal="label"]').forEach(el => {
      gsap.from(el, { opacity: 0, letterSpacing: '0.55em', duration: 1.5, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });

    $$('[data-reveal="fade"]').forEach(el => {
      gsap.from(el, { opacity: 0, y: 30, duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  /* ------------------------------------------------------------------------
     12. The continuous thread — one path per section, each starting where the
     previous one ended, so it reads as a single thread running down the page.
     In every section it stitches under the heading, loops at the end, then
     runs down the gutter. Paths are rebuilt from live layout on resize.
     Splitting it per section keeps each repaint small (good for mobile).
     ------------------------------------------------------------------------ */
  const THREAD_X = [0.5, 0.04, 0.96, 0.04, 0.96, 0.5]; // x (fraction of width) at each section boundary
  let threadTweens = [];

  function buildThread() {
    threadTweens.forEach(t => { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
    threadTweens = [];

    $$('[data-thread]').forEach((sec, i) => {
      let svg = $(':scope > .thread-seg', sec);
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'thread-seg');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<path pathLength="1"/>';
        sec.prepend(svg);
      }
      const w = sec.offsetWidth, h = sec.offsetHeight;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

      const x0 = THREAD_X[i] * w, x1 = THREAD_X[i + 1] * w;
      const dir = i % 2 === 0 ? -1 : 1;                 // direction of the stitch under the heading
      const gx = (dir > 0 ? 0.96 : 0.04) * w;           // gutter the thread runs down afterwards
      const k = w < 700 ? 0.7 : 1;                      // smaller loop on phones

      const sr = sec.getBoundingClientRect();
      const hr = $('[data-thread-loop]', sec).getBoundingClientRect();
      const L = Math.max(hr.left - sr.left, dir < 0 ? 60 * k : 16);
      const R = Math.min(hr.right - sr.left, w - (dir > 0 ? 60 * k : 16));
      const yB = hr.bottom - sr.top + 12;
      const a = dir > 0 ? L : R, b = dir > 0 ? R : L;   // stitch runs a → b

      let d = `M${x0} 0C${x0} ${yB * 0.6} ${a - dir * 70} ${yB} ${a} ${yB}`;          // down to the heading
      d += `Q${(a + b) / 2} ${yB + 12} ${b} ${yB}`;                                  // stitch under it
      d += `c${dir * 34 * k} ${-6 * k} ${dir * 44 * k} ${-46 * k} ${dir * 12 * k} ${-46 * k}`; // loop…
      d += `c${-dir * 26 * k} 0 ${-dir * 24 * k} ${40 * k} ${dir * 10 * k} ${52 * k}`;         // …and back
      const cx = b + dir * 22 * k, cy = yB + 6 * k;
      let y = cy + Math.min(260, h * 0.2);
      d += `C${cx + dir * 60} ${cy + 30} ${gx} ${cy + 40} ${gx} ${y}`;               // out to the gutter

      const toCentre = Math.abs(x1 - gx) > 1;           // last section: finish in the middle
      const endY = toCentre ? h - 150 : h;
      const step = 260, amp = Math.min(10, w * 0.012);
      let s = 1;
      while (y + step < endY) { d += `S${gx + s * amp} ${y + step / 2} ${gx} ${y + step}`; y += step; s = -s; } // gentle sway
      d += toCentre ? `C${gx} ${h - 30} ${x1} ${h - 110} ${x1} ${h}` : `L${gx} ${h}`;

      const path = $('path', svg);
      path.setAttribute('d', d);

      if (!ANIMATE) return; // static: the full thread is simply visible
      // A pinned section sits inside a pin-spacer whose height includes the pin distance
      const trigger = sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec;
      threadTweens.push(gsap.fromTo(path,
        { strokeDasharray: '1 2', strokeDashoffset: 1.01 },
        { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger, start: 'top 80%', end: 'bottom 80%', scrub: true } }
      ));
    });
  }

  /* ------------------------------------------------------------------------
     13. Footer — taut parallel threads loosen and unravel as you reach the bottom.
     Each wavy path is squashed flat (scaleY ≈ 0) while taut; scrolling releases it.
     ------------------------------------------------------------------------ */
  function initFooter() {
    const box = $('#footerThreads');
    const n = window.innerWidth < 700 ? 4 : 7;
    const mid = (n - 1) / 2, base = i => 100 + (i - mid) * 7; // each thread has its own baseline, 7 units apart
    let paths = '';
    for (let i = 0; i < n; i++) {
      const freq = 1.5 + (i % 3) * 0.75, amp = 30 + ((i * 23) % 45), phase = i * 1.3;
      const pts = [];
      for (let x = -20; x <= 1220; x += 20) pts.push(x + ' ' + (base(i) + amp * Math.sin(x / 1200 * Math.PI * 2 * freq + phase)).toFixed(1));
      paths += `<path ${i === 2 ? 'class="is-accent"' : ''} d="M${pts.join('L')}"/>`;
    }
    box.innerHTML = `<svg viewBox="0 0 1200 200" preserveAspectRatio="none">${paths}</svg>`;
    const els = $$('path', box);

    if (!ANIMATE) return; // static: threads are simply shown loose

    // Taut = each wave squashed flat onto its baseline; scrolling releases it (transform only)
    els.forEach((p, i) => {
      gsap.fromTo(p,
        { scaleY: 0.015, svgOrigin: '600 ' + base(i) },
        { scaleY: 1, svgOrigin: '600 ' + base(i), ease: 'power1.inOut',
          scrollTrigger: { trigger: '#footer', start: 'top 95%', end: 'bottom bottom', scrub: 1 } });
    });

    // The footer logo draws itself once
    const logoTl = gsap.timeline({ scrollTrigger: { trigger: '.footer__logo', start: 'top 90%', once: true } });
    drawLogo(logoTl, $('.footer__logo'), 0);
  }

  /* ------------------------------------------------------------------------
     14. Custom cursor (desktop, fine pointer only): a dot trailing a short thread.
     The loop sleeps when the pointer is still.
     ------------------------------------------------------------------------ */
  function initCursor() {
    if (!FINE_POINTER) return;
    root.classList.add('has-cursor');
    const cursor = $('#cursor'), dot = $('#cursorDot'), thread = $('#cursorThread');
    const N = 10, pts = Array.from({ length: N }, () => ({ x: -100, y: -100 }));
    const mouse = { x: -100, y: -100 };
    let started = false, running = false;

    const tick = () => {
      pts[0].x += (mouse.x - pts[0].x) * 0.5; pts[0].y += (mouse.y - pts[0].y) * 0.5;
      for (let i = 1; i < N; i++) { pts[i].x += (pts[i - 1].x - pts[i].x) * 0.36; pts[i].y += (pts[i - 1].y - pts[i].y) * 0.36; }
      dot.style.transform = `translate3d(${pts[0].x}px,${pts[0].y}px,0)`;
      let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 1; i < N - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        d += `Q${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
      }
      thread.setAttribute('d', d);
      const tail = pts[N - 1];
      if (Math.abs(tail.x - mouse.x) + Math.abs(tail.y - mouse.y) < 0.3) { gsap.ticker.remove(tick); running = false; }
    };

    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (!started) { pts.forEach(p => { p.x = mouse.x; p.y = mouse.y; }); started = true; }
      if (!running) { gsap.ticker.add(tick); running = true; }
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest ? e.target : null;
      if (!t) return;
      cursor.classList.toggle('is-active', !!t.closest('a, button, input, select, textarea, label'));
      cursor.classList.toggle('is-light', !!t.closest('.footer'));
    });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = 0; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = 1; });
  }

  /* ------------------------------------------------------------------------
     15. Boot
     ------------------------------------------------------------------------ */
  async function boot() {
    await Promise.all([loadLogo(), loadContent()]);
    renderWorks();
    initLightbox();
    initNav();
    initForm();

    // --- Static path: reduced motion, or GSAP failed to load. Everything is simply visible.
    if (!ANIMATE) {
      root.classList.remove('is-loading');
      root.classList.add('reduced-motion'); // reuse the static-layout CSS (also covers "GSAP failed to load")
      const loader = $('#loader'); if (loader) loader.remove();
      const drawStatic = () => { buildThread(); };
      initHero();
      initFooterStatic();
      drawStatic();
      window.addEventListener('load', drawStatic);
      window.addEventListener('resize', debounce(drawStatic, 250));
      return;
    }

    // --- Animated path
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    initLenis();
    initHero();
    initProcess();
    initReveals();
    $$('.work__figure, [data-weave]').forEach(weaveOnScroll);
    initRipple();
    initFooter();
    initCursor();
    buildThread();

    // Triggers were created out of page order (pins first), so sort before measuring.
    const refresh = () => { buildThread(); ScrollTrigger.sort(); ScrollTrigger.refresh(); };
    refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh); // heading metrics change with webfonts
    window.addEventListener('load', refresh);

    // Rebuild the thread when the width changes (ignores mobile URL-bar height changes)
    let lastW = window.innerWidth;
    window.addEventListener('resize', debounce(() => {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      refresh();
    }, 300));

    runLoader(() => ScrollTrigger.refresh());
  }

  function initFooterStatic() { initFooter(); } // initFooter draws loose, static threads when ANIMATE is false

  function debounce(fn, ms) { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
