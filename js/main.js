/* ALLGORИТМ — улучшения поверх рабочего HTML. Без библиотек. */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Шапка: фон после прокрутки ---------- */
  const header = $('.header');
  const onScrollHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const toggle = $('.menu-toggle');
  const nav = $('#site-nav');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-toggle__label').textContent = open ? 'Закрыть' : 'Меню';
    nav.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Параллакс волн в hero ---------- */
  const waves = $('[data-parallax]');
  if (waves && !reduceMotion.matches) {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      if (y < window.innerHeight * 1.2) waves.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ---------- Магнитные кнопки (только мышь) ---------- */
  if (finePointer.matches && !reduceMotion.matches) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = `translate(${dx * 10}px, ${dy * 8}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Направления: аккордеон / раскрытие ---------- */
  const desktop = window.matchMedia('(min-width: 960px)');
  const dirs = $$('.dir');

  const setActive = (card, open = true) => {
    dirs.forEach((d) => {
      const on = d === card && open;
      d.classList.toggle('is-active', on);
      d.querySelector('.dir__head').setAttribute('aria-expanded', String(on));
      d.querySelector('.dir__body').inert = !on;
    });
  };
  // Начальное состояние: первая карточка раскрыта
  setActive(dirs[0]);

  dirs.forEach((card) => {
    card.querySelector('.dir__head').addEventListener('click', () => {
      const isOpen = card.classList.contains('is-active');
      // На десктопе одна карточка всегда раскрыта; на телефоне можно свернуть
      if (desktop.matches) setActive(card);
      else setActive(card, !isOpen);
    });
    let hoverTimer;
    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !desktop.matches) return;
      hoverTimer = setTimeout(() => setActive(card), 120);
    });
    card.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  });
  // При переходе на десктоп ни одна карточка не должна остаться свёрнутой целиком
  desktop.addEventListener('change', () => {
    if (!dirs.some((d) => d.classList.contains('is-active'))) setActive(dirs[0]);
  });

  /* ---------- Появление при прокрутке ---------- */
  const seenTargets = $$('.dir, [data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-seen'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    seenTargets.forEach((el) => io.observe(el));
  } else {
    seenTargets.forEach((el) => el.classList.add('is-seen'));
  }

  /* ---------- Подборщик по возрасту ---------- */
  const picker = $('[data-picker]');
  if (picker) {
    picker.hidden = false;
    const result = $('.picker__result', picker);
    const buttons = $$('.picker__btn', picker);
    // «с 4 лет» (родительный) и «в 3 года» (винительный)
    const sinceAge = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'года' : 'лет');
    const atAge = (n) => {
      const m10 = n % 10, m100 = n % 100;
      if (m100 >= 11 && m100 <= 14) return 'лет';
      if (m10 === 1) return 'год';
      if (m10 >= 2 && m10 <= 4) return 'года';
      return 'лет';
    };

    buttons.forEach((btn) => btn.addEventListener('click', () => {
      const from = Number(btn.dataset.from);
      const to = Number(btn.dataset.to);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));

      // Направление подходит, если его возрастной диапазон пересекается с выбранным
      const matches = dirs.filter((d) => {
        const min = Number(d.dataset.min);
        const max = d.dataset.max ? Number(d.dataset.max) : Infinity;
        return min <= to && max >= from;
      });
      dirs.forEach((d) => {
        d.classList.toggle('is-match', matches.includes(d));
        d.classList.toggle('is-dim', !matches.includes(d));
      });

      result.textContent = '';
      const text = document.createElement('p');
      text.className = 'picker__text';

      if (!matches.length) {
        text.textContent = 'Для этого возраста напишите нам — подскажем, куда лучше прийти.';
      } else {
        const names = matches.map((d) => `«${d.dataset.name}»`);
        const lead = matches.length === dirs.length
          ? 'Подходят все три направления: '
          : matches.length === 1 ? 'Подходит ' : 'Подходят ';
        text.append(lead);
        const strong = document.createElement('strong');
        strong.textContent = names.join(', ').replace(/, ([^,]*)$/, ' и $1');
        text.append(strong, '.');
      }
      result.append(text);

      // Оговорка, если направление начинается позже нижней границы
      const partial = matches.filter((d) => Number(d.dataset.min) > from);
      if (partial.length) {
        const note = document.createElement('p');
        note.className = 'picker__note';
        const youngest = matches.filter((d) => Number(d.dataset.min) <= from).map((d) => `«${d.dataset.name}»`);
        const age = partial.map((d) => Number(d.dataset.min))[0];
        note.textContent = `${partial.map((d) => `«${d.dataset.name}»`).join(' и ')} — с ${age} ${sinceAge(age)}.`
          + (youngest.length ? ` В ${from} ${atAge(from)} — ${youngest.join(', ')}.` : '');
        result.append(note);
      }

      const cta = document.createElement('a');
      cta.className = 'btn btn--primary';
      cta.href = 'https://vk.me/allgorit';
      cta.target = '_blank';
      cta.rel = 'noopener';
      cta.textContent = 'Написать студии';
      result.append(cta);
    }));
  }

  /* STAGE3:JS */
})();
