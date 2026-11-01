/* ==========================================================================
   Violette Beauty Studio — інтерактив і анімації
   Модулі: утиліти → Lenis → split text → прелоадер і hero → шапка й меню →
   якорі → reveal/параллакс/лічильники → послуги → портфоліо і лайтбокс →
   онлайн-запис → відгуки → FAQ → курсор і магніт → дрібниці
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Утиліти ---------- */
  const root = document.documentElement;
  root.classList.add('js-ready');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motion = hasGsap && !prefersReduced;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (!motion) {
    root.classList.remove('motion');
    root.classList.add('reduced-motion');
  }
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.Flip) gsap.registerPlugin(Flip);
  }

  const headerOffset = () => ($('[data-header]')?.offsetHeight || 0) - 8;

  let refreshTimer;
  const refreshScroll = () => {
    if (!hasGsap) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 120);
  };

  /* ---------- Lenis: плавний скрол ---------- */
  let lenis = null;

  function initLenis() {
    if (!motion || typeof window.Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  let lockCount = 0;
  const scrollLock = {
    lock() {
      lockCount += 1;
      if (lenis) lenis.stop();
      else document.body.style.overflow = 'hidden';
    },
    unlock() {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount) return;
      if (lenis) lenis.start();
      else document.body.style.overflow = '';
    },
  };

  function scrollToTarget(target, immediate = false) {
    if (!target) return;
    const isTop = target.id === 'top';
    if (lenis) {
      lenis.scrollTo(isTop ? 0 : target, { offset: isTop ? 0 : -headerOffset(), duration: 1.4, immediate });
    } else {
      const y = isTop ? 0 : target.getBoundingClientRect().top + window.scrollY - headerOffset();
      window.scrollTo({ top: y, behavior: motion && !immediate ? 'smooth' : 'auto' });
    }
  }

  /* ---------- Split text: слова / літери в масках ---------- */
  function splitText(el, mode = 'words') {
    const label = el.textContent.replace(/\s+/g, ' ').trim();

    const process = (node, out) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              out.appendChild(document.createTextNode(' '));
              return;
            }
            const word = document.createElement('span');
            word.className = 'split-word';
            const pieces = mode === 'chars' ? Array.from(part) : [part];
            pieces.forEach((piece) => {
              const inner = document.createElement('span');
              inner.className = 'split-inner';
              inner.textContent = piece;
              word.appendChild(inner);
            });
            out.appendChild(word);
          });
        } else if (child.nodeName === 'BR') {
          out.appendChild(document.createElement('br'));
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const clone = child.cloneNode(false);
          process(child, clone);
          out.appendChild(clone);
        }
      });
    };

    const frag = document.createDocumentFragment();
    process(el, frag);
    el.textContent = '';
    el.appendChild(frag);
    // Скрінрідер читає цілий текст, а не окремі літери
    $$('.split-word', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    el.appendChild(Object.assign(document.createElement('span'), { className: 'sr-only', textContent: label }));
    el.classList.add('is-split');
    return $$('.split-inner', el);
  }

  function initSplitHeadings() {
    if (!motion) return;
    $$('[data-split="words"]').forEach((el) => {
      const words = splitText(el, 'words');
      gsap.set(words, { yPercent: 115, rotate: 5, transformOrigin: '0% 100%' });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.15, stagger: 0.07, ease: 'power4.out' }),
      });
    });
  }

  /* ---------- Прелоадер ----------
     Анімації прелоадера і появи hero — у CSS (стартують до завантаження JS).
     Тут лише блокуємо скрол, поки прелоадер на екрані, і прибираємо його з DOM. */
  function runPreloader() {
    const pre = $('.preloader');
    if (!pre) return;
    const anims = pre.getAnimations ? pre.getAnimations() : [];
    if (prefersReduced || !anims.length || anims.every((a) => a.playState === 'finished')) {
      pre.remove();
      return;
    }
    scrollLock.lock();
    let removed = false;
    const done = () => {
      if (removed) return;
      removed = true;
      pre.remove();
      scrollLock.unlock();
    };
    Promise.all(anims.map((a) => a.finished)).then(done, done);
    setTimeout(done, 3000);
  }

  function initHeroVideo() {
    const video = $('.hero__video');
    if (!video || prefersReduced) return;
    const conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;

    const src = window.innerWidth < 1024 ? video.dataset.srcSm : video.dataset.src;
    video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });

    const start = () => {
      video.src = src;
      video.load();
      video.play()?.catch(() => {});
    };
    if (document.readyState === 'complete') setTimeout(start, 150);
    else window.addEventListener('load', () => setTimeout(start, 150), { once: true });

    // Пауза, коли hero поза екраном
    new IntersectionObserver(([entry]) => {
      if (!video.src) return;
      if (entry.isIntersecting) video.play()?.catch(() => {});
      else video.pause();
    }).observe(video);

    if (motion) {
      gsap.to('.hero__media', {
        yPercent: 18,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero__content', {
        yPercent: -12,
        opacity: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'center center', end: 'bottom top', scrub: true },
      });
    }
  }

  /* ---------- Шапка ---------- */
  let menuOpen = false;

  function initHeader() {
    const header = $('[data-header]');
    const toTop = $('[data-to-top]');
    let lastY = window.scrollY;
    let overForm = false;

    // Кнопка «нагору» не повинна перекривати кнопки форми запису
    const card = $('.booking__card');
    if (card) {
      new IntersectionObserver(([entry]) => {
        overForm = entry.isIntersecting;
        update(lastY);
      }).observe(card);
    }

    const update = (y) => {
      header.classList.toggle('is-scrolled', y > 40);
      const goingDown = y > lastY + 2;
      const goingUp = y < lastY - 2;
      if (!menuOpen && goingDown && y > window.innerHeight * 0.8) header.classList.add('is-hidden');
      else if (goingUp || y < 200) header.classList.remove('is-hidden');
      toTop?.classList.toggle('is-visible', y > window.innerHeight * 1.2 && !overForm);
      lastY = y;
    };

    if (lenis) lenis.on('scroll', ({ scroll }) => update(scroll));
    else window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
    update(window.scrollY);

    // Неможливо сфокусуватися на прихованій шапці
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

    toTop?.addEventListener('click', () => scrollToTarget($('#top')));

    // Активний пункт меню
    const links = $$('.nav__link');
    const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        map.get(entry.target.id)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, id) => {
      const s = document.getElementById(id);
      if (s) io.observe(s);
    });
  }

  /* ---------- Мобільне меню ---------- */
  function initMenu() {
    const burger = $('.burger');
    const menu = $('#mobile-menu');
    const header = $('[data-header]');
    const outside = [$('main'), $('.footer')];
    if (!burger || !menu) return;

    const setOpen = (state, { returnFocus = true } = {}) => {
      if (state === menuOpen) return;
      menuOpen = state;
      burger.setAttribute('aria-expanded', String(state));
      burger.setAttribute('aria-label', state ? 'Закрити меню' : 'Відкрити меню');
      menu.classList.toggle('is-open', state);
      menu.setAttribute('aria-hidden', String(!state));
      document.body.classList.toggle('menu-open', state);
      outside.forEach((el) => el && (el.inert = state));
      if (state) {
        header.classList.remove('is-hidden');
        scrollLock.lock();
        setTimeout(() => $('.mobile-menu__link', menu)?.focus({ preventScroll: true }), 350);
      } else {
        scrollLock.unlock();
        if (returnFocus) burger.focus({ preventScroll: true });
      }
    };

    burger.addEventListener('click', () => setOpen(!menuOpen));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) setOpen(false);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false, { returnFocus: false });
    });

    initMenu.close = () => setOpen(false, { returnFocus: false });
  }

  /* ---------- Якірні посилання ---------- */
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();

      const wasOpen = menuOpen;
      if (wasOpen) initMenu.close?.();
      // Після закриття меню чекаємо, поки Lenis знову запуститься
      setTimeout(() => scrollToTarget(target), wasOpen ? 60 : 0);

      if (link.classList.contains('skip-link') || id === '#main') {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  }

  /* ---------- Reveal, параллакс, лічильники, showreel ---------- */
  function initReveals() {
    if (!motion) return;
    const from = {
      up: { y: 60 },
      down: { y: -60 },
      left: { x: -60 },
      right: { x: 60 },
      scale: { scale: 0.8 },
      fade: {},
      clip: { y: 90, scale: 0.94 },
    };

    $$('[data-reveal]').forEach((el) => {
      const type = el.dataset.reveal in from ? el.dataset.reveal : 'up';
      gsap.fromTo(el,
        { opacity: 0, ...from[type] },
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          duration: type === 'clip' ? 1.5 : 1.15,
          delay: parseFloat(el.dataset.delay) || 0,
          ease: type === 'scale' ? 'back.out(1.6)' : 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
    });

    // Галерея: партії з затримкою
    gsap.set('.gallery__item', { opacity: 0, y: 70 });
    ScrollTrigger.batch('.gallery__item', {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: 'power3.out', overwrite: true }),
    });
  }

  function initParallax() {
    if (!motion) return;
    $$('[data-parallax]').forEach((img) => {
      const k = parseFloat(img.dataset.parallax) || 1;
      gsap.set(img, { scale: 1 + 0.18 * k });
      gsap.fromTo(img, { yPercent: -7 * k }, {
        yPercent: 7 * k,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  function initCounters() {
    const fmt = (n) => Math.round(n).toLocaleString('uk-UA');
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      if (!motion) {
        el.textContent = fmt(end);
        return;
      }
      const state = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => gsap.to(state, {
          v: end,
          duration: end > 100 ? 2.4 : 1.6,
          ease: 'power2.out',
          onUpdate: () => { el.textContent = fmt(state.v); },
        }),
      });
    });
  }

  function initShowreel() {
    const frame = $('[data-showreel]');
    if (!frame) return;
    const video = $('.showreel__video', frame);

    if (video && !prefersReduced) {
      video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) {
            video.src = video.dataset.src;
            video.load();
          }
          video.play()?.catch(() => {});
        } else if (video.src) {
          video.pause();
        }
      }, { rootMargin: '200px 0px' }).observe(frame);
    }

    if (motion) {
      gsap.fromTo(frame, { scale: 0.86 }, {
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'center center', scrub: true },
      });
      gsap.fromTo($('.showreel__poster', frame), { yPercent: -6, scale: 1.15 }, {
        yPercent: 6,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }
  }

  /* ---------- Послуги: вкладки ---------- */
  function initTabs() {
    const tablist = $('.tabs');
    if (!tablist) return;
    const tabs = $$('.tabs__btn', tablist);
    const indicator = $('.tabs__indicator', tablist);
    const images = $$('[data-tab-img]');

    const moveIndicator = (btn) => {
      const range = document.createRange();
      range.selectNodeContents(btn);
      const r = range.getBoundingClientRect();
      const listRect = tablist.getBoundingClientRect();
      const x = r.left - listRect.left + tablist.scrollLeft;
      indicator.style.transform = `translateX(${x}px) scaleX(${r.width / 100})`;
    };

    const activate = (btn, { focus = false } = {}) => {
      tabs.forEach((t) => {
        const on = t === btn;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        panel.hidden = !on;
        panel.classList.toggle('is-active', on);
        if (on && motion) {
          gsap.fromTo(panel.children, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out', overwrite: true });
        }
      });
      images.forEach((img) => img.classList.toggle('is-active', img.dataset.tabImg === btn.dataset.tab));
      moveIndicator(btn);
      if (focus) btn.focus();
      // Прокручуємо активну вкладку у видиму зону на мобільних
      const left = btn.offsetLeft - (tablist.clientWidth - btn.offsetWidth) / 2;
      tablist.scrollTo({ left, behavior: motion ? 'smooth' : 'auto' });
      refreshScroll();
    };

    tabs.forEach((btn, i) => {
      btn.addEventListener('click', () => activate(btn));
      btn.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        activate(tabs[(keys[e.key] + tabs.length) % tabs.length], { focus: true });
      });
    });

    const sync = () => moveIndicator(tabs.find((t) => t.classList.contains('is-active')));
    window.addEventListener('resize', sync);
    tablist.addEventListener('scroll', sync, { passive: true });
    document.fonts?.ready.then(sync);
    sync();
    requestAnimationFrame(() => { indicator.style.transition = 'transform .6s cubic-bezier(.22, 1, .36, 1)'; });
  }

  /* ---------- Портфоліо: фільтри ---------- */
  function initGallery() {
    const items = $$('.gallery__item');
    const buttons = $$('.filters__btn');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-active')) return;
        const filter = btn.dataset.filter;
        buttons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });

        const useFlip = motion && window.Flip;
        const state = useFlip ? Flip.getState(items) : null;
        items.forEach((it) => { it.hidden = !(filter === 'all' || it.dataset.cat === filter); });

        if (!useFlip) {
          refreshScroll();
          return;
        }
        gsap.set(items, { opacity: 1, y: 0 });
        Flip.from(state, {
          duration: 0.8,
          ease: 'power3.inOut',
          absolute: true,
          onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' }),
          onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.85, duration: 0.45 }),
          onComplete: refreshScroll,
        });
      });
    });
  }

  /* ---------- Лайтбокс ---------- */
  function initLightbox() {
    const dialog = $('[data-lightbox]');
    const gallery = $('.gallery');
    if (!dialog || !gallery || typeof dialog.showModal !== 'function') return;

    const img = $('[data-lightbox-img]', dialog);
    const caption = $('[data-lightbox-caption]', dialog);
    const counter = $('[data-lightbox-counter]', dialog);
    let list = [];
    let index = 0;

    const show = async (i, dir = 0) => {
      index = (i + list.length) % list.length;
      const link = list[index];
      const next = new Image();
      next.src = link.href;
      try { await next.decode(); } catch (_) { /* покажемо як є */ }
      if (list[index] !== link) return;
      img.src = link.href;
      img.alt = $('img', link).alt;
      caption.textContent = link.dataset.caption || '';
      counter.textContent = `${index + 1} / ${list.length}`;
      if (motion) gsap.fromTo(img, { opacity: 0, x: dir * 50, scale: 0.97 }, { opacity: 1, x: 0, scale: 1, duration: 0.6, ease: 'power3.out' });
    };

    const open = (link) => {
      list = $$('.gallery__item:not([hidden]) .gallery__link');
      dialog.showModal();
      scrollLock.lock();
      if (motion) gsap.fromTo(dialog, { opacity: 0 }, { opacity: 1, duration: 0.35 });
      show(list.indexOf(link));
    };

    const close = () => {
      if (!dialog.open) return;
      if (motion) gsap.to(dialog, { opacity: 0, duration: 0.25, onComplete: () => dialog.close() });
      else dialog.close();
    };

    gallery.addEventListener('click', (e) => {
      const link = e.target.closest('.gallery__link');
      if (!link) return;
      e.preventDefault();
      open(link);
    });

    dialog.addEventListener('close', () => {
      scrollLock.unlock();
      img.removeAttribute('src');
    });
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      close();
    });
    $('[data-lightbox-close]', dialog).addEventListener('click', close);
    $('[data-lightbox-prev]', dialog).addEventListener('click', () => show(index - 1, -1));
    $('[data-lightbox-next]', dialog).addEventListener('click', () => show(index + 1, 1));
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.classList.contains('lightbox__inner')) close();
    });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') show(index + 1, 1);
      if (e.key === 'ArrowLeft') show(index - 1, -1);
    });

    // Свайп
    let startX = null;
    const inner = $('.lightbox__inner', dialog);
    inner.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    inner.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
  }

  /* ---------- Онлайн-запис ---------- */
  function initBooking() {
    const form = $('#booking-form');
    if (!form) return;

    const card = $('.booking__card');
    const steps = $$('.form-step', form);
    const progressSteps = $$('.progress__step', form);
    const progressFill = $('.progress__fill', form);
    const progressBar = $('.progress__bar', form);
    const btnPrev = $('[data-prev]', form);
    const btnNext = $('[data-next]', form);
    const btnSubmit = $('[data-submit]', form);
    const catWrap = $('[data-booking-categories]', form);
    const svcWrap = $('[data-booking-services]', form);
    const datesWrap = $('[data-booking-dates]', form);
    const timesWrap = $('[data-booking-times]', form);
    const summary = $('[data-booking-summary]', form);
    const success = $('[data-booking-success]');
    const successText = $('[data-success-text]');
    const nameInput = $('#bf-name');
    const phoneInput = $('#bf-phone');
    const consent = $('#bf-consent');
    const TOTAL = steps.length;

    let current = 1;
    let triedSubmit = false;
    const state = { service: null, master: null, date: null, time: null };

    // Дані послуг беремо з прайсу на сторінці — одне джерело правди
    const categories = $$('.price-list').map((list) => ({
      id: list.dataset.category,
      label: list.dataset.label,
      items: $$('.price-item', list).map((it) => ({
        name: it.dataset.service,
        duration: Number(it.dataset.duration),
        price: $('.price-item__price', it).textContent.trim(),
      })),
    }));

    const el = (tag, cls, text) => {
      const node = document.createElement(tag);
      if (cls) node.className = cls;
      if (text != null) node.textContent = text;
      return node;
    };

    const radio = (name, value, checked = false) => {
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = value;
      input.checked = checked;
      return input;
    };

    /* Категорії та послуги */
    categories.forEach((c, i) => {
      const label = el('label', 'chip');
      label.append(radio('category', c.id, i === 0), el('span', null, c.label));
      catWrap.appendChild(label);
    });

    const renderServices = (catId) => {
      const cat = categories.find((c) => c.id === catId) || categories[0];
      svcWrap.textContent = '';
      cat.items.forEach((s) => {
        const label = el('label', 'option');
        const body = el('span', 'option__body');
        body.append(el('span', 'option__name', s.name), el('span', 'option__meta', `${s.duration} хв`));
        label.append(radio('service', s.name, state.service?.name === s.name), body, el('span', 'option__price', s.price));
        label.querySelector('input').addEventListener('change', () => {
          state.service = { ...s };
          clearError(1);
          updateSummary();
        });
        svcWrap.appendChild(label);
      });
      if (motion) gsap.fromTo(svcWrap.children, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' });
    };

    catWrap.addEventListener('change', (e) => renderServices(e.target.value));
    renderServices(categories[0]?.id);

    /* Майстри */
    form.addEventListener('change', (e) => {
      if (e.target.name === 'master') {
        state.master = e.target.value;
        clearError(2);
        renderTimes();
        updateSummary();
      }
    });

    /* Дати і час */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fmtWeekday = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' });
    const fmtLong = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' });
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });

    days.forEach((d, i) => {
      const label = el('label', 'date');
      label.title = fmtLong.format(d);
      const span = el('span');
      span.append(el('small', null, i === 0 ? 'сьогодні' : fmtWeekday.format(d)), el('b', null, String(d.getDate())));
      label.append(radio('date', iso(d)), span);
      datesWrap.appendChild(label);
    });

    datesWrap.addEventListener('change', (e) => {
      state.date = days.find((d) => iso(d) === e.target.value);
      state.time = null;
      clearError(3);
      renderTimes();
      updateSummary();
    });

    // Детермінований «зайнятий» слот: однаковий результат для дати + майстра + години
    const isBusy = (dateStr, master, hour) => {
      const s = `${dateStr}|${master}|${hour}`;
      let h = 0;
      for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h % 10 < 3;
    };

    const renderTimes = () => {
      timesWrap.textContent = '';
      if (!state.date) {
        timesWrap.appendChild(el('p', 'muted', 'Спершу оберіть дату'));
        return;
      }
      const weekend = [0, 6].includes(state.date.getDay());
      const [from, to] = weekend ? [10, 18] : [9, 19];
      const now = new Date();
      const isToday = iso(state.date) === iso(now);
      let free = 0;

      for (let h = from; h <= to; h += 1) {
        const time = `${String(h).padStart(2, '0')}:00`;
        const disabled = (isToday && h <= now.getHours()) || isBusy(iso(state.date), state.master || 'any', h);
        if (!disabled) free += 1;
        if (disabled && state.time === time) state.time = null;
        const label = el('label', 'slot');
        const input = radio('time', time, state.time === time);
        input.disabled = disabled;
        input.addEventListener('change', () => {
          state.time = time;
          clearError(3);
          updateSummary();
        });
        label.append(input, el('span', null, time));
        timesWrap.appendChild(label);
      }
      if (!free) {
        timesWrap.textContent = '';
        timesWrap.appendChild(el('p', 'muted', 'На цю дату вільного часу немає — оберіть інший день.'));
      }
    };
    renderTimes();

    /* Підсумок */
    const updateSummary = () => {
      summary.textContent = '';
      const add = (label, value) => {
        const chip = el('span', 'summary-chip');
        chip.append(document.createTextNode(`${label}: `), el('b', null, value));
        summary.appendChild(chip);
      };
      if (state.service) add('Послуга', `${state.service.name}, ${state.service.price}`);
      if (state.master && current > 2) add('Майстер', state.master);
      if (state.date && state.time && current > 3) add('Час', `${fmtLong.format(state.date)}, ${state.time}`);
    };

    /* Помилки */
    const showError = (step, msg) => {
      const box = $(`[data-error="${step}"]`, form);
      box.textContent = msg;
      if (motion) gsap.fromTo(box, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
    };
    const clearError = (step) => { $(`[data-error="${step}"]`, form).textContent = ''; };

    const setFieldError = (input, msg) => {
      const field = input.closest('.field');
      const box = $('.field__error', field);
      field.classList.toggle('is-invalid', !!msg);
      input.setAttribute('aria-invalid', String(!!msg));
      if (msg) input.setAttribute('aria-describedby', box.id);
      else input.removeAttribute('aria-describedby');
      box.textContent = msg || '';
    };

    const phoneDigits = () => phoneInput.value.replace(/\D/g, '');

    const validateName = () => {
      const v = nameInput.value.trim();
      const ok = v.length >= 2 && /^[\p{L}\s'’ʼ-]+$/u.test(v);
      setFieldError(nameInput, ok ? '' : 'Вкажіть ім\'я (мінімум 2 літери)');
      return ok;
    };
    const validatePhone = () => {
      const ok = /^380\d{9}$/.test(phoneDigits());
      setFieldError(phoneInput, ok ? '' : 'Вкажіть номер у форматі +380 (XX) XXX-XX-XX');
      return ok;
    };

    const validateStep = (n) => {
      if (n === 1 && !state.service) { showError(1, 'Оберіть, будь ласка, послугу'); return false; }
      if (n === 2 && !state.master) { showError(2, 'Оберіть майстра або «Будь-який майстер»'); return false; }
      if (n === 3 && !(state.date && state.time)) { showError(3, state.date ? 'Оберіть зручний час' : 'Оберіть дату і час'); return false; }
      if (n === 4) {
        const okName = validateName();
        const okPhone = validatePhone();
        if (!consent.checked) showError(4, 'Потрібна згода на обробку даних');
        else clearError(4);
        if (!okName) nameInput.focus();
        else if (!okPhone) phoneInput.focus();
        return okName && okPhone && consent.checked;
      }
      return true;
    };

    /* Маска телефону */
    let prevDigits = '';
    const formatPhone = (raw) => {
      // Прибираємо код країни (навіть вставлений двічі) і провідний нуль: 067… → 67…
      const d = raw.replace(/\D/g, '').replace(/^(380)+/, '').replace(/^0/, '').slice(0, 9);
      if (!d) return '+380';
      let out = `+380 (${d.slice(0, 2)}`;
      if (d.length >= 2) out += ')';
      if (d.length > 2) out += ` ${d.slice(2, 5)}`;
      if (d.length > 5) out += `-${d.slice(5, 7)}`;
      if (d.length > 7) out += `-${d.slice(7, 9)}`;
      return out;
    };
    phoneInput.addEventListener('focus', () => {
      if (!phoneInput.value) phoneInput.value = '+380 ';
    });
    phoneInput.addEventListener('blur', () => {
      if (phoneDigits().length <= 3) phoneInput.value = '';
    });
    phoneInput.addEventListener('input', (e) => {
      let digits = phoneDigits();
      // Видалення «)» або «-» не повинно застрягати на розділювачі
      if (e.inputType === 'deleteContentBackward' && digits === prevDigits) digits = digits.slice(0, -1);
      const deletingPrefix = (e.inputType || '').startsWith('delete') && digits.length < 3;
      phoneInput.value = deletingPrefix ? '' : formatPhone(digits);
      prevDigits = phoneDigits();
      if (triedSubmit) validatePhone();
    });
    nameInput.addEventListener('input', () => { if (triedSubmit) validateName(); });
    consent.addEventListener('change', () => { if (consent.checked) clearError(4); });

    /* Перемикання кроків */
    const goTo = (n) => {
      const dir = n > current ? 1 : -1;
      const prevStep = steps[current - 1];
      const nextStep = steps[n - 1];
      current = n;

      const reveal = () => {
        prevStep.hidden = true;
        nextStep.hidden = false;
        steps.forEach((s) => s.classList.toggle('is-active', s === nextStep));
        if (motion) gsap.fromTo(nextStep, { opacity: 0, x: 40 * dir }, { opacity: 1, x: 0, duration: 0.55, ease: 'power3.out' });
        nextStep.setAttribute('tabindex', '-1');
        nextStep.focus({ preventScroll: true });
        refreshScroll();
      };
      if (motion && prevStep !== nextStep) {
        gsap.to(prevStep, { opacity: 0, x: -30 * dir, duration: 0.25, ease: 'power2.in', onComplete: reveal });
      } else {
        reveal();
      }

      progressSteps.forEach((p, i) => {
        p.classList.toggle('is-active', i + 1 === n);
        p.classList.toggle('is-done', i + 1 < n);
      });
      progressFill.style.transform = `scaleX(${n / TOTAL})`;
      progressBar.setAttribute('aria-valuenow', String(n));
      btnPrev.hidden = n === 1;
      btnNext.hidden = n === TOTAL;
      btnSubmit.hidden = n !== TOTAL;
      updateSummary();

      // На мобільному піднімаємо картку у видиму зону
      const top = card.getBoundingClientRect().top;
      if (top < headerOffset() || top > window.innerHeight * 0.5) scrollToTarget(card);
    };

    btnNext.addEventListener('click', () => {
      if (validateStep(current)) goTo(current + 1);
    });
    btnPrev.addEventListener('click', () => goTo(current - 1));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      triedSubmit = true;
      if (!validateStep(TOTAL)) return;

      const name = nameInput.value.trim().split(/\s+/)[0];
      const master = state.master === 'Будь-який вільний майстер' ? 'підберемо вільного' : state.master;
      successText.textContent = `Дякуємо, ${name}! Ви записані на «${state.service.name}»: ${fmtLong.format(state.date)} о ${state.time}, майстер — ${master}. Ми зателефонуємо, щоб підтвердити візит.`;

      const showSuccess = () => {
        form.hidden = true;
        success.hidden = false;
        success.focus({ preventScroll: true });
        requestAnimationFrame(() => success.classList.add('is-visible'));
        if (motion) {
          gsap.timeline()
            .fromTo('.booking-success__circle', { scale: 0 }, { scale: 1, duration: 0.6, ease: 'back.out(1.8)' })
            .fromTo(success.children, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.1);
        }
        refreshScroll();
      };
      if (motion) gsap.to(form, { opacity: 0, y: -16, duration: 0.3, onComplete: () => { gsap.set(form, { clearProps: 'all' }); showSuccess(); } });
      else showSuccess();
    });

    $('[data-booking-reset]').addEventListener('click', () => {
      form.reset();
      Object.assign(state, { service: null, master: null, date: null, time: null });
      triedSubmit = false;
      prevDigits = '';
      [nameInput, phoneInput].forEach((i) => setFieldError(i, ''));
      [1, 2, 3, 4].forEach(clearError);
      renderServices(categories[0]?.id);
      renderTimes();
      success.hidden = true;
      success.classList.remove('is-visible');
      form.hidden = false;
      steps.forEach((s, i) => { s.hidden = i !== 0; });
      current = 1;
      goTo(1);
    });

    // Запис до конкретного майстра з картки
    $$('[data-master]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = $(`input[name="master"][value="${btn.dataset.master}"]`, form);
        if (input) {
          input.checked = true;
          state.master = input.value;
          renderTimes();
          updateSummary();
        }
        toast(`Майстра обрано: ${btn.dataset.master}. Залишилось обрати послугу й час`);
        scrollToTarget($('#booking'));
      });
    });
  }

  /* ---------- Відгуки: слайдер ---------- */
  function initSlider() {
    const slider = $('[data-slider]');
    if (!slider) return;
    const viewport = $('.slider__viewport', slider);
    const track = $('.slider__track', slider);
    const slides = $$('.review', track);
    const dotsWrap = $('[data-slider-dots]', slider);
    const prevBtn = $('[data-slider-prev]');
    const nextBtn = $('[data-slider-next]');

    let index = 0;
    let step = 0;
    let perView = 1;
    let maxIndex = 0;
    let x = 0;

    viewport.setAttribute('role', 'region');
    viewport.setAttribute('aria-roledescription', 'карусель');
    viewport.setAttribute('aria-label', 'Відгуки клієнток');
    slides.forEach((s, i) => s.setAttribute('aria-label', `Відгук ${i + 1} з ${slides.length}`));

    const setX = (value, animate) => {
      x = value;
      if (motion && animate) gsap.to(track, { x, duration: 0.85, ease: 'power3.out', overwrite: true });
      else if (hasGsap) gsap.set(track, { x });
      else track.style.transform = `translateX(${x}px)`;
    };

    const measure = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = slides[0].getBoundingClientRect().width + gap;
      perView = Math.max(1, Math.round((viewport.clientWidth + gap) / step));
      maxIndex = Math.max(0, slides.length - perView);
    };

    const buildDots = () => {
      dotsWrap.textContent = '';
      for (let i = 0; i <= maxIndex; i += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'slider__dot';
        dot.setAttribute('aria-label', `Перейти до відгуку ${i + 1}`);
        dot.addEventListener('click', () => go(i));
        dotsWrap.appendChild(dot);
      }
    };

    const go = (i, animate = true) => {
      index = clamp(i, 0, maxIndex);
      setX(-index * step, animate);
      $$('.slider__dot', dotsWrap).forEach((d, k) => {
        d.classList.toggle('is-active', k === index);
        d.setAttribute('aria-current', k === index ? 'true' : 'false');
      });
      slides.forEach((s, k) => {
        const visible = k >= index && k < index + perView;
        s.classList.toggle('is-faded', !visible);
        s.inert = !visible;
      });
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === maxIndex;
    };

    prevBtn.addEventListener('click', () => go(index - 1));
    nextBtn.addEventListener('click', () => go(index + 1));
    slider.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });

    // Свайп і перетягування
    let startX = 0;
    let startY = 0;
    let startTrack = 0;
    let dragging = false;
    let locked = null;

    viewport.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      locked = null;
      startX = e.clientX;
      startY = e.clientY;
      startTrack = x;
      if (hasGsap) gsap.killTweensOf(track);
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (locked === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (locked === 'x') {
          try { viewport.setPointerCapture(e.pointerId); } catch (_) { /* вказівник уже відпущено */ }
          viewport.classList.add('is-dragging');
        }
      }
      if (locked !== 'x') return;
      const min = -maxIndex * step;
      let next = startTrack + dx;
      if (next > 0) next *= 0.35;
      if (next < min) next = min + (next - min) * 0.35;
      setX(next, false);
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      if (locked !== 'x') return;
      const dx = e.clientX - startX;
      const shift = Math.abs(dx) > step * 0.18 ? Math.max(1, Math.round(Math.abs(dx) / step)) * (dx < 0 ? 1 : -1) : 0;
      go(index + shift);
    };
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);

    const setup = () => {
      measure();
      buildDots();
      go(index, false);
    };
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setup, 150);
    });
    document.fonts?.ready.then(setup);
    setup();
  }

  /* ---------- FAQ: акордеон ---------- */
  function initAccordion() {
    const buttons = $$('.accordion__btn');
    const toggle = (btn, open) => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      if (open && motion) {
        gsap.fromTo($('.accordion__content', panel), { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
      }
    };
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const willOpen = btn.getAttribute('aria-expanded') !== 'true';
        buttons.forEach((b) => b !== btn && b.getAttribute('aria-expanded') === 'true' && toggle(b, false));
        toggle(btn, willOpen);
        refreshScroll();
      });
    });
  }

  /* ---------- Магнітні кнопки ---------- */
  function initMagnetic() {
    if (!motion || !finePointer) return;
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      const strength = el.classList.contains('btn--lg') ? 0.3 : 0.4;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Дрібниці: toast і демо-посилання ---------- */
  let toastTimer;
  function toast(message) {
    const box = $('[data-toast]');
    if (!box) return;
    box.textContent = message;
    box.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('is-visible'), 3200);
  }

  function initDemoLinks() {
    $$('[data-demo-link]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        toast(`Демо-сайт: тут буде посилання на ${link.dataset.demoLink} салону`);
      });
    });
  }

  /* ---------- Старт ---------- */
  initLenis();
  initSplitHeadings();
  initHeader();
  initMenu();
  initAnchors();
  initTabs();
  initGallery();
  initLightbox();
  initBooking();
  initSlider();
  initAccordion();
  initCounters();
  initReveals();
  initParallax();
  initShowreel();
  initHeroVideo();
  initMagnetic();
  initDemoLinks();
  runPreloader();

  if (hasGsap) {
    document.fonts?.ready.then(refreshScroll);
    window.addEventListener('load', refreshScroll, { once: true });
  }
})();
