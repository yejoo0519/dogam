/* 트스 정수량 — 드래곤 연구소 SS → SSS 진화 필요 정수 (KR/EN 공용)
 *
 *   a = SSS Lv.21 (HP/4 + 공격 + 방어),  b = SSS Lv.45 (HP/4 + 공격 + 방어)
 *   기본량: 달 3a-713 · 물 2a-392 · 불 2b-902 · 땅 3b-1478 · 태양 2a+2b-1494 · 블랙 수정 10a+10b-8970
 *   스킬(폭스·방확) 보유 시 기본량 +50
 *   필요량 = floor((기본량 + 스킬) × (22 − (본체 + 재료1 + 재료2)))
 *
 * 배수는 게임과 같은 순서의 소수(double) 계산이어야 한다. 정수로 정확히 계산하거나
 * 1+Σ(7−등급) 순서로 계산하면 일부 값이 게임과 1씩 어긋난다.
 * 인게임 스크린샷 14장(84개 값)과 일치 확인.
 */
(function (w, d) {
  'use strict';
  const db = w.DV1_DRAGONS;
  if (!db) return;

  const EN = /\/en\//.test(location.pathname);
  const UP = EN ? '../' : './';
  const T = EN ? {
    search: 'Search dragon', none: 'No matching dragon.',
    pick: 'Pick a dragon to see the required essence.',
    badGrade: 'Enter grades between 0.0 and 7.0.',
    skill: {boom: 'Burst', def: 'DEF%'},
    elem: {'땅':'Earth','물':'Water','불':'Fire','바람':'Wind','빛':'Light','어둠':'Dark','황혼':'Dusk','여명':'Dawn','악몽':'Nightmare'}
  } : {
    search: '드래곤 이름 검색', none: '검색 결과가 없습니다.',
    pick: '드래곤을 선택하면 필요 정수가 표시됩니다.',
    badGrade: '등급은 0.0 ~ 7.0 사이로 입력해 주세요.',
    skill: {boom: '폭스', def: '방확'},
    elem: null
  };

  /* 게임 화면과 같은 배치 (2열: 달·땅 / 불·태양 / 물·블랙 수정) */
  const ITEMS = [
    {k: 'moon',  ko: '달의 정수',   en: 'Dark Essence',  f: (a, b) => 3 * a - 713},
    {k: 'earth', ko: '땅의 정수',   en: 'Earth Essence', f: (a, b) => 3 * b - 1478},
    {k: 'fire',  ko: '불의 정수',   en: 'Fire Essence',  f: (a, b) => 2 * b - 902},
    {k: 'sun',   ko: '태양의 정수', en: 'Sun Essence',   f: (a, b) => 2 * a + 2 * b - 1494},
    {k: 'water', ko: '물의 정수',   en: 'Water Essence', f: (a, b) => 2 * a - 392},
    {k: 'black', ko: '블랙 수정',   en: 'Black Crystal', f: (a, b) => 10 * a + 10 * b - 8970}
  ];

  const ELEM_ICON = {'땅':11,'물':12,'불':13,'바람':14,'빛':84,'어둠':87,'황혼':487,'여명':486,'악몽':488};
  const SKILL_ICON = {boom: 'boom.png', def: 'DEF.png'};

  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* SSS 드래곤 목록 (SSS 랭킹과 같은 데이터) */
  const r45 = new Map(db.getRankingRows('sss', 'SSS', 45).map(r => [r.id, r]));
  const LIST = db.getRankingRows('sss', 'SSS', 21).filter(r => r45.has(r.id)).map(r => {
    const rec = db.getById(r.id), s = r45.get(r.id);
    const ko = r.name.replace(/\s*SSS$/, '');
    const en = rec.name.en || '';
    return {
      id: r.id, ko, en, name: EN ? (en || ko) : ko,
      elem: r.element, skill: r.skill || null,
      a: r.hp / 4 + r.atk + r.def,
      b: s.hp / 4 + s.atk + s.def,
      key: [ko, rec.name.ko, en].concat(rec.aliases.ko || []).map(norm).join('|')
    };
  }).sort((x, y) => x.name.localeCompare(y.name, EN ? 'en' : 'ko'));

  const $ = id => d.getElementById(id);
  const q = $('es-q'), list = $('es-list'), picked = $('es-picked');
  const gIn = [$('es-g0'), $('es-g1'), $('es-g2')];
  let cur = null, shown = [], active = -1;

  function img(x, cls) {
    return '<img class="' + cls + '" src="' + UP + db.profilePath(x.id, 4) + '" alt="" loading="lazy">';
  }
  function elemImg(x) {
    const n = ELEM_ICON[x.elem];
    const label = T.elem ? T.elem[x.elem] : x.elem;
    return n ? '<img class="es-elem" src="' + UP + 'icon/' + n + '.png" alt="' + esc(label) + '" title="' + esc(label) + '">' : '';
  }
  function skillImg(x) {
    return x.skill ? '<img class="es-skill" src="' + UP + 'icon/' + SKILL_ICON[x.skill] + '" alt="' + esc(T.skill[x.skill]) + '" title="' + esc(T.skill[x.skill]) + '">' : '';
  }

  /* ── 드래곤 검색 ── */
  function openList() {
    const k = cur && q.value === cur.name ? '' : norm(q.value);
    shown = k ? LIST.filter(x => x.key.includes(k)) : LIST;
    if (k) {   // 정확히 일치 → 앞부분 일치 → 나머지 순 (예: '말덱'이 '고귀한 말덱'보다 먼저)
      const rank = x => { const p = x.key.split('|'); return p.includes(k) ? 0 : p.some(s => s.startsWith(k)) ? 1 : 2; };
      shown = shown.map((x, i) => [rank(x), i, x]).sort((p, r) => p[0] - r[0] || p[1] - r[1]).map(p => p[2]);
    }
    active = -1;
    list.innerHTML = shown.length
      ? shown.map((x, i) => '<li role="option" id="es-o' + i + '" data-i="' + i + '" aria-selected="false">' +
          img(x, 'es-oimg') + '<span class="es-oname">' + esc(x.name) + '</span>' + skillImg(x) + elemImg(x) + '</li>').join('')
      : '<li class="es-none">' + esc(T.none) + '</li>';
    list.hidden = false;
    q.setAttribute('aria-expanded', 'true');
    q.removeAttribute('aria-activedescendant');
  }
  function closeList() {
    list.hidden = true;
    q.setAttribute('aria-expanded', 'false');
    q.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function move(step) {
    if (list.hidden) openList();
    if (!shown.length) return;
    active = (active + step + shown.length) % shown.length;
    list.querySelectorAll('[role=option]').forEach((li, i) => li.setAttribute('aria-selected', i === active ? 'true' : 'false'));
    const li = $('es-o' + active);
    q.setAttribute('aria-activedescendant', li.id);
    li.scrollIntoView({block: 'nearest'});
  }
  function choose(x) {
    cur = x;
    q.value = x.name;
    closeList();
    picked.innerHTML = img(x, 'es-pimg') +
      '<div class="es-pbody"><div class="es-pname">' + esc(x.name) + ' <span class="es-grade">SS → SSS</span></div>' +
      '<div class="es-pmeta">' + elemImg(x) + (x.skill ? skillImg(x) + '<span>' + esc(T.skill[x.skill]) + '</span>' : '') + '</div></div>';
    picked.hidden = false;
    calc();
  }

  q.addEventListener('focus', () => { q.select(); openList(); });
  q.addEventListener('input', openList);
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (!list.hidden && shown.length) choose(shown[active >= 0 ? active : 0]);
    } else if (e.key === 'Escape') { closeList(); }
  });
  list.addEventListener('mousedown', e => e.preventDefault());
  list.addEventListener('click', e => {
    const li = e.target.closest('[data-i]');
    if (li) { choose(shown[+li.dataset.i]); q.blur(); }
  });
  q.addEventListener('blur', () => {
    closeList();
    if (cur) q.value = cur.name;
  });

  /* ── 등급 ── */
  function grade(el) {
    const v = parseFloat(el.value);
    if (!Number.isFinite(v) || v < 0 || v > 7) return null;
    return Math.round(v * 10) / 10;
  }
  gIn.forEach(el => {
    el.addEventListener('input', calc);
    el.addEventListener('blur', () => { const g = grade(el); if (g !== null) el.value = g.toFixed(1); });
  });

  /* ── 계산 ── */
  const out = $('es-out'), msg = $('es-msg'), multEl = $('es-mult');
  out.innerHTML = ITEMS.map(it => '<div class="es-item es-' + it.k + '"><span class="es-ilbl"><i></i>' +
    esc(EN ? it.en : it.ko) + '</span><b class="u-num" id="es-v-' + it.k + '">—</b></div>').join('');

  function calc() {
    const g = gIn.map(grade);
    const ok = g.every(v => v !== null);
    gIn.forEach((el, i) => el.classList.toggle('bad', g[i] === null));
    multEl.textContent = ok ? '×' + ((220 - g.reduce((s, v) => s + Math.round(v * 10), 0)) / 10).toFixed(1) : '×—';
    if (!cur || !ok) {
      ITEMS.forEach(it => { $('es-v-' + it.k).textContent = '—'; });
      msg.textContent = !ok ? T.badGrade : T.pick;
      msg.hidden = false;
      return;
    }
    msg.hidden = true;
    const m = 22 - ((g[0] + g[1]) + g[2]);   // 게임과 같은 순서 (본체 → 재료1 → 재료2)
    const sk = cur.skill ? 50 : 0;
    ITEMS.forEach(it => {
      $('es-v-' + it.k).textContent = Math.floor((it.f(cur.a, cur.b) + sk) * m).toLocaleString(EN ? 'en-US' : 'ko-KR');
    });
  }

  q.placeholder = T.search;
  d.addEventListener('click', e => { if (!e.target.closest('.es-combo')) closeList(); });
  calc();
})(window, document);
