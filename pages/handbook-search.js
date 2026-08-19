(function () {
  'use strict';

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
