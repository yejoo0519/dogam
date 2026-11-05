(function () {
  'use strict';
  var BASE = './assets/monsters/';
  var list = (window.DV1_MONSTERS || []).map(function (r) {
    return { no: r[0], name: r[1] || ('몬스터 #' + r[0]), type: r[2] || '', profile: !!r[3] };
  });
  var GROUPS = [
    ['all', '전체', function () { return true; }],
    ['raid', '레이드 보스', function (m) { return m.type === 'RAID'; }],
    ['etc', '기타 몬스터', function (m) { return m.type !== 'RAID'; }]
  ];
  var ANIM_LABEL = { wait: '대기', wait2: '대기2', att: '공격', att1: '공격1', att2: '공격2', att3: '공격3', hit: '피격', groggy: '그로기', animation: '기본' };
  var ANIM_ORDER = ['wait', 'wait2', 'att', 'att1', 'att2', 'att3', 'hit', 'groggy'];

  var $ = function (id) { return document.getElementById(id); };
  var cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage'), msg = $('msg');
  var grid = $('grid'), chips = $('chips'), query = $('query'), count = $('count');
  var group = 'all', cur = null, sk = null, anim = null, t = 0, last = 0, playing = true, fit = null, loadSeq = 0;
  var cache = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- 목록 ---------- */
  chips.innerHTML = GROUPS.map(function (g) {
    return '<button type="button" data-g="' + g[0] + '">' + g[1] + ' <span>' + list.filter(g[2]).length + '</span></button>';
  }).join('');

  function renderList() {
    Array.prototype.forEach.call(chips.children, function (b) { b.classList.toggle('on', b.dataset.g === group); });
    var test = GROUPS.filter(function (g) { return g[0] === group; })[0][2];
    var q = query.value.trim().toLowerCase();
    var rows = list.filter(function (m) {
      return test(m) && (!q || String(m.no) === q || m.name.toLowerCase().indexOf(q) >= 0);
    });
    count.textContent = rows.length + '개';
    grid.innerHTML = rows.length ? rows.map(function (m) {
      return '<button type="button" class="mo-card' + (cur && cur.no === m.no ? ' on' : '') + '" data-no="' + m.no + '">' +
        (m.profile ? '<img src="' + BASE + 'profile/' + m.no + '.webp" alt="" loading="lazy" decoding="async">' : '<span class="mo-ph">#' + m.no + '</span>') +
        '<span class="mo-no">#' + m.no + '</span><span class="mo-nm">' + esc(m.name) + '</span></button>';
    }).join('') : '<div class="mo-empty">검색 결과가 없습니다.</div>';
  }

  /* ---------- 로딩 ---------- */
  function loadImg(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error(src)); };
      im.src = src;
    });
  }
  /* 프리멀티플라이드 알파면 되돌립니다 (픽셀로 판별, aura-preview와 같은 방식) */
  function unpremultiply(img) {
    var c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    var g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    try {
      var d = g.getImageData(0, 0, c.width, c.height), p = d.data, semi = 0, over = 0, i, a;
      for (i = 0; i < p.length; i += 4) {
        a = p[i + 3];
        if (a <= 4 || a >= 250) continue;
        semi++;
        if (Math.max(p[i], p[i + 1], p[i + 2]) > a + 6) over++;
      }
      if (semi === 0 || over / semi > 0.4) return c;
      for (i = 0; i < p.length; i += 4) {
        a = p[i + 3];
        if (a === 0 || a === 255) continue;
        var f = 255 / a;
        p[i] = Math.min(255, p[i] * f); p[i + 1] = Math.min(255, p[i + 1] * f); p[i + 2] = Math.min(255, p[i + 2] * f);
      }
      g.putImageData(d, 0, 0);
    } catch (e) { /* 원본 그대로 */ }
    return c;
  }
  function loadMonster(no) {
    if (cache[no]) return cache[no];
    cache[no] = Promise.all([
      fetch(BASE + no + '.json').then(function (r) { if (!r.ok) throw new Error('json'); return r.json(); }),
      fetch(BASE + no + '.atlas').then(function (r) { if (!r.ok) throw new Error('atlas'); return r.text(); })
    ]).then(function (res) {
      var atlas = parseAtlas(res[1]);
      return loadImg(BASE + atlas.page).then(function (img) {
        return new Skeleton(res[0], atlas, unpremultiply(img));
      });
    });
    cache[no].catch(function () { delete cache[no]; });
    return cache[no];
  }

  function select(no) {
    var m = list.filter(function (x) { return x.no === no; })[0];
    if (!m) return;
    cur = m; sk = null;
    var seq = ++loadSeq;
    $('curNo').textContent = '#' + m.no;
    $('curName').textContent = m.name;
    $('curType').textContent = m.type;
    $('anims').innerHTML = '';
    msg.textContent = '불러오는 중…';
    renderList();
    var u = new URL(location.href); u.searchParams.set('no', no); history.replaceState(null, '', u);
    loadMonster(no).then(function (s) {
      if (seq !== loadSeq) return;
      sk = s; msg.textContent = '';
      var names = Object.keys(s.animations).sort(function (a, b) {
        var ia = ANIM_ORDER.indexOf(a), ib = ANIM_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
      });
      $('anims').innerHTML = names.map(function (n) {
        return '<button type="button" data-a="' + esc(n) + '">' + esc(ANIM_LABEL[n] || n) + '</button>';
      }).join('');
      setAnim(names[0]);
    }, function () {
      if (seq !== loadSeq) return;
      msg.textContent = '에셋을 불러오지 못했습니다.';
    });
  }

  function setAnim(name) {
    anim = name; t = 0;
    Array.prototype.forEach.call($('anims').children, function (b) { b.classList.toggle('on', b.dataset.a === name); });
    fit = computeFit();
  }

  /* 애니메이션 전체에서 보이는 범위를 구해 화면에 맞춥니다 (월드 y-up) */
  function computeFit() {
    if (!sk) return null;
    var A = sk.animations[anim], dur = A ? A.duration : 0, b = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    for (var i = 0; i <= 12; i++) {
      sk.apply(anim, dur * i / 12);
      var r = sk.bounds();
      if (r.x1 < r.x0) continue;
      b.x0 = Math.min(b.x0, r.x0); b.y0 = Math.min(b.y0, r.y0);
      b.x1 = Math.max(b.x1, r.x1); b.y1 = Math.max(b.y1, r.y1);
    }
    return b.x1 > b.x0 ? b : null;
  }

  /* ---------- 그리기 ---------- */
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2), r = stage.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  }
  function base() {
    var W = cv.width, H = cv.height, pad = 0.08, f = fit;
    if (!f) return [1, 0, 0, -1, W / 2, H * 0.8];
    var s = Math.min(W * (1 - pad * 2) / (f.x1 - f.x0), H * (1 - pad * 2) / (f.y1 - f.y0));
    s = Math.min(s, 2 * Math.min(window.devicePixelRatio || 1, 2));
    var mx = (f.x0 + f.x1) / 2, my = (f.y0 + f.y1) / 2, sx = $('flip').checked ? -s : s;
    return [sx, 0, 0, -s, W / 2 - sx * mx, H / 2 + s * my];
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!sk || !anim) return;
    var A = sk.animations[anim];
    sk.apply(anim, A && A.duration ? t % A.duration : 0);
    ctx.imageSmoothingEnabled = true;
    sk.draw(ctx, base());
  }
  function frame(ms) {
    var dt = last ? Math.min((ms - last) / 1000, 0.1) : 0;
    last = ms;
    if (playing) t += dt * parseFloat($('speed').value);
    draw();
    requestAnimationFrame(frame);
  }

  /* ---------- 이벤트 ---------- */
  grid.addEventListener('click', function (e) {
    var c = e.target.closest('.mo-card');
    if (c) { select(+c.dataset.no); stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-g]');
    if (b) { group = b.dataset.g; renderList(); }
  });
  query.addEventListener('input', renderList);
  $('anims').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]');
    if (b) setAnim(b.dataset.a);
  });
  $('play').addEventListener('click', function () {
    playing = !playing;
    this.textContent = playing ? '일시정지' : '재생';
    this.setAttribute('aria-pressed', playing);
  });
  $('checker').addEventListener('change', function () { stage.classList.toggle('checker', this.checked); });
  $('shot').addEventListener('click', function () {
    if (!sk) return;
    draw();
    var a = document.createElement('a');
    a.download = 'monster_' + cur.no + '_' + anim + '.png';
    a.href = cv.toDataURL('image/png');
    a.click();
  });
  window.addEventListener('resize', resize);

  resize();
  renderList();
  requestAnimationFrame(frame);
  var startNo = parseInt(new URLSearchParams(location.search).get('no'), 10);
  var first = list.filter(function (m) { return m.no === startNo; })[0] || list.filter(function (m) { return m.type === 'RAID'; })[0] || list[0];
  if (first) select(first.no);
})();
