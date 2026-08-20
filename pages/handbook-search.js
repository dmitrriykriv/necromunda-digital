(function () {
  'use strict';

  (function backToTop() {
    var btn = document.createElement('a');
    btn.className = 'to-top';
    btn.href = '#top';
    btn.setAttribute('aria-label', 'Наверх');
    btn.tabIndex = -1;
    btn.setAttribute('aria-hidden', 'true');
    btn.innerHTML =
      '<svg class="to-top-arrow" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M6 11l6-6 6 6"/>' +
      '<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M6 19l6-6 6 6"/>' +
      '</svg>' +
      '<span class="to-top-label">Наверх</span>';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var top = document.getElementById('top');
      if (top && top.scrollIntoView) {
        top.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }
    });
    document.body.appendChild(btn);

    var shown = false;
    function sync() {
      var on = window.scrollY > 240;
      if (on === shown) return;
      shown = on;
      btn.classList.toggle('is-on', on);
      btn.tabIndex = on ? 0 : -1;
      btn.setAttribute('aria-hidden', on ? 'false' : 'true');
    }
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  })();

  (function rulePopovers() {
    var TIP_SEL = '.trait, .stat-abbr';
    var FIGHTER_TIPS = {
      M: 'Movement — сколько дюймов модель проходит обычным действием Move.',
      WS: 'Weapon Skill — целевое число ближнего боя на D6. Чем меньше, тем лучше.',
      BS: 'Ballistic Skill — целевое число стрельбы на D6. Чем меньше, тем лучше.',
      S: 'Strength — сила модели. Чем выше, тем легче ранить в ближнем бою.',
      T: 'Toughness — стойкость. Чем выше, тем сложнее ранить эту модель.',
      W: 'Wounds — сколько урона модель выдержит, прежде чем бросают кубики ранений.',
      I: 'Initiative — скорость реакции в бою.',
      A: 'Attacks — сколько кубиков бросается в схватке, пока модель Engaged.',
      Sv: 'Save — целевое число спасброска брони. Чем меньше, тем лучше.',
      Ld: 'Leadership — приказы в бою. Проверка: 2D6, нужно выбросить не больше Ld.',
      Cl: 'Cool — спокойствие под огнём. Проверка: 2D6, нужно выбросить не больше Cl.',
      Wil: 'Willpower — устойчивость к ужасам. Проверка: 2D6, нужно выбросить не больше Wil.',
      Int: 'Intelligence — ум и знания. Проверка: 2D6, нужно выбросить не больше Int.',
      XP: 'Starting XP — опыт, с которым боец начинает в банде.'
    };
    var WEAPON_TIPS = {
      SR: 'Short Range — короткая дистанция. E — только в Engaged, T — шаблон огня, «–» — нельзя.',
      LR: 'Long Range — дальняя дистанция; за ней попасть нельзя. E / T / «–» — как у SR.',
      Str: 'Strength — сила оружия для бросков на ранение. S — сила владельца, S+N — с модификатором, «–» — смотрите свойства.',
      S: 'Strength — сила оружия для бросков на ранение. S — сила владельца, S+N — с модификатором, «–» — смотрите свойства.',
      AP: 'Armour Piercing — модификатор к спасброску брони, чаще всего отрицательный.',
      L: 'Lethality — сколько кубиков ранений бросают, если Wounds цели упали до 0.'
    };

    var pop = document.createElement('div');
    pop.className = 'trait-pop';
    pop.id = 'trait-pop';
    pop.hidden = true;
    pop.setAttribute('role', 'tooltip');
    document.body.appendChild(pop);

    var current = null;

    function hide() {
      current = null;
      pop.hidden = true;
      pop.textContent = '';
    }

    function place(anchor) {
      var r = anchor.getBoundingClientRect();
      var pad = 8;
      var gap = 6;
      pop.style.left = pad + 'px';
      pop.style.top = pad + 'px';
      pop.hidden = false;
      var w = pop.offsetWidth;
      var h = pop.offsetHeight;
      var left = r.left;
      if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad;
      if (left < pad) left = pad;
      var top = r.bottom + gap;
      if (top + h > window.innerHeight - pad) top = r.top - h - gap;
      if (top < pad) top = pad;
      pop.style.left = Math.round(left) + 'px';
      pop.style.top = Math.round(top) + 'px';
    }

    function tipText(el) {
      var attr = el.getAttribute('data-tip');
      if (attr) return attr.trim();
      var tip = el.querySelector('.trait-tip');
      return tip ? (tip.textContent || '').trim() : '';
    }

    function show(el) {
      var text = tipText(el);
      if (!text) return;
      if (el.getAttribute('tabindex') !== '0') el.setAttribute('tabindex', '0');
      current = el;
      pop.textContent = text;
      place(el);
    }

    function closestTip(node) {
      return node && node.closest ? node.closest(TIP_SEL) : null;
    }

    function headerLabel(th) {
      var copy = th.cloneNode(true);
      var extras = copy.querySelectorAll('.orig, .orig-spoiler, .trait-tip');
      for (var i = 0; i < extras.length; i++) {
        extras[i].parentNode.removeChild(extras[i]);
      }
      return (copy.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function markStatHeaders() {
      var tables = document.querySelectorAll('table');
      for (var t = 0; t < tables.length; t++) {
        var heads = tables[t].querySelectorAll('thead th');
        if (!heads.length) continue;
        var labels = [];
        for (var i = 0; i < heads.length; i++) labels.push(headerLabel(heads[i]));
        var weapon = labels.indexOf('SR') !== -1 || labels.indexOf('LR') !== -1;
        var fighter = labels.indexOf('WS') !== -1 && labels.indexOf('BS') !== -1;
        if (!weapon && !fighter) continue;
        var dict = weapon ? WEAPON_TIPS : FIGHTER_TIPS;
        if (!weapon && dict.XP) dict['Starting XP'] = dict.XP;
        for (var j = 0; j < heads.length; j++) {
          var tip = dict[labels[j]];
          if (!tip || heads[j].querySelector('.stat-abbr')) continue;
          var span = document.createElement('span');
          span.className = 'stat-abbr';
          span.setAttribute('data-tip', tip);
          while (heads[j].firstChild) span.appendChild(heads[j].firstChild);
          heads[j].appendChild(span);
        }
      }
    }

    markStatHeaders();

    document.addEventListener('pointerover', function (e) {
      var el = closestTip(e.target);
      if (el) show(el);
    });
    document.addEventListener('pointerout', function (e) {
      var el = closestTip(e.target);
      if (!el) return;
      var next = closestTip(e.relatedTarget);
      if (next) {
        show(next);
        return;
      }
      hide();
    });
    document.addEventListener('focusin', function (e) {
      var el = closestTip(e.target);
      if (el) show(el);
    });
    document.addEventListener('focusout', function (e) {
      var el = closestTip(e.target);
      if (!el || el.contains(e.relatedTarget)) return;
      hide();
    });
    window.addEventListener('scroll', function () {
      if (current) place(current);
    }, true);
    window.addEventListener('resize', hide);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
    });
  })();

  var MOBILE = window.matchMedia('(max-width: 1000px)');
  var tocDrawer = document.querySelector('.toc-drawer');

  function isMobile() {
    return MOBILE.matches;
  }

  function syncTocDrawer() {
    if (!tocDrawer) return;
    tocDrawer.open = !isMobile();
  }

  function closeMobileToc() {
    if (tocDrawer && isMobile()) tocDrawer.open = false;
  }

  if (tocDrawer) {
    syncTocDrawer();
    if (MOBILE.addEventListener) MOBILE.addEventListener('change', syncTocDrawer);
    else MOBILE.addListener(syncTocDrawer);
    tocDrawer.addEventListener('click', function (e) {
      if (!isMobile()) return;
      if (e.target.closest('nav a')) closeMobileToc();
    });
  }

  var ROOT = document.querySelector('main.content') || document.querySelector('main');
  var qEl = document.getElementById('hb-q');
  var statusEl = document.getElementById('hb-status');
  var hitsEl = document.getElementById('hb-hits');
  if (!ROOT || !qEl || !statusEl || !hitsEl) return;

  var MODE_KEY = 'hb-search-mode';
  var MAX_HITS = 40;
  var MIN_LEN = 2;
  var HEADING_SEL = 'h2, h3, h4, dt, caption, .fighter-name, .fold-title';
  var FULL_SEL = 'p, li, dd, dt, tr, caption, h2, h3, h4, summary';

  var headingIndex = null;
  var fullIndex = null;
  var hits = [];
  var active = -1;
  var lastJumped = -1;
  var timer = 0;
  var flashTimer = 0;

  function mode() {
    var checked = document.querySelector('input[name="hb-mode"]:checked');
    return checked ? checked.value : 'headings';
  }

  function setMode(value) {
    var input = document.querySelector('input[name="hb-mode"][value="' + value + '"]');
    if (input) input.checked = true;
    document.querySelectorAll('.hb-modes label').forEach(function (lab) {
      lab.classList.toggle('is-on', lab.querySelector('input').checked);
    });
  }

  function norm(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function visibleText(el) {
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function openDetails(el) {
    for (var node = el; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS' && !node.classList.contains('toc-drawer')) {
        node.open = true;
      }
    }
  }

  function revealHash() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    openDetails(target);
    target.scrollIntoView();
  }

  function flash(el) {
    document.querySelectorAll('.hb-flash').forEach(function (node) {
      node.classList.remove('hb-flash');
    });
    el.classList.add('hb-flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      el.classList.remove('hb-flash');
    }, 1800);
  }

  function jumpTo(el) {
    closeMobileToc();
    openDetails(el);
    el.scrollIntoView({ block: 'center' });
    flash(el);
  }

  function nearestTitle(el) {
    if (el.matches && el.matches('h2, h3, h4, .fighter-name')) {
      return visibleText(el);
    }
    var fighter = el.closest('.fighter, details.fighter');
    if (fighter) {
      var name = fighter.querySelector('.fighter-name');
      if (name) return visibleText(name);
    }
    var node = el;
    while (node && node !== ROOT) {
      var prev = node;
      while (prev) {
        if (prev.matches && prev.matches('h2, h3, h4')) return visibleText(prev);
        prev = prev.previousElementSibling;
      }
      node = node.parentElement;
    }
    var section = el.closest('section');
    var h2 = section && section.querySelector(':scope > h2, h2');
    return h2 ? visibleText(h2) : 'Раздел';
  }

  function snippet(text, query) {
    var hay = norm(text);
    var i = hay.indexOf(query);
    if (i < 0) return text.slice(0, 120);
    var start = Math.max(0, i - 28);
    var end = Math.min(text.length, i + query.length + 52);
    var cut = text.slice(start, end).trim();
    if (start > 0) cut = '…' + cut;
    if (end < text.length) cut += '…';
    return cut;
  }

  function indexHeadings() {
    if (headingIndex) return headingIndex;
    headingIndex = [];
    ROOT.querySelectorAll(HEADING_SEL).forEach(function (el) {
      if (el.closest('.orig-spoiler')) return;
      var title = visibleText(el);
      if (!title) return;
      headingIndex.push({ el: el, title: title, hay: norm(title) });
    });
    return headingIndex;
  }

  function indexFull() {
    if (fullIndex) return fullIndex;
    fullIndex = [];
    ROOT.querySelectorAll(FULL_SEL).forEach(function (el) {
      if (el.closest('.hb-search')) return;
      if (el.closest('.orig-spoiler') && el.matches('summary')) return;
      if (el.matches('tr') && el.closest('thead')) return;
      var text = visibleText(el);
      if (text.length < 2) return;
      fullIndex.push({
        el: el,
        title: nearestTitle(el),
        text: text,
        hay: norm(text),
      });
    });
    return fullIndex;
  }

  function search(query, inHeadings) {
    var q = norm(query);
    if (q.length < MIN_LEN) return [];
    var source = inHeadings ? indexHeadings() : indexFull();
    var found = [];
    var seen = {};
    for (var i = 0; i < source.length; i++) {
      var item = source[i];
      var at = item.hay.indexOf(q);
      if (at < 0) continue;
      if (inHeadings) {
        found.push({ el: item.el, title: item.title, snippet: '', at: at });
      } else {
        var group = item.title;
        if (!seen[group]) seen[group] = 0;
        if (seen[group] >= 3) continue;
        seen[group] += 1;
        found.push({
          el: item.el,
          title: item.title,
          snippet: snippet(item.text, q),
          at: at,
        });
      }
      if (found.length >= MAX_HITS) break;
    }
    return found;
  }

  function render() {
    var query = qEl.value;
    var inHeadings = mode() === 'headings';
    hits = search(query, inHeadings);
    active = hits.length ? 0 : -1;
    lastJumped = -1;

    document.querySelectorAll('.hb-modes label').forEach(function (lab) {
      lab.classList.toggle('is-on', lab.querySelector('input').checked);
    });

    if (norm(query).length < MIN_LEN) {
      statusEl.hidden = true;
      hitsEl.hidden = true;
      hitsEl.innerHTML = '';
      return;
    }

    statusEl.hidden = false;
    if (!hits.length) {
      statusEl.textContent = 'Ничего не найдено';
      hitsEl.hidden = true;
      hitsEl.innerHTML = '';
      return;
    }

    var word = inHeadings ? 'заголовков' : 'совпадений';
    statusEl.textContent = hits.length >= MAX_HITS
      ? 'Показаны первые ' + MAX_HITS + ' ' + word
      : hits.length + ' ' + word;

    hitsEl.hidden = false;
    hitsEl.innerHTML = hits.map(function (hit, i) {
      var extra = hit.snippet
        ? '<span class="hb-snip">' + escapeHtml(hit.snippet) + '</span>'
        : '';
      return '<li><button type="button" class="hb-hit' + (i === 0 ? ' is-on' : '') +
        '" data-i="' + i + '"><span class="hb-hit-title">' + escapeHtml(hit.title) +
        '</span>' + extra + '</button></li>';
    }).join('');
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function activate(i, jump) {
    if (i < 0 || i >= hits.length) return;
    active = i;
    hitsEl.querySelectorAll('.hb-hit').forEach(function (btn, n) {
      btn.classList.toggle('is-on', n === i);
    });
    var on = hitsEl.querySelector('.hb-hit.is-on');
    if (on) on.scrollIntoView({ block: 'nearest' });
    if (jump) {
      jumpTo(hits[i].el);
      lastJumped = i;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 80);
  }

  try {
    setMode(localStorage.getItem(MODE_KEY) === 'full' ? 'full' : 'headings');
  } catch (err) {
    setMode('headings');
  }

  qEl.addEventListener('input', schedule);
  qEl.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      qEl.value = '';
      render();
      qEl.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!hits.length) return;
      if (lastJumped === active) {
        activate(e.shiftKey
          ? (active <= 0 ? hits.length - 1 : active - 1)
          : (active >= hits.length - 1 ? 0 : active + 1), true);
      } else {
        activate(active < 0 ? 0 : active, true);
      }
    }
    if (e.key === 'ArrowDown' && hits.length) {
      e.preventDefault();
      activate(active < hits.length - 1 ? active + 1 : 0, false);
    }
    if (e.key === 'ArrowUp' && hits.length) {
      e.preventDefault();
      activate(active > 0 ? active - 1 : hits.length - 1, false);
    }
  });

  document.querySelectorAll('input[name="hb-mode"]').forEach(function (input) {
    input.addEventListener('change', function () {
      try { localStorage.setItem(MODE_KEY, mode()); } catch (err) {}
      render();
    });
  });

  hitsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-i]');
    if (!btn) return;
    activate(Number(btn.getAttribute('data-i')), true);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;
    e.preventDefault();
    qEl.focus();
    qEl.select();
  });

  window.addEventListener('hashchange', revealHash);
  revealHash();
})();
