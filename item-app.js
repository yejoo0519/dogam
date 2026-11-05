(function () {
  'use strict';
  var RAW = window.DV1_ITEMS || [];
  var items = RAW.map(function (r) { return { id: r[0], name: r[1], desc: r[2] || '', icon: r[3], cat: r[4] }; });
  var byId = new Map(items.map(function (i) { return [i.id, i]; }));
  var byIcon = {};
  items.forEach(function (i) { if (i.icon) (byIcon[i.icon] = byIcon[i.icon] || []).push(i); });

  var $ = function (id) { return document.getElementById(id); };
  var tabs = $('tabs'), query = $('query'), sort = $('sort'), results = $('results'), count = $('resultCount');
  var dialog = $('detail'), body = $('detailBody');
  var tab = 'item';
  var params = new URLSearchParams(location.search);
  if (['item', 'cap', 'deco'].indexOf(params.get('tab')) >= 0) tab = params.get('tab');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function img(i) {
    return i.icon
      ? '<img class="it-img" src="./assets/items/' + encodeURIComponent(i.icon) + '.webp" alt="" loading="lazy" decoding="async">'
      : '<div class="it-ph" aria-hidden="true">?</div>';
  }

  Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
    b.querySelector('span').textContent = items.filter(function (i) { return i.cat === b.dataset.tab; }).length;
  });

  function render() {
    Array.prototype.forEach.call(tabs.querySelectorAll('button'), function (b) {
      var on = b.dataset.tab === tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    var t = query.value.trim().toLowerCase();
    var pool = items.filter(function (i) { return i.cat === tab; });
    var list = pool.filter(function (i) {
      return !t || String(i.id) === t || i.name.toLowerCase().indexOf(t) >= 0 || i.desc.toLowerCase().indexOf(t) >= 0;
    });
    if (sort.value === 'name') list = list.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    count.textContent = list.length.toLocaleString() + ' / ' + pool.length.toLocaleString() + '개';
    results.innerHTML = list.length
      ? list.map(function (i) {
          return '<button type="button" class="it-card" data-id="' + i.id + '">' + img(i) +
            '<span class="it-no">#' + i.id + '</span><span class="it-name">' + esc(i.name) + '</span></button>';
        }).join('')
      : '<div class="it-empty">검색 결과가 없습니다.</div>';
  }

  function open(id) {
    var i = byId.get(id);
    if (!i) return;
    var same = i.cat === 'item' && i.icon ? byIcon[i.icon].filter(function (x) { return x.id !== i.id; }) : [];
    body.innerHTML =
      '<div class="it-detail-head">' + img(i) +
        '<div><div class="it-no">#' + i.id + '</div><h2 id="detailTitle">' + esc(i.name) + '</h2></div>' +
        '<button type="button" class="it-close" data-close>닫기</button>' +
      '</div>' +
      '<div class="it-detail-content">' +
        '<p class="it-desc' + (i.desc ? '' : ' none') + '">' + (i.desc ? esc(i.desc) : '설명 없음') + '</p>' +
        (same.length
          ? '<p class="it-meta">같은 아이콘을 쓰는 아이템 ' + same.length + '개</p><div class="it-same">' +
            same.map(function (x) { return '<button type="button" data-id="' + x.id + '">#' + x.id + ' ' + esc(x.name) + '</button>'; }).join('') + '</div>'
          : '') +
      '</div>';
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  results.addEventListener('click', function (e) {
    var c = e.target.closest('.it-card');
    if (c) open(+c.dataset.id);
  });
  body.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) return dialog.close();
    var b = e.target.closest('button[data-id]');
    if (b) open(+b.dataset.id);
  });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab;
    var u = new URL(location.href);
    u.searchParams.set('tab', tab);
    history.replaceState(null, '', u);
    render();
  });
  query.addEventListener('input', render);
  sort.addEventListener('change', render);
  render();
})();
