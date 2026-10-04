/*
 * ci-app.js — 전투 지수 테스트 계산기 화면
 *  - 저장: 이 페이지 전용 키 'ci_test_v1' 만 씁니다.
 *  - 기존 사이트 키 'dv1sim_spec'(내 스펙)은 사용자가 버튼을 누를 때만 읽습니다. 쓰지 않습니다.
 *  - 네트워크 요청·Supabase 연결 없음 (이미지 표시는 기존 사이트와 같은 GitHub 이미지 주소 사용).
 */
(function () {
  'use strict';
  const D = window.CI_DATA, E = window.CIEngine;
  const VIEWS = window.DV1_DRAGON_VIEWS || null;
  const STORE_KEY = 'ci_test_v1';
  const SPEC_KEY = 'dv1sim_spec'; // 읽기 전용
  const STATS = ['hp', 'atk', 'def'];
  const SNAME = { hp: '체력', atk: '공격', def: '방어' };
  const SK = D.SK;
  const GEM_KEYS = [37, 38, 39, 40];
  const IMG_BASE = 'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => Number(n).toLocaleString('ko-KR');
  const mil = n => (n / 1e6).toFixed(1);
  // 전투 지수(CI, Combat Index)는 비밸(백만 단위, 1000 안팎)과 헷갈리지 않도록 1억으로 나눈 값에 CI 기호를 붙여 표시 (예: 10.548 CI)
  const ciFmt = n => (n / 1e8).toFixed(3);
  const ciHTML = n => `<span class="ci-idx" title="${num(n)}">${ciFmt(n)}<small>CI</small></span>`;
  const pct = (a, b) => ((a - b) / b * 100);
  const sgn = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(2) + '%';

  // ─────────────────────────── 상태 ───────────────────────────
  const mkSpirit = () => ({ opts: [0, 1, 2, 3].map(() => ({ stat: '', type: '' })), bonus: '' });
  const mkDragon = () => ({ name: '', attr: '', dtype: '', growth: '강림(축복)', grade: '9.0', ...mkSpirit() });
  const mkGems = () => ({ hp: { 37: 0, 38: 0, 39: 0, 40: 0 }, atk: { 37: 0, 38: 0, 39: 0, 40: 0 }, def: { 37: 0, 38: 0, 39: 0, 40: 0 } });
  const mkState = () => ({
    v: 1, tab: 'gear', theme: 'dark',
    accCards: [], pendants: [], gems: mkGems(), coll: { hp: 0, atk: 0, def: 0 },
    encMode: 'infinite', excSun: false,
    single: { grade: '9.0', bufMode: 'auto', bufLv: 2, manual: { h: 0, a: 0, d: 0 }, spirit: mkSpirit() },
    team: {
      listMode: 'pvp', dragons: [mkDragon(), mkDragon(), mkDragon()], timeLimitMs: 60000, buffOn: true, debuffOn: true,
      settingBuffs: { buff: { attr: '어둠', type: '체공형', stat1: 'hp', stat2: 'hp' }, debuff: { attr: '바람', type: '방어형', stat1: 'atk', stat2: 'hp' } },
    },
  });

  const toInt = (v, min, max) => { let n = parseInt(v, 10); if (!Number.isFinite(n)) n = 0; if (min != null) n = Math.max(min, n); if (max != null) n = Math.min(max, n); return n; };
  const validStat = s => STATS.includes(s);
  function cleanSpirit(sp) {
    const o = mkSpirit();
    if (!sp) return o;
    for (let i = 0; i < 4; i++) {
      const x = sp.opts && sp.opts[i];
      o.opts[i] = { stat: x && validStat(x.stat) ? x.stat : '', type: x && ['+', '%'].includes(x.type) ? x.type : '' };
    }
    o.bonus = validStat(sp.bonus) ? sp.bonus : '';
    return o;
  }
  function cleanAccCards(list) {
    return (Array.isArray(list) ? list : []).filter(c => c && D.ACC_DB.some(a => a.n === c.name))
      .map(c => ({ name: c.name, enchant: ['hp', 'atk', 'def'].includes(c.enchant) ? c.enchant : 'none' }));
  }
  function cleanPendants(list) {
    return (Array.isArray(list) ? list : []).filter(p => p && ['태양', '달', '별'].includes(p.type)).map(p => {
      const n = E.pendSlots(p.type);
      const options = [];
      for (let i = 0; i < n; i++) {
        const o = p.options && p.options[i];
        options.push({ stat: o && validStat(o.stat) ? o.stat : 'hp', val: toInt(o && o.val, 1, 6) || 1 });
      }
      return { type: p.type, options };
    });
  }
  function cleanGems(g) {
    const out = mkGems();
    if (g) for (const s of STATS) for (const lv of GEM_KEYS) out[s][lv] = toInt(g[s] && g[s][lv], 0, 9999);
    return out;
  }
  function cleanColl(c) { return { hp: toInt(c && c.hp, 0, 99999), atk: toInt(c && c.atk, 0, 99999), def: toInt(c && c.def, 0, 99999) }; }
  function cleanDragon(d) {
    const x = { ...mkDragon(), ...cleanSpirit(d) };
    if (!d) return x;
    x.name = String(d.name || '');
    x.attr = D.DRAGON_CATS.includes(d.attr) ? d.attr : '';
    x.dtype = D.DTYPES.includes(d.dtype) ? d.dtype : '';
    x.growth = ['강림(축복)', '강림', '진각'].includes(d.growth) ? d.growth : '강림(축복)';
    x.grade = x.growth === '진각' ? '진각' : (['7.0', '8.0', '9.0'].includes(d.grade) ? d.grade : '9.0');
    return x;
  }
  function cleanWeekly(w, def) {
    const x = { ...def };
    if (w) {
      if (D.DRAGON_CATS.includes(w.attr)) x.attr = w.attr;
      if (D.DTYPES.includes(w.type)) x.type = w.type;
      if (validStat(w.stat1)) x.stat1 = w.stat1;
      if (validStat(w.stat2)) x.stat2 = w.stat2;
    }
    return x;
  }
  function load() {
    const s = mkState();
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return s;
    s.tab = ['gear', 'single', 'team'].includes(raw.tab) ? raw.tab : 'gear';
    s.theme = ['dark', 'light', 'beige'].includes(raw.theme) ? raw.theme : 'dark';
    s.accCards = cleanAccCards(raw.accCards);
    s.pendants = cleanPendants(raw.pendants);
    s.gems = cleanGems(raw.gems);
    s.coll = cleanColl(raw.coll);
    s.encMode = raw.encMode === 'fixed' ? 'fixed' : 'infinite';
    s.excSun = !!raw.excSun;
    const sg = raw.single || {};
    s.single.grade = D.SINGLE_GRADES.includes(sg.grade) ? sg.grade : '9.0';
    s.single.bufMode = sg.bufMode === 'manual' ? 'manual' : 'auto';
    s.single.bufLv = [0, 1, 2].includes(sg.bufLv) ? sg.bufLv : 2;
    s.single.manual = { h: toInt(sg.manual && sg.manual.h, 0, 2), a: toInt(sg.manual && sg.manual.a, 0, 2), d: toInt(sg.manual && sg.manual.d, 0, 2) };
    s.single.spirit = cleanSpirit(sg.spirit);
    const tm = raw.team || {};
    s.team.listMode = tm.listMode === 'noob' ? 'noob' : 'pvp';
    s.team.dragons = [0, 1, 2].map(i => cleanDragon(tm.dragons && tm.dragons[i]));
    s.team.timeLimitMs = [30000, 60000, 120000].includes(tm.timeLimitMs) ? tm.timeLimitMs : 60000;
    s.team.buffOn = tm.buffOn !== false; s.team.debuffOn = tm.debuffOn !== false;
    const def = mkState().team.settingBuffs;
    s.team.settingBuffs = { buff: cleanWeekly(tm.settingBuffs && tm.settingBuffs.buff, def.buff), debuff: cleanWeekly(tm.settingBuffs && tm.settingBuffs.debuff, def.debuff) };
    return s;
  }
  let S = load();
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가(사생활 보호 모드 등): 화면 동작에는 영향 없음 */ } }, 300);
  }

  // ─────────────────────────── 공통 표시 ───────────────────────────
  const statSpan = (s, text) => `<span class="u-${s}">${esc(text)}</span>`;
  function accObj(name) { return D.ACC_DB.find(a => a.n === name); }
  function accNum(name) { const m = String(name).match(/(\d+)\s*$/); return m ? +m[1] : 0; }
  function accType(name) { for (let i = 0; i < D.ACC_TYPE_ORDER.length; i++) { const t = D.ACC_TYPE_ORDER[i]; if (name.startsWith(t) || name.includes(`(${t})`)) return i; } return 99; }
  function accStatText(a) {
    if (!a) return '';
    const p = STATS.filter(s => a[s] > 0).map(s => statSpan(s, SK[s] + Math.round(a[s] * 100) + '%'));
    return p.length ? p.join(' ') : '<span class="u-dim">크리/회피</span>';
  }
  function encBadge(enc) {
    if (!['hp', 'atk', 'def'].includes(enc)) return '<span class="ci-enc none">인챈트 없음</span>';
    return `<span class="ci-enc ${enc}">${SK[enc]} +21%</span>`;
  }
  function colorAccName(n) { return esc(n).replace(/[체공방]/g, c => `<span class="u-${c === '체' ? 'hp' : c === '공' ? 'atk' : 'def'}">${c}</span>`); }
  function pendText(p) {
    if (!p) return '<span class="u-dim">없음</span>';
    const opts = p.options.slice(0, E.pendSlots(p.type)).map(o => statSpan(o.stat, SK[o.stat] + (o.val || 0) + '%')).join('<span class="u-dim">/</span>');
    return `<span class="ci-pend"><img src="${esc(D.IMG_PEND[p.type])}" alt="" loading="lazy" onerror="this.hidden=true">${esc(p.type)} (${opts})</span>`;
  }
  function gemText(gems) {
    const parts = STATS.map((s, si) => {
      const lv = [];
      for (let l = 4; l >= 0; l--) for (let k = 0; k < gems[si][l]; k++) lv.push(D.GEM_NAME[36 + l] || 36 + l);
      return lv.length ? `<span class="ci-gem u-${s}">${SK[s]}${lv.length} <small>(${lv.join(',')})</small></span>` : '';
    }).filter(Boolean);
    return parts.join(' ') || '<span class="u-dim">없음</span>';
  }
  function gemPlain(gems) { return STATS.map((s, si) => SK[s] + ':' + gems[si].join('.')).join('|'); }
  function fmtSpVal(n, stat, type) { if (!stat || !type) return ''; return type === '+' ? '+' + D.SP_PLUS[stat][n] : '+' + Math.round(D.SP_PCT[n] * 100) + '%'; }
  function spiritText(sp) {
    const rows = [0, 1, 2, 3].map(i => {
      const o = sp.opts[i];
      return o && o.stat && o.type ? `<span class="u-${o.stat}">${i + 1}옵 ${SNAME[o.stat]} ${fmtSpVal(i + 1, o.stat, o.type)}</span>` : `<span class="u-dim">${i + 1}옵 없음</span>`;
    });
    rows.push(sp.bonus ? `<span class="u-${sp.bonus}">부가 ${SNAME[sp.bonus]} +${D.SP_BONUS[sp.bonus]}</span>` : '<span class="u-dim">부가 없음</span>');
    return '<span class="ci-spirit">' + rows.join('') + '</span>';
  }
  function dragonImg(name) {
    if (!VIEWS || !name) return '';
    const map = dragonImg.map || (dragonImg.map = VIEWS.imageNumbers());
    let n = map[name];
    if (!n) n = map[String(name).replace(/\s*드래곤$/, '').trim()];
    return n ? `${IMG_BASE}/dragon/${n}/profile/8.png` : '';
  }
  const attrIcon = a => `${IMG_BASE}/icon/${D.EL_ICON[a] || 11}.png`;

  // 결과 영역을 다시 그릴 때 높이가 갑자기 줄어 화면이 위로 튀지 않도록 잠깐 높이를 유지
  function stableHTML(el, html) {
    const h = el.offsetHeight;
    if (h) el.style.minHeight = h + 'px';
    el.innerHTML = html;
    requestAnimationFrame(() => { el.style.minHeight = ''; });
  }

  // ─────────────────────────── 탭 · 테마 ───────────────────────────
  function applyTheme() { document.documentElement.setAttribute('data-theme', S.theme); $('ci-theme').value = S.theme; }
  function showTab(t) {
    S.tab = t;
    document.querySelectorAll('.ci-tabs [data-tab]').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    ['gear', 'single', 'team'].forEach(x => { $('tab-' + x).hidden = x !== t; });
    save();
  }

  // ─────────────────────────── 장신구 ───────────────────────────
  const accKey = c => c.name + '|' + c.enchant;
  function accSortKey(name, enc) { return [-accNum(name), accType(name), D.ENC_ORDER[enc] ?? 3, name]; }
  function cmpKey(a, b) { for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; }
  function accRowHTML(name, enc, count) {
    const a = accObj(name);
    return `<li class="ci-owned-row" data-key="${esc(name + '|' + enc)}">
      ${a && a.img ? `<img src="${esc(a.img)}" alt="" loading="lazy" onerror="this.hidden=true">` : '<span class="ci-img-ph"></span>'}
      <div class="ci-owned-name"><b>${colorAccName(name)}</b><small>${accStatText(a)} · ${encBadge(enc)}</small></div>
      <div class="ci-qty"><button type="button" data-act="dec" aria-label="하나 빼기">−</button><b>${count}</b><button type="button" data-act="inc" aria-label="하나 더 넣기">+</button></div>
    </li>`;
  }
  function accGroups() {
    const m = new Map();
    S.accCards.forEach(c => { const k = accKey(c); m.set(k, (m.get(k) || 0) + 1); });
    return m;
  }
  function renderAccOwned() {
    const g = accGroups();
    const keys = [...g.keys()].sort((x, y) => { const [nx, ex] = x.split('|'), [ny, ey] = y.split('|'); return cmpKey(accSortKey(nx, ex), accSortKey(ny, ey)); });
    $('acc-owned').innerHTML = keys.length ? keys.map(k => { const [n, e] = k.split('|'); return accRowHTML(n, e, g.get(k)); }).join('') : '<li class="ci-empty-row">아직 넣은 장신구가 없습니다.</li>';
    updateAccCounts();
  }
  // 한 줄만 고칩니다 (목록 전체를 다시 그리지 않아 깜빡이거나 스크롤이 튀지 않음)
  function patchAccRow(name, enc) {
    const list = $('acc-owned');
    const key = name + '|' + enc;
    const n = S.accCards.filter(c => accKey(c) === key).length;
    const row = [...list.children].find(li => li.dataset && li.dataset.key === key);
    const empty = list.querySelector('.ci-empty-row');
    if (empty && n) empty.remove();
    if (row) {
      if (n) row.querySelector('.ci-qty b').textContent = n;
      else row.remove();
    } else if (n) {
      const tpl = document.createElement('template');
      tpl.innerHTML = accRowHTML(name, enc, n).trim();
      const node = tpl.content.firstChild;
      const sk = accSortKey(name, enc);
      const after = [...list.children].find(li => { if (!li.dataset.key) return false; const [nn, ee] = li.dataset.key.split('|'); return cmpKey(accSortKey(nn, ee), sk) > 0; });
      list.insertBefore(node, after || null);
    }
    if (!S.accCards.length && !list.querySelector('.ci-empty-row')) list.innerHTML = '<li class="ci-empty-row">아직 넣은 장신구가 없습니다.</li>';
    updateAccCounts();
  }
  function updateAccCounts() {
    const g = accGroups();
    $('acc-count').textContent = S.accCards.length + '개 · ' + g.size + '종';
    const enc = $('qa-enc').value;
    document.querySelectorAll('#qa-list [data-acc]').forEach(b => {
      const a = D.ACC_DB[+b.dataset.acc];
      const n = g.get(a.n + '|' + enc) || 0;
      b.querySelector('small').textContent = '보유 ' + n + '개 · 누르면 +1';
      b.classList.toggle('has', n > 0);
    });
  }
  function renderQuickAcc() {
    const lv = +$('qa-level').value, q = $('qa-search').value.replace(/\s/g, '').toLowerCase(), statOnly = $('qa-stat-only').checked;
    const items = D.ACC_DB.map((a, i) => ({ a, i })).filter(({ a }) => (q ? true : accNum(a.n) === lv) && (!statOnly || !a.n.startsWith('빛뿔')) && a.n.replace(/\s/g, '').toLowerCase().includes(q));
    $('qa-list').innerHTML = items.map(({ a, i }) => `<button type="button" class="ci-quick-item" data-acc="${i}">${a.img ? `<img src="${esc(a.img)}" alt="" loading="lazy" onerror="this.hidden=true">` : ''}<span>${colorAccName(a.n)}<em>${accStatText(a)}</em><small></small></span></button>`).join('') || '<p class="u-note">일치하는 장신구가 없습니다.</p>';
    updateAccCounts();
  }

  // ─────────────────────────── 펜던트 ───────────────────────────
  const pendSig = p => E.pendSignature(p);
  function pendGroups() {
    const m = new Map();
    S.pendants.forEach(p => { const k = pendSig(p); if (!m.has(k)) m.set(k, { p, n: 0 }); m.get(k).n++; });
    return m;
  }
  function pendSortKey(p) { return [p.type === '태양' ? 0 : p.type === '달' ? 1 : 2, -p.options.reduce((s, o) => s + o.val, 0), pendSig(p)]; }
  function pendRowHTML(p, n) {
    return `<li class="ci-owned-row" data-key="${esc(pendSig(p))}">
      <img src="${esc(D.IMG_PEND[p.type])}" alt="" loading="lazy" onerror="this.hidden=true">
      <div class="ci-owned-name"><b>${esc(p.type)}의 펜던트</b><small>${p.options.map(o => statSpan(o.stat, SK[o.stat] + o.val + '%')).join(' / ')}</small></div>
      <div class="ci-qty"><button type="button" data-act="dec" aria-label="하나 빼기">−</button><b>${n}</b><button type="button" data-act="inc" aria-label="하나 더 넣기">+</button></div>
    </li>`;
  }
  function renderPendOwned() {
    const g = pendGroups();
    const arr = [...g.values()].sort((x, y) => cmpKey(pendSortKey(x.p), pendSortKey(y.p)));
    $('pend-owned').innerHTML = arr.length ? arr.map(x => pendRowHTML(x.p, x.n)).join('') : '<li class="ci-empty-row">아직 넣은 펜던트가 없습니다. (펜던트 없이 계산)</li>';
    updatePendCounts();
  }
  function patchPendRow(p) {
    const list = $('pend-owned'), key = pendSig(p);
    const n = S.pendants.filter(x => pendSig(x) === key).length;
    const row = [...list.children].find(li => li.dataset && li.dataset.key === key);
    const empty = list.querySelector('.ci-empty-row');
    if (empty && n) empty.remove();
    if (row) { if (n) row.querySelector('.ci-qty b').textContent = n; else row.remove(); }
    else if (n) {
      const tpl = document.createElement('template'); tpl.innerHTML = pendRowHTML(p, n).trim();
      const sk = pendSortKey(p);
      const g = pendGroups();
      const after = [...list.children].find(li => { const x = li.dataset.key && g.get(li.dataset.key); return x && cmpKey(pendSortKey(x.p), sk) > 0; });
      list.insertBefore(tpl.content.firstChild, after || null);
    }
    if (!S.pendants.length && !list.querySelector('.ci-empty-row')) list.innerHTML = '<li class="ci-empty-row">아직 넣은 펜던트가 없습니다. (펜던트 없이 계산)</li>';
    updatePendCounts();
  }
  let pendChoices = [];
  function renderQuickPend() {
    const type = $('qp-type').value, val = +$('qp-val').value, slots = E.pendSlots(type);
    pendChoices = [];
    (function make(opts, start) {
      if (opts.length === slots) { pendChoices.push({ type, options: opts.map(i => ({ stat: STATS[i], val })) }); return; }
      for (let i = start; i < 3; i++) make([...opts, i], i);
    })([], 0);
    $('qp-list').innerHTML = pendChoices.map((p, i) => `<button type="button" class="ci-quick-item" data-pend="${i}"><img src="${esc(D.IMG_PEND[type])}" alt="" loading="lazy" onerror="this.hidden=true"><span>${p.options.map(o => statSpan(o.stat, SK[o.stat] + o.val + '%')).join(' / ')}<small></small></span></button>`).join('');
    updatePendCounts();
  }
  function updatePendCounts() {
    const g = pendGroups();
    $('pend-count').textContent = S.pendants.length + '개 · ' + g.size + '종';
    document.querySelectorAll('#qp-list [data-pend]').forEach(b => {
      const p = pendChoices[+b.dataset.pend]; if (!p) return;
      const x = g.get(pendSig(p)); const n = x ? x.n : 0;
      b.querySelector('small').textContent = '보유 ' + n + '개 · 누르면 +1';
      b.classList.toggle('has', n > 0);
    });
  }
  function renderCustomPend() {
    const type = $('cp-type').value, n = E.pendSlots(type);
    const host = $('cp-opts');
    const prev = [...host.querySelectorAll('[data-cp]')].reduce((m, el) => { m[el.dataset.cp] = el.value; return m; }, {});
    host.innerHTML = Array.from({ length: n }, (_, i) => `<span class="ci-cp-opt"><small>${i + 1}옵</small><select data-cp="s${i}" aria-label="${i + 1}옵 스탯">${STATS.map(s => `<option value="${s}" ${prev['s' + i] === s ? 'selected' : ''}>${SNAME[s]}</option>`).join('')}</select><select data-cp="v${i}" aria-label="${i + 1}옵 수치">${[6, 5, 4, 3, 2, 1].map(v => `<option value="${v}" ${+prev['v' + i] === v ? 'selected' : ''}>${v}%</option>`).join('')}</select></span>`).join('');
  }

  // ─────────────────────────── 젬 · 컬렉션 ───────────────────────────
  function renderGems() {
    let h = '<span></span>' + GEM_KEYS.map(k => `<span class="ci-gem-hd">${D.GEM_NAME[k]}젬</span>`).join('');
    for (const s of STATS) {
      h += `<span class="ci-gem-lbl u-${s}">${SNAME[s]}</span>` + GEM_KEYS.map(k => `<input type="number" min="0" inputmode="numeric" data-gem="${s}|${k}" value="${S.gems[s][k]}" aria-label="${SNAME[s]} ${D.GEM_NAME[k]}젬 개수">`).join('');
    }
    $('gem-grid').innerHTML = h;
  }
  function renderColl() { STATS.forEach(s => { $('coll-' + s).value = S.coll[s]; }); }

  // ─────────────────────────── 계산 옵션 (두 모드 공용) ───────────────────────────
  function optsHTML(prefix) {
    return `<div class="ci-opt-grid">
      <div><div class="u-lbl">인챈트</div>
        <label class="ci-radio"><input type="radio" name="${prefix}-enc" value="fixed" data-opt="enc"> 보유 중인 인챈트 그대로</label>
        <label class="ci-radio"><input type="radio" name="${prefix}-enc" value="infinite" data-opt="enc"> 인챈트 상관없이 (체·공·방 +21% 중 선택)</label>
      </div>
      <div><div class="u-lbl">펜던트</div>
        <label class="ci-radio"><input type="checkbox" data-opt="excSun"> 태양 펜던트 제외</label>
      </div>
    </div>`;
  }
  function syncOpts() {
    document.querySelectorAll('[data-opt="enc"]').forEach(r => { r.checked = r.value === S.encMode; });
    document.querySelectorAll('[data-opt="excSun"]').forEach(c => { c.checked = S.excSun; });
  }

  // ─────────────────────────── 정령 입력 (단일 · 3인조 공용) ───────────────────────────
  function spiritOwner(owner) { return owner === 'single' ? S.single.spirit : S.team.dragons[+owner.split('-')[1]]; }
  function spiritEditorHTML(owner) {
    const sp = spiritOwner(owner);
    const presets = D.SP_PRESETS.map(p => `<button type="button" class="ci-preset ${p.types.every((t, i) => (sp.opts[i].type || '') === t) ? 'on' : ''}" data-preset="${p.id}"><b>${esc(p.name)}</b> <small>${p.types.map(t => t || '-').join('')}</small></button>`).join('');
    const opts = sp.opts.map((o, i) => `<div class="ci-sp-opt" data-i="${i}"><span class="ci-sp-n">${i + 1}옵</span>
      <select data-sp="stat" aria-label="${i + 1}옵 스탯"><option value="">-</option>${STATS.map(s => `<option value="${s}" ${o.stat === s ? 'selected' : ''}>${SNAME[s]}</option>`).join('')}</select>
      <select data-sp="type" aria-label="${i + 1}옵 종류"><option value="">-</option><option value="+" ${o.type === '+' ? 'selected' : ''}>+스탯</option><option value="%" ${o.type === '%' ? 'selected' : ''}>%스탯</option></select>
      <span class="ci-sp-val">${fmtSpVal(i + 1, o.stat, o.type)}</span></div>`).join('');
    return `<div class="ci-spirit-ed" data-owner="${owner}">
      <div class="ci-presets">${presets}</div>
      <div class="ci-sp-grid">${opts}</div>
      <label class="ci-sp-bonus">부가옵 <select data-sp="bonus" aria-label="부가옵"><option value="">없음</option>${STATS.map(s => `<option value="${s}" ${sp.bonus === s ? 'selected' : ''}>${SNAME[s]} (+${D.SP_BONUS[s]})</option>`).join('')}</select></label>
    </div>`;
  }
  function refreshSpiritEditor(ed) {
    const sp = spiritOwner(ed.dataset.owner);
    ed.querySelectorAll('.ci-sp-opt').forEach(row => {
      const i = +row.dataset.i, o = sp.opts[i];
      row.querySelector('[data-sp="stat"]').value = o.stat; row.querySelector('[data-sp="type"]').value = o.type;
      row.querySelector('.ci-sp-val').textContent = fmtSpVal(i + 1, o.stat, o.type);
    });
    ed.querySelector('[data-sp="bonus"]').value = sp.bonus;
    ed.querySelectorAll('[data-preset]').forEach(b => { const p = D.SP_PRESETS.find(x => x.id === b.dataset.preset); b.classList.toggle('on', p.types.every((t, i) => (sp.opts[i].type || '') === t)); });
  }
  function onSpiritChange(e) {
    const ed = e.target.closest('.ci-spirit-ed'); if (!ed) return;
    const sp = spiritOwner(ed.dataset.owner);
    const f = e.target.dataset.sp;
    if (f === 'bonus') sp.bonus = e.target.value;
    else if (f === 'stat' || f === 'type') { const i = +e.target.closest('.ci-sp-opt').dataset.i; sp.opts[i][f] = e.target.value; }
    else return;
    refreshSpiritEditor(ed); save(); markDirty(ed.dataset.owner === 'single' ? 'single' : 'team');
  }
  function onSpiritPreset(e) {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    const ed = b.closest('.ci-spirit-ed'), sp = spiritOwner(ed.dataset.owner);
    const p = D.SP_PRESETS.find(x => x.id === b.dataset.preset); if (!p) return;
    sp.opts = p.types.map((t, i) => ({ stat: sp.opts[i].stat || '', type: t }));
    refreshSpiritEditor(ed); save(); markDirty(ed.dataset.owner === 'single' ? 'single' : 'team');
  }

  // ─────────────────────────── 단일 모드 입력 ───────────────────────────
  function renderSingleInputs() {
    $('s-grade').innerHTML = D.SINGLE_GRADES.map(g => `<button type="button" class="u-chip ${S.single.grade === g ? 'on' : ''}" data-grade="${g}">${g}</button>`).join('');
    $('s-buf-mode').value = S.single.bufMode;
    $('s-buf-lv').innerHTML = [0, 1, 2].map(l => `<button type="button" class="u-chip ${S.single.bufLv === l ? 'on' : ''}" data-buflv="${l}">${l}버프</button>`).join('');
    document.querySelectorAll('[data-mbuf]').forEach(sel => { sel.value = String(S.single.manual[sel.dataset.mbuf]); });
    $('s-spirit').innerHTML = spiritEditorHTML('single');
    $('s-opts').innerHTML = optsHTML('s');
    syncOpts(); refreshBuffUI();
  }
  function refreshBuffUI() {
    const manual = S.single.bufMode === 'manual';
    $('s-buf-lv').hidden = manual; $('s-buf-manual').hidden = !manual;
    document.querySelectorAll('#s-grade [data-grade]').forEach(b => b.classList.toggle('on', b.dataset.grade === S.single.grade));
    document.querySelectorAll('#s-buf-lv [data-buflv]').forEach(b => b.classList.toggle('on', +b.dataset.buflv === S.single.bufLv));
    const m = S.single.manual, sum = m.h + m.a + m.d;
    $('s-buf-help').innerHTML = manual
      ? (sum > 2 ? '<span class="u-bad">직접 지정 버프는 합계 2단계(40%)까지 선택할 수 있습니다.</span>' : '체력·공격·방어 버프를 직접 지정합니다. 합계 최대 40%.')
      : '선택한 단계에서 가능한 모든 버프 조합을 각각 계산합니다. 버프는 기본 스탯 × 20% × 단계(버림)를 최종 스탯에 더합니다.';
  }
  function singleBuffs() {
    if (S.single.bufMode === 'auto') return E.getBufCombos(S.single.bufLv);
    const { h, a, d } = S.single.manual;
    if (h + a + d > 2) throw new Error('직접 지정 버프는 합계 2단계(40%)까지 선택할 수 있습니다.');
    return [{ h, a, d, w: 1, label: [...Array(h).fill('체'), ...Array(a).fill('공'), ...Array(d).fill('방')].join('+') || '버프 없음' }];
  }

  // ─────────────────────────── 3인조 입력 ───────────────────────────
  const normName = n => String(n || '').replace(/ 드래곤$/, '').replace(/\s+/g, '').toLowerCase();
  function allowedMap() {
    if (!VIEWS) return {};
    const key = S.team.listMode;
    allowedMap.cache = allowedMap.cache || {};
    if (!allowedMap.cache[key]) allowedMap.cache[key] = VIEWS.allowed(key);
    return allowedMap.cache[key];
  }
  // guild-calculator.js findDragonMatch 와 같은 규칙
  function findDragonMatch(name) {
    const key = normName(name); if (!key) return null;
    const DB = window.DRAGON_TYPE_DB || {};
    const prefix = [];
    for (const [type, list] of Object.entries(DB)) {
      if (!Array.isArray(list) || !D.DTYPES.includes(type)) continue;
      for (const entry of list) {
        const official = typeof entry === 'string' ? entry : entry && entry.name;
        if (!official) continue;
        const names = typeof entry === 'string' ? [entry] : [entry.name, ...(entry.aliases || [])].filter(Boolean);
        if (names.some(n => normName(n) === key)) return { name: official, type };
        if (key.length >= 2 && normName(official).startsWith(key)) prefix.push({ name: official, type });
      }
    }
    return prefix.length === 1 ? prefix[0] : null;
  }
  function searchDragons(q) {
    const map = allowedMap(), kw = String(q || '').trim(), nk = normName(kw);
    const out = [];
    for (const attr of D.DRAGON_CATS) for (const n of (map[attr] || [])) {
      if (!kw || n.includes(kw) || normName(n).includes(nk)) out.push({ name: n, attr });
    }
    return out.slice(0, 40);
  }
  function resolveDragon(name) {
    const map = allowedMap();
    const strip = n => String(n || '').replace(/\s*드래곤$/, '').trim();
    for (const attr of D.DRAGON_CATS) for (const n of (map[attr] || [])) if (n === name || strip(n) === strip(name)) {
      const m = findDragonMatch(n) || findDragonMatch(name);
      return { name: n, attr, dtype: m ? m.type : '' };
    }
    const m = findDragonMatch(name);
    if (m) for (const attr of D.DRAGON_CATS) for (const n of (map[attr] || [])) if (strip(n) === strip(m.name)) return { name: n, attr, dtype: m.type };
    return null;
  }
  function dragonCardHTML(i) {
    const d = S.team.dragons[i];
    const img = dragonImg(d.name);
    return `<article class="ci-dragon" data-slot="${i}">
      <header class="ci-dragon-hd">
        <span class="ci-slot">${i + 1}</span>
        <span class="ci-dragon-img">${img ? `<img src="${esc(img)}" alt="" onerror="this.hidden=true">` : ''}</span>
        <div class="ci-name-wrap">
          <input type="text" class="ci-name" value="${esc(d.name)}" placeholder="드래곤 이름 검색" aria-label="${i + 1}번 드래곤 이름" autocomplete="off" data-name>
          <div class="ci-drop" role="listbox" hidden></div>
        </div>
      </header>
      <div class="ci-dragon-meta">
        <span class="ci-meta" data-meta>${d.attr ? `<img src="${esc(attrIcon(d.attr))}" alt="" onerror="this.hidden=true">${esc(d.attr)}` : '<span class="u-dim">속성</span>'} · ${d.dtype ? `<b style="color:${D.DCOLORS[d.dtype]}">${esc(d.dtype)}</b>` : '<span class="u-dim">타입</span>'}</span>
        <select data-growth aria-label="성장 단계">${['강림(축복)', '강림', '진각'].map(g => `<option ${d.growth === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
        <select data-grade aria-label="등급" ${d.growth === '진각' ? 'disabled' : ''}>${d.growth === '진각' ? '<option value="진각" selected>진각</option>' : ['9.0', '8.0', '7.0'].map(g => `<option ${d.grade === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
        <select data-from-spec hidden aria-label="내 스펙에서 고르기"></select>
      </div>
      ${spiritEditorHTML('team-' + i)}
      <div class="ci-weekly-preview" data-weekly></div>
    </article>`;
  }
  function renderDragons() {
    $('t-dragons').innerHTML = [0, 1, 2].map(dragonCardHTML).join('');
    if (specDragons) fillSpecSelects();
    updateWeeklyPreview();
  }
  function patchDragonHead(i) {
    const card = document.querySelector(`.ci-dragon[data-slot="${i}"]`); if (!card) return;
    const d = S.team.dragons[i];
    const img = dragonImg(d.name);
    card.querySelector('.ci-dragon-img').innerHTML = img ? `<img src="${esc(img)}" alt="" onerror="this.hidden=true">` : '';
    card.querySelector('[data-meta]').innerHTML = `${d.attr ? `<img src="${esc(attrIcon(d.attr))}" alt="" onerror="this.hidden=true">${esc(d.attr)}` : '<span class="u-dim">속성</span>'} · ${d.dtype ? `<b style="color:${D.DCOLORS[d.dtype]}">${esc(d.dtype)}</b>` : '<span class="u-dim">타입</span>'}`;
    const gs = card.querySelector('[data-grade]');
    gs.disabled = d.growth === '진각';
    gs.innerHTML = d.growth === '진각' ? '<option value="진각" selected>진각</option>' : ['9.0', '8.0', '7.0'].map(g => `<option ${d.grade === g ? 'selected' : ''}>${g}</option>`).join('');
    card.querySelector('[data-growth]').value = d.growth;
    card.querySelector('[data-name]').value = d.name;
    updateWeeklyPreview();
  }
  function weeklyPanelHTML(key, title) {
    const cfg = S.team.settingBuffs[key];
    const on = key === 'buff' ? S.team.buffOn : S.team.debuffOn;
    const stat = v => STATS.map(s => `<option value="${s}" ${v === s ? 'selected' : ''}>${SNAME[s]}</option>`).join('');
    return `<div class="ci-weekly-panel" data-weekly-key="${key}">
      <div class="ci-weekly-title"><label class="ci-check"><input type="checkbox" data-wk="on" ${on ? 'checked' : ''}> ${title} 적용</label></div>
      <div class="ci-weekly-body">
        <label>속성<select data-wk="attr">${D.DRAGON_CATS.map(a => `<option ${cfg.attr === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
        <label>속성 일치 시<select data-wk="stat1">${stat(cfg.stat1)}</select></label>
        <label>타입<select data-wk="type">${D.DTYPES.map(t => `<option ${cfg.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>타입 일치 시<select data-wk="stat2">${stat(cfg.stat2)}</select></label>
      </div>
    </div>`;
  }
  function renderWeekly() { $('t-buffs').innerHTML = weeklyPanelHTML('buff', '버프') + weeklyPanelHTML('debuff', '디버프'); }
  function weeklyText(d) {
    if (!d.dtype || !d.attr) return '';
    const grade = d.growth === '진각' ? '진각' : d.grade;
    const base = D.BASE_GUILD[grade] && D.BASE_GUILD[grade][d.dtype]; if (!base) return '';
    const b = S.team.buffOn ? E.weeklyCounts(d, S.team.settingBuffs.buff) : { hp: 0, atk: 0, def: 0 };
    const db = S.team.debuffOn ? E.weeklyCounts(d, S.team.settingBuffs.debuff) : { hp: 0, atk: 0, def: 0 };
    const parts = [];
    STATS.forEach(s => { if (b[s]) parts.push(`<span class="u-${s}">${SNAME[s]} +${Math.floor(b[s] * base[s] * D.BUFF_RATE)}</span>`); });
    STATS.forEach(s => { if (db[s]) parts.push(`<span class="u-bad">${SNAME[s]} −${Math.floor(db[s] * base[s] * D.BUFF_RATE)}</span>`); });
    return parts.length ? '이번 주 효과: ' + parts.join(' · ') : '이번 주 버프·디버프 대상 아님';
  }
  function updateWeeklyPreview() {
    document.querySelectorAll('.ci-dragon').forEach(card => { card.querySelector('[data-weekly]').innerHTML = weeklyText(S.team.dragons[+card.dataset.slot]); });
  }

  // 내 스펙 (읽기 전용)
  let specDragons = null;
  function readSpec() {
    let raw = null;
    try { raw = localStorage.getItem(SPEC_KEY); } catch (e) { throw new Error('브라우저 저장소를 읽을 수 없습니다.'); }
    if (!raw) throw new Error('이 브라우저에 저장된 내 스펙이 없습니다. 같은 브라우저에서 사이트의 내 스펙을 먼저 저장해 주세요.');
    try { return JSON.parse(raw); } catch (e) { throw new Error('내 스펙 데이터를 읽지 못했습니다.'); }
  }
  function loadSpecDragons() {
    const sp = readSpec();
    const list = [];
    D.DRAGON_CATS.forEach(attr => ((sp.dragonCards && sp.dragonCards[attr]) || []).forEach(c => { if (c && c.name) list.push({ ...cleanDragon({ ...c, attr }), attr }); }));
    if (!list.length) throw new Error('내 스펙에 저장된 드래곤이 없습니다.');
    specDragons = list;
    return list;
  }
  function specOptionText(d) { return `${d.attr} · ${d.name} · ${d.dtype || '타입?'} · ${d.growth === '진각' ? '진각' : d.grade}`; }
  function fillSpecSelects() {
    document.querySelectorAll('[data-from-spec]').forEach(sel => {
      sel.innerHTML = '<option value="">내 스펙에서 고르기</option>' + specDragons.map((d, i) => `<option value="${i}">${esc(specOptionText(d))}</option>`).join('');
      sel.hidden = false;
    });
  }

  // ─────────────────────────── 실행기 (Web Worker) ───────────────────────────
  let workerOK = true;
  function makeWorker() {
    const src = 'var CIEngine=(' + window.CI_ENGINE_FACTORY.toString() + ')();\n' +
      'self.onmessage=function(e){var d=e.data;try{var r=CIEngine.runSync(d.job,function(p){self.postMessage({type:"progress",p:p});},120);self.postMessage({type:"done",r:r});}catch(err){self.postMessage({type:"error",message:String(err&&err.message||err)});}};';
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const w = new Worker(url);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return w;
  }
  /** 계산 실행. 반환: {cancel()} . 콜백: onProgress(p), onDone(result), onError(message) */
  function runJob(job, cb, limits) {
    let finished = false, worker = null, timer = null, lastBeat = Date.now(), started = Date.now(), fallbackCancel = null;
    const finish = (fn, arg) => { if (finished) return; finished = true; clearInterval(timer); if (worker) worker.terminate(); fn(arg); };
    // 무한 로딩 방지: 진행 신호가 없거나 전체 시간이 길어지면 멈춥니다.
    timer = setInterval(() => {
      const now = Date.now();
      if (now - lastBeat > limits.silentMs) { if (fallbackCancel) fallbackCancel(); finish(cb.onError, '계산 응답이 ' + Math.round(limits.silentMs / 1000) + '초 동안 없어 중단했습니다. 입력을 줄이거나 다시 시도해 주세요.'); }
      else if (now - started > limits.totalMs) { if (fallbackCancel) fallbackCancel(); finish(cb.onError, '최대 계산 시간(' + Math.round(limits.totalMs / 1000) + '초)을 넘겨 중단했습니다.'); }
    }, 1000);
    const startFallback = () => {
      // Web Worker 를 만들 수 없는 환경: 화면 스레드에서 잘게 나눠 계산 (멈춤 없이, 취소 가능)
      cb.onNote && cb.onNote('이 환경에서는 Web Worker를 쓸 수 없어 화면 스레드에서 나눠 계산합니다.');
      const it = E.runJob(job);
      let cancelled = false;
      fallbackCancel = () => { cancelled = true; };
      const step = () => {
        if (cancelled || finished) return;
        const t = performance.now(); let r, last = null;
        try {
          while (performance.now() - t < 20) { r = it.next(); if (r.done) return finish(cb.onDone, r.value); last = r.value; }
        } catch (e) { return finish(cb.onError, e.message || String(e)); }
        lastBeat = Date.now(); if (last) cb.onProgress(last);
        setTimeout(step, 0);
      };
      setTimeout(step, 0);
    };
    if (workerOK && window.Worker && window.Blob && window.URL) {
      try {
        worker = makeWorker();
        let gotMessage = false;
        worker.onmessage = e => {
          gotMessage = true; lastBeat = Date.now();
          const m = e.data;
          if (m.type === 'progress') cb.onProgress(m.p);
          else if (m.type === 'done') finish(cb.onDone, m.r);
          else if (m.type === 'error') finish(cb.onError, m.message);
        };
        worker.onerror = ev => {
          ev.preventDefault && ev.preventDefault();
          if (!gotMessage) { workerOK = false; worker.terminate(); worker = null; startFallback(); }
          else finish(cb.onError, '계산 중 오류가 발생했습니다: ' + (ev.message || ''));
        };
        worker.postMessage({ job });
      } catch (e) { workerOK = false; worker = null; startFallback(); }
    } else { workerOK = false; startFallback(); }
    return { cancel() { if (fallbackCancel) fallbackCancel(); finish(cb.onCancel || (() => { }), null); } };
  }

  const PHASE = { single: '세팅 비교', greedy: '가능한 조합으로 하한 찾기', prepare: '후보 정리', bound: '상한 좁히기', search: '조합 탐색' };
  function progressFrac(p) {
    if (p.phase === 'single') return p.total ? p.done / p.total : 0;
    const within = p.phase === 'greedy' ? 0.05 : p.phase === 'prepare' ? 0.1 + 0.2 * ((p.done || 0) / (p.total || 1)) : p.phase === 'bound' ? 0.3 + 0.2 * ((p.done || 0) / (p.total || 1)) : 0.5 + 0.5 * ((p.done || 0) / (p.total || 1));
    return ((p.step || 1) - 1 + within) / (p.steps || 1);
  }
  function progressText(p) {
    const head = p.steps ? `${p.step}/${p.steps} ${p.metric === 'ci' ? '전투 지수' : '기존 비밸'} 기준 · ` : '';
    const tail = p.phase === 'single' ? ` ${num(p.tested || 0)}개 세팅` : '';
    return head + (PHASE[p.phase] || '계산') + tail;
  }
  let running = null;
  function startRun(mode) {
    if (running) return;
    const status = $(mode[0] + '-status'), prog = $(mode[0] + '-progress'), btn = $(mode[0] + '-run');
    let job, ctx, limits;
    try {
      if (mode === 'single') {
        const buffs = singleBuffs();
        const input = { grade: S.single.grade, buffs, spirit: S.single.spirit, coll: S.coll, accCards: S.accCards, encMode: S.encMode, pendants: S.pendants, excSun: S.excSun, gems: S.gems };
        const problem = E.buildSingleProblem(input, D);
        job = { kind: 'single', problem };
        ctx = { problem, input: JSON.parse(JSON.stringify(input)) };
        limits = { silentMs: 20000, totalMs: 120000 };
      } else {
        const ds = S.team.dragons;
        ds.forEach((d, i) => { if (!d.name || !d.dtype || !d.attr) throw new Error((i + 1) + '번 드래곤을 목록에서 골라 주세요. (이름을 검색해 목록에서 선택)'); });
        const input = { dragons: ds, settingBuffs: S.team.settingBuffs, buffOn: S.team.buffOn, debuffOn: S.team.debuffOn, coll: S.coll, accCards: S.accCards, encMode: S.encMode, pendants: S.pendants, excSun: S.excSun, gems: S.gems, timeLimitMs: S.team.timeLimitMs };
        const problem = E.buildTeamProblem(input, D);
        job = { kind: 'team', problem };
        ctx = { problem, input: JSON.parse(JSON.stringify(input)) };
        limits = { silentMs: 30000, totalMs: 2 * S.team.timeLimitMs + 90000 };
      }
    } catch (e) { status.innerHTML = '<span class="u-bad">' + esc(e.message) + '</span>'; return; }
    btn.disabled = true; prog.hidden = false;
    const bar = prog.querySelector('.u-prog i'), txt = prog.querySelector('.ci-progress-text');
    bar.style.width = '0%'; txt.textContent = '계산 준비 중…';
    status.textContent = '';
    const t0 = Date.now();
    const end = () => { running = null; btn.disabled = false; prog.hidden = true; };
    running = runJob(job, {
      onProgress: p => { bar.style.width = Math.min(99, Math.round(progressFrac(p) * 100)) + '%'; txt.textContent = progressText(p) + ' · ' + ((Date.now() - t0) / 1000).toFixed(1) + '초'; },
      onNote: m => { status.textContent = m; },
      onDone: r => {
        end();
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        try {
          if (mode === 'single') { UI.single = { res: r, ...ctx, selBuf: 0, selType: D.DTYPES[0], topType: 'all', topBuf: 'all' }; renderSingleResults(); }
          else { UI.team = { res: r, ...ctx }; renderTeamResults(); }
          status.innerHTML = `계산 완료 · ${secs}초. <a href="#${mode[0]}-results" class="ci-link">결과 보기 ↓</a>`;
        } catch (e) { status.innerHTML = '<span class="u-bad">결과를 표시하지 못했습니다: ' + esc(e.message) + '</span>'; console.error(e); }
      },
      onError: m => { end(); status.innerHTML = '<span class="u-bad">계산하지 못했습니다: ' + esc(m) + '</span>'; },
      onCancel: () => { end(); status.textContent = '계산을 취소했습니다.'; },
    }, limits);
  }
  function markDirty(mode) {
    const st = $(mode[0] + '-status');
    if (UI[mode] && st && !running) st.textContent = '입력이 바뀌었습니다. 다시 계산하면 새 조건이 반영됩니다.';
  }

  // ─────────────────────────── 결과: 공통 ───────────────────────────
  const UI = { single: null, team: null };
  /** A/B 비교 표. rows: [label, aHTML, bHTML, aKey, bKey] — 키가 다르면 강조 */
  function compareTable(rows, aTitle, bTitle) {
    return `<div class="ci-cmp-wrap"><table class="ci-cmp"><thead><tr><th></th><th>${aTitle}</th><th>${bTitle}</th></tr></thead><tbody>` +
      rows.map(r => {
        if (r.span) return `<tr class="ci-span-row"><th>${r.label}</th><td colspan="2">${r.html}</td></tr>`;
        const diff = r.aKey !== r.bKey;
        return `<tr class="${diff ? 'is-diff' : ''}"><th>${r.label}${diff ? ' <span class="ci-diff-dot" title="다름">●</span>' : ''}</th><td>${r.a}</td><td>${r.b}</td></tr>`;
      }).join('') + '</tbody></table></div>';
  }
  const statsKey = r => [r.fH, r.fA, r.fD].join('/');
  function statRows(A, B) {
    return [
      { label: '실제 체력', a: `<b class="u-hp">${num(A.fH)}</b>`, b: `<b class="u-hp">${num(B.fH)}</b>`, aKey: A.fH, bKey: B.fH },
      { label: '실제 공격력', a: `<b class="u-atk">${num(A.fA)}</b>`, b: `<b class="u-atk">${num(B.fA)}</b>`, aKey: A.fA, bKey: B.fA },
      { label: '실제 방어력', a: `<b class="u-def">${num(A.fD)}</b>`, b: `<b class="u-def">${num(B.fD)}</b>`, aKey: A.fD, bKey: B.fD },
      { label: '기존 비밸', a: `<span title="${num(A.bv)}">${mil(A.bv)}<small>백만</small></span>`, b: `<span title="${num(B.bv)}">${mil(B.bv)}<small>백만</small></span>`, aKey: A.bv, bKey: B.bv },
      { label: '전투 지수', a: ciHTML(A.ci), b: ciHTML(B.ci), aKey: A.ci, bKey: B.ci },
    ];
  }

  // ─────────────────────────── 결과: 단일 ───────────────────────────
  function singleRowView(r) {
    const P = UI.single.problem;
    const acc = P.accClasses[r.ai], pc = P.pendClasses[r.pi];
    return { ...r, accName: acc.name, pend: pc.pend, accKey: acc.name + '|' + r.enc, pendKey: pc.key, gemKey: gemPlain(r.gems) };
  }
  function settingKey(v) { return [v.accKey, v.pendKey, v.gemKey].join('#'); }
  function renderSingleResults() {
    const U = UI.single, P = U.problem, R = U.res;
    const buffs = P.buffs;
    const g = (dt, bi) => R.groups.find(x => x.dt === dt && x.bufIdx === bi);
    const sumRows = D.DTYPES.map(dt => {
      const grp = g(dt, U.selBuf); if (!grp) return '';
      const A = singleRowView(grp.topBV[0]), B = singleRowView(grp.topCI[0]);
      const same = settingKey(A) === settingKey(B);
      return `<tr class="${U.selType === dt ? 'on' : ''}" data-type="${dt}" tabindex="0">
        <td class="l"><b style="color:${D.DCOLORS[dt]}">${dt}</b></td>
        <td>${mil(A.bv)}<span class="sub">${ciFmt(A.ci)} CI</span></td>
        <td>${ciHTML(B.ci)}<span class="sub">비밸 ${mil(B.bv)}</span></td>
        <td>${same ? '<span class="u-badge ok">같음</span>' : `<span class="u-badge gold">다름</span><span class="sub">CI ${sgn(pct(B.ci, A.ci))}</span>`}</td>
      </tr>`;
    }).join('');
    const html = `
      <section class="ci-results" id="s-results-anchor">
        <header class="ci-res-head">
          <h2>단일 드래곤 결과</h2>
          <p class="u-note">${esc(P.grade)} 등급 · 6타입 · 버프 ${buffs.map(b => esc(b.label)).join(', ')} · 비교한 세팅 ${num(R.tested)}개 · <span class="u-badge ok">모든 후보 정확 계산</span></p>
          <p class="u-note">A = 기존 비밸이 가장 높은 세팅 · B = 전투 지수가 가장 높은 세팅. 두 결과는 같은 입력과 같은 장비 후보에서 계산했습니다. 비밸은 기존처럼 <b>백만</b> 단위, 전투 지수는 <b class="ci-idx">CI</b>(Combat Index, 1억 = 1 CI)로 표시합니다.</p>
        </header>
        <div class="u-lbl">비교할 버프</div>
        <div class="u-seg ci-chips" id="s-buf-chips">${buffs.map((b, i) => `<button type="button" class="u-chip ${U.selBuf === i ? 'on' : ''}" data-selbuf="${i}">${esc(b.label)}</button>`).join('')}</div>
        <div class="u-tbl-wrap ci-mt"><table class="u-tbl ci-sum" id="s-sum"><thead><tr><th class="l">타입</th><th>A 비밸 최대<span class="sub">비밸 (백만)</span></th><th>B 전투 지수 최대<span class="sub">CI</span></th><th>추천 세팅</th></tr></thead><tbody>${sumRows}</tbody></table></div>
        <p class="u-tbl-note">타입 줄을 누르면 아래에 A·B 세팅을 나란히 보여 줍니다. 'CI ±%'는 B가 A보다 전투 지수(CI)가 얼마나 높은지입니다.</p>
        <div id="s-detail"></div>
        <div id="s-top"></div>
      </section>`;
    stableHTML($('s-results'), html);
    renderSingleDetail(); renderSingleTop();
  }
  function renderSingleDetail() {
    const U = UI.single, P = U.problem, R = U.res;
    const grp = R.groups.find(x => x.dt === U.selType && x.bufIdx === U.selBuf);
    if (!grp) { $('s-detail').innerHTML = ''; return; }
    const A = singleRowView(grp.topBV[0]), B = singleRowView(grp.topCI[0]);
    const same = settingKey(A) === settingKey(B);
    const buf = P.buffs[U.selBuf];
    const addTxt = STATS.map(s => grp.add[s] ? `<span class="u-${s}">${SK[s]} +${grp.add[s]}</span>` : '').filter(Boolean).join(' ') || '<span class="u-dim">없음</span>';
    const rows = [
      { span: true, label: '드래곤 · 타입', html: `${esc(P.grade)} 등급 <b style="color:${D.DCOLORS[U.selType]}">${esc(U.selType)}</b>` },
      { span: true, label: '적용한 버프', html: `${esc(buf.label)} · ${addTxt}` },
      { span: true, label: '적용한 정령', html: spiritText(U.input.spirit) },
      ...statRows(A, B),
      { label: '장신구 / 인챈트', a: `${colorAccName(A.accName)}<br>${encBadge(A.enc)}`, b: `${colorAccName(B.accName)}<br>${encBadge(B.enc)}`, aKey: A.accKey, bKey: B.accKey },
      { label: '젬 배분', a: gemText(A.gems), b: gemText(B.gems), aKey: A.gemKey, bKey: B.gemKey },
      { label: '펜던트', a: pendText(A.pend), b: pendText(B.pend), aKey: A.pendKey, bKey: B.pendKey },
    ];
    const verdict = same ? '<span class="u-badge ok">두 기준이 같은 세팅을 추천합니다</span>'
      : `<span class="u-badge gold">추천 세팅이 다릅니다</span> <span class="u-note">B는 A보다 전투 지수 ${sgn(pct(B.ci, A.ci))}, 기존 비밸 ${sgn(pct(B.bv, A.bv))}</span>`;
    stableHTML($('s-detail'), `<div class="u-sec ci-mt"><div class="u-sec-hd">${esc(U.selType)} · ${esc(buf.label)} — A vs B</div><div class="u-sec-bd">${verdict}${compareTable(rows, 'A · 기존 비밸 최대', 'B · 전투 지수 최대')}<p class="u-tbl-note">● 표시는 두 세팅이 다른 항목입니다.</p></div></div>`);
  }
  function topList(metric) {
    const U = UI.single, R = U.res;
    const groups = R.groups.filter(x => (U.topType === 'all' || x.dt === U.topType) && (U.topBuf === 'all' || x.bufIdx === +U.topBuf));
    const rows = [];
    groups.forEach(gp => (metric === 'bv' ? gp.topBV : gp.topCI).forEach(r => rows.push(r)));
    rows.sort((a, b) => b[metric] - a[metric] || a.order - b.order);
    return rows.slice(0, 10).map(singleRowView);
  }
  function topCard(v, i, metric) {
    const P = UI.single.problem;
    return `<li class="ci-top-row">
      <div class="ci-top-hd"><span class="ci-rank">${i + 1}</span><b style="color:${D.DCOLORS[v.dt]}">${esc(v.dt)}</b><span class="ci-tag">${esc(P.buffs[v.bufIdx].label)}</span>
        <span class="ci-top-metric"><small>${metric === 'bv' ? '비밸' : '전투 지수'}</small><b class="${metric === 'ci' ? 'ci-idx' : ''}">${metric === 'bv' ? mil(v.bv) : ciFmt(v.ci) + '<small>CI</small>'}</b><small>${metric === 'bv' ? ciFmt(v.ci) + ' CI' : '비밸 ' + mil(v.bv)}</small></span></div>
      <div class="ci-top-body"><span>${colorAccName(v.accName)} ${encBadge(v.enc)}</span><span>${gemText(v.gems)}</span><span>${pendText(v.pend)}</span>
        <span class="ci-top-stats"><b class="u-hp">${num(v.fH)}</b> / <b class="u-atk">${num(v.fA)}</b> / <b class="u-def">${num(v.fD)}</b></span></div>
    </li>`;
  }
  function renderSingleTop() {
    const U = UI.single, P = U.problem;
    const html = `<div class="u-sec ci-mt"><div class="u-sec-hd">기준별 TOP 10</div><div class="u-sec-bd">
      <div class="u-seg ci-chips" id="s-top-type">${[['all', '전체 타입'], ...D.DTYPES.map(t => [t, t])].map(([k, l]) => `<button type="button" class="u-chip ${U.topType === k ? 'on' : ''}" data-toptype="${k}">${esc(l)}</button>`).join('')}</div>
      <div class="u-seg ci-chips ci-mt" id="s-top-buf">${[['all', '전체 버프'], ...P.buffs.map((b, i) => [String(i), b.label])].map(([k, l]) => `<button type="button" class="u-chip ${String(U.topBuf) === k ? 'on' : ''}" data-topbuf="${k}">${esc(l)}</button>`).join('')}</div>
      <p class="u-tbl-note">같은 장신구·펜던트·젬 칸 배분에서 더 낮은 젬을 쓰는 세팅은 항상 손해라 목록에서 뺐습니다.</p>
      <div class="ci-top-cols">
        <div><h3 class="ci-h3">기존 비밸 TOP 10</h3><ol class="ci-top">${topList('bv').map((v, i) => topCard(v, i, 'bv')).join('')}</ol></div>
        <div><h3 class="ci-h3">전투 지수 TOP 10</h3><ol class="ci-top">${topList('ci').map((v, i) => topCard(v, i, 'ci')).join('')}</ol></div>
      </div></div></div>`;
    stableHTML($('s-top'), html);
  }

  // ─────────────────────────── 결과: 3인조 ───────────────────────────
  function teamSetKey(p) { return [p.accKey, p.enc, p.pendKey, gemPlain(p.gems)].join('#'); }
  function usageCheck(res) {
    const P = UI.team.problem;
    const useA = new Map(), useP = new Map(), useG = STATS.map(() => [0, 0, 0, 0, 0]);
    res.picks.forEach(p => {
      useA.set(p.accKey, (useA.get(p.accKey) || 0) + 1);
      if (p.pendKey !== 'none') useP.set(p.pendKey, (useP.get(p.pendKey) || 0) + 1);
      p.gems.forEach((c, si) => c.forEach((n, lv) => { useG[si][lv] += n; }));
    });
    const okA = [...useA].every(([k, n]) => n <= (P.accClasses.find(a => a.key === k) || { mult: 0 }).mult);
    const okP = [...useP].every(([k, n]) => n <= (P.pendClasses.find(a => a.key === k) || { mult: 0 }).mult);
    const okG = useG.every((row, si) => row.every((n, lv) => lv === 0 || n <= P.gem.supply[si][lv]));
    const gemUse = STATS.map((s, si) => [4, 3, 2, 1].filter(lv => useG[si][lv] > 0).map(lv => `<span class="u-${s}">${SK[s]}${D.GEM_NAME[36 + lv]} ${useG[si][lv]}/${P.gem.supply[si][lv]}</span>`).join(' ')).filter(Boolean).join(' · ');
    return { ok: okA && okP && okG, html: `${okA ? '장신구 중복 없음' : '<span class="u-bad">장신구 중복!</span>'} · ${okP ? '펜던트 중복 없음' : '<span class="u-bad">펜던트 중복!</span>'} · ${okG ? '젬 보유 수량 이내' : '<span class="u-bad">젬 수량 초과!</span>'}${gemUse ? '<br><small>사용한 고급 젬(사용/보유): ' + gemUse + '</small>' : ''}` };
  }
  function exactText(r) {
    if (r.exact) return '<span class="u-badge ok">정확한 최적</span>';
    const gap = r.upperBound > r.value ? (r.upperBound - r.value) / r.value * 100 : 0;
    return `<span class="u-badge bad">시간 제한으로 중단</span><span class="sub">찾은 최선 · 최적과 최대 ${gap.toFixed(2)}% 차이 가능</span>`;
  }
  function renderTeamResults() {
    const U = UI.team, P = U.problem, R = U.res, A = R.bv, B = R.ci;
    const sumBV = r => r.picks.reduce((s, p) => s + p.bv, 0), sumCI = r => r.picks.reduce((s, p) => s + p.ci, 0);
    const sameAll = A.picks.every((p, i) => teamSetKey(p) === teamSetKey(B.picks[i]));
    const uA = usageCheck(A), uB = usageCheck(B);
    const totals = `<div class="u-tbl-wrap"><table class="u-tbl ci-sum"><thead><tr><th class="l"></th><th>A · 비밸 합 최대</th><th>B · 전투 지수 합 최대</th></tr></thead><tbody>
      <tr><td class="l">세 마리 기존 비밸 합</td><td><b>${mil(sumBV(A))}</b><span class="sub">백만</span></td><td>${mil(sumBV(B))}<span class="sub">${sgn(pct(sumBV(B), sumBV(A)))}</span></td></tr>
      <tr><td class="l">세 마리 전투 지수 합</td><td>${ciHTML(sumCI(A))}</td><td><b>${ciHTML(sumCI(B))}</b><span class="sub">${sgn(pct(sumCI(B), sumCI(A)))}</span></td></tr>
      <tr><td class="l">계산 상태</td><td>${exactText(A)}</td><td>${exactText(B)}</td></tr>
      <tr><td class="l">장비 사용 확인</td><td class="ci-wrap-cell">${uA.html}</td><td class="ci-wrap-cell">${uB.html}</td></tr>
    </tbody></table></div>`;
    const dragonSecs = P.dragons.map((dg, i) => {
      const a = A.picks[i], b = B.picks[i];
      const same = teamSetKey(a) === teamSetKey(b);
      const img = dragonImg(dg.name);
      const wk = [];
      STATS.forEach(s => { if (dg.plusBuf[s]) wk.push(`<span class="u-${s}">${SNAME[s]} +${dg.plusBuf[s]}</span>`); });
      STATS.forEach(s => { if (dg.minusBuf[s]) wk.push(`<span class="u-bad">${SNAME[s]} −${dg.minusBuf[s]}</span>`); });
      const rows = [
        { span: true, label: '드래곤 · 타입', html: `<span class="ci-dname">${img ? `<img src="${esc(img)}" alt="" onerror="this.hidden=true">` : ''}<b>${esc(dg.name)}</b> <img class="ci-attr" src="${esc(attrIcon(dg.attr))}" alt="" onerror="this.hidden=true">${esc(dg.attr)} · <b style="color:${D.DCOLORS[dg.dtype]}">${esc(dg.dtype)}</b> · ${esc(dg.growth)} ${dg.grade === '진각' ? '' : esc(dg.grade)}</span>` },
        { span: true, label: '적용한 버프', html: wk.join(' · ') || '<span class="u-dim">버프·디버프 없음</span>' },
        { span: true, label: '적용한 정령', html: spiritText(U.input.dragons[i]) },
        ...statRows(a, b),
        { label: '장신구 / 인챈트', a: `${colorAccName(a.accName)}<br>${encBadge(a.enc)}`, b: `${colorAccName(b.accName)}<br>${encBadge(b.enc)}`, aKey: a.accKey + a.enc, bKey: b.accKey + b.enc },
        { label: '젬 배분', a: gemText(a.gems), b: gemText(b.gems), aKey: gemPlain(a.gems), bKey: gemPlain(b.gems) },
        { label: '펜던트', a: pendText(a.pend), b: pendText(b.pend), aKey: a.pendKey, bKey: b.pendKey },
      ];
      return `<div class="u-sec ci-mt"><div class="u-sec-hd">${i + 1}. ${esc(dg.name)} ${same ? '<span class="u-badge ok">같음</span>' : '<span class="u-badge gold">다름</span>'}</div><div class="u-sec-bd">${compareTable(rows, 'A · 비밸 합 최대', 'B · 전투 지수 합 최대')}</div></div>`;
    }).join('');
    const html = `<section class="ci-results" id="t-results-anchor">
      <header class="ci-res-head"><h2>길드전 3인조 결과</h2>
        <p class="u-note">A = 세 마리 기존 비밸 합이 가장 큰 세팅 · B = 세 마리 전투 지수 합이 가장 큰 세팅. 장신구·펜던트는 한 마리만 쓰고, 젬은 보유 개수 안에서 나눠 씁니다. 팀 합계는 단순 합이며 팀 승률이 아닙니다. 비밸은 <b>백만</b> 단위, 전투 지수는 <b class="ci-idx">CI</b>(Combat Index, 1억 = 1 CI)로 표시합니다.</p>
        ${sameAll ? '<p><span class="u-badge ok">두 기준이 세 마리 모두 같은 세팅을 추천합니다</span></p>' : '<p><span class="u-badge gold">두 기준의 추천 세팅이 다릅니다</span> <span class="u-note">● 표시 항목을 확인하세요.</span></p>'}
      </header>
      ${totals}
      ${dragonSecs}
      <p class="u-tbl-note">계산 정보: 기준별 ${(A.stats.ms / 1000).toFixed(1)}초 / ${(B.stats.ms / 1000).toFixed(1)}초 · 장신구 ${P.accClasses.length}종 · 펜던트 ${P.pendClasses.length - 1}종(없음 제외)</p>
    </section>`;
    stableHTML($('t-results'), html);
  }

  // ─────────────────────────── 이벤트 연결 ───────────────────────────
  function bind() {
    $('ci-theme').onchange = e => { S.theme = e.target.value; applyTheme(); save(); };
    document.querySelector('.ci-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });

    // 내 스펙 불러오기 (읽기 전용)
    $('import-spec').onclick = () => {
      const st = $('import-status');
      try {
        const sp = readSpec();
        const acc = cleanAccCards(sp.accCards), pend = cleanPendants(sp.pendants), gems = cleanGems(sp.gems), coll = cleanColl(sp.coll);
        if ((S.accCards.length || S.pendants.length) && !confirm('이 테스트 페이지의 장신구·펜던트·젬·컬렉션을 내 스펙 값으로 바꿉니다. 내 스펙 자체는 바뀌지 않습니다. 계속할까요?')) return;
        S.accCards = acc; S.pendants = pend; S.gems = gems; S.coll = coll;
        renderAccOwned(); renderPendOwned(); renderGems(); renderColl(); save();
        st.innerHTML = `내 스펙에서 장신구 ${acc.length}개, 펜던트 ${pend.length}개, 젬, 컬렉션을 가져왔습니다. <span class="u-dim">(내 스펙은 읽기만 했습니다)</span>`;
        markDirty('single'); markDirty('team');
      } catch (e) { st.innerHTML = '<span class="u-bad">' + esc(e.message) + '</span>'; }
    };
    $('reset-gear').onclick = () => {
      if (!confirm('이 테스트 페이지의 장신구·펜던트·젬·컬렉션을 모두 비웁니다. (사이트의 내 스펙은 그대로입니다)')) return;
      S.accCards = []; S.pendants = []; S.gems = mkGems(); S.coll = { hp: 0, atk: 0, def: 0 };
      renderAccOwned(); renderPendOwned(); renderGems(); renderColl(); save();
      $('import-status').textContent = '테스트 장비를 비웠습니다.';
    };

    // 장신구
    $('qa-list').addEventListener('click', e => {
      const b = e.target.closest('[data-acc]'); if (!b) return;
      const a = D.ACC_DB[+b.dataset.acc], enc = $('qa-enc').value;
      S.accCards.push({ name: a.n, enchant: enc });
      patchAccRow(a.n, enc); save(); markDirty('single'); markDirty('team');
    });
    $('qa-level').onchange = renderQuickAcc; $('qa-search').oninput = renderQuickAcc; $('qa-stat-only').onchange = renderQuickAcc;
    $('qa-enc').onchange = updateAccCounts;
    $('acc-owned').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const [name, enc] = b.closest('[data-key]').dataset.key.split('|');
      if (b.dataset.act === 'inc') S.accCards.push({ name, enchant: enc });
      else { for (let i = S.accCards.length - 1; i >= 0; i--) if (S.accCards[i].name === name && S.accCards[i].enchant === enc) { S.accCards.splice(i, 1); break; } }
      patchAccRow(name, enc); save(); markDirty('single'); markDirty('team');
    });
    $('acc-clear').onclick = () => { if (!S.accCards.length || !confirm('넣은 장신구를 모두 지웁니다.')) return; S.accCards = []; renderAccOwned(); save(); };

    // 펜던트
    $('qp-type').onchange = renderQuickPend; $('qp-val').onchange = renderQuickPend;
    $('qp-list').addEventListener('click', e => {
      const b = e.target.closest('[data-pend]'); if (!b) return;
      const p = pendChoices[+b.dataset.pend]; if (!p) return;
      const np = { type: p.type, options: p.options.map(o => ({ ...o })) };
      S.pendants.push(np); patchPendRow(np); save(); markDirty('single'); markDirty('team');
    });
    $('qp-sunset').onclick = () => {
      for (let a = 0; a < 3; a++) for (let b = a; b < 3; b++) for (let c = b; c < 3; c++) { const np = { type: '태양', options: [a, b, c].map(i => ({ stat: STATS[i], val: 6 })) }; S.pendants.push(np); }
      renderPendOwned(); save(); markDirty('single'); markDirty('team');
    };
    $('cp-type').onchange = renderCustomPend;
    $('cp-add').onclick = () => {
      const type = $('cp-type').value, n = E.pendSlots(type);
      const options = Array.from({ length: n }, (_, i) => ({ stat: document.querySelector(`[data-cp="s${i}"]`).value, val: +document.querySelector(`[data-cp="v${i}"]`).value }));
      const np = { type, options };
      S.pendants.push(np); patchPendRow(np); save(); markDirty('single'); markDirty('team');
    };
    $('pend-owned').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const key = b.closest('[data-key]').dataset.key;
      const idx = S.pendants.findIndex(p => pendSig(p) === key); if (idx < 0) return;
      const p = S.pendants[idx];
      if (b.dataset.act === 'inc') S.pendants.push({ type: p.type, options: p.options.map(o => ({ ...o })) });
      else { for (let i = S.pendants.length - 1; i >= 0; i--) if (pendSig(S.pendants[i]) === key) { S.pendants.splice(i, 1); break; } }
      patchPendRow(p); save(); markDirty('single'); markDirty('team');
    });
    $('pend-clear').onclick = () => { if (!S.pendants.length || !confirm('넣은 펜던트를 모두 지웁니다.')) return; S.pendants = []; renderPendOwned(); save(); };

    // 젬 · 컬렉션
    $('gem-grid').addEventListener('input', e => {
      const el = e.target.closest('[data-gem]'); if (!el) return;
      const [s, k] = el.dataset.gem.split('|');
      S.gems[s][k] = toInt(el.value, 0, 9999); save(); markDirty('single'); markDirty('team');
    });
    $('gem-grid').addEventListener('change', e => { const el = e.target.closest('[data-gem]'); if (el) { const [s, k] = el.dataset.gem.split('|'); el.value = S.gems[s][k]; } });
    STATS.forEach(s => {
      $('coll-' + s).addEventListener('input', e => { S.coll[s] = toInt(e.target.value, 0, 99999); save(); markDirty('single'); markDirty('team'); });
      $('coll-' + s).addEventListener('change', e => { e.target.value = S.coll[s]; });
    });
    $('coll-full').onclick = () => { S.coll = { ...D.FULL_COLLECTION }; renderColl(); save(); markDirty('single'); markDirty('team'); };

    // 공용 옵션
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset && t.dataset.opt === 'enc') { S.encMode = t.value === 'fixed' ? 'fixed' : 'infinite'; syncOpts(); save(); markDirty('single'); markDirty('team'); }
      else if (t.dataset && t.dataset.opt === 'excSun') { S.excSun = t.checked; syncOpts(); save(); markDirty('single'); markDirty('team'); }
    });
    // 정령 입력 (단일 · 3인조)
    document.addEventListener('change', onSpiritChange);
    document.addEventListener('click', onSpiritPreset);

    // 단일 설정
    $('s-grade').addEventListener('click', e => { const b = e.target.closest('[data-grade]'); if (!b) return; S.single.grade = b.dataset.grade; refreshBuffUI(); save(); markDirty('single'); });
    $('s-buf-mode').onchange = e => { S.single.bufMode = e.target.value; refreshBuffUI(); save(); markDirty('single'); };
    $('s-buf-lv').addEventListener('click', e => { const b = e.target.closest('[data-buflv]'); if (!b) return; S.single.bufLv = +b.dataset.buflv; refreshBuffUI(); save(); markDirty('single'); });
    document.querySelectorAll('[data-mbuf]').forEach(sel => sel.onchange = () => { S.single.manual[sel.dataset.mbuf] = toInt(sel.value, 0, 2); refreshBuffUI(); save(); markDirty('single'); });
    $('s-spirit-from-spec').onclick = () => {
      const sel = $('s-spirit-pick');
      try {
        const list = loadSpecDragons();
        sel.innerHTML = '<option value="">정령을 가져올 드래곤 선택</option>' + list.map((d, i) => `<option value="${i}">${esc(specOptionText(d))}</option>`).join('');
        sel.hidden = false;
        $('s-status').textContent = '내 스펙의 드래곤 목록을 읽었습니다(읽기 전용). 고르면 정령 옵션만 복사합니다.';
        if (document.querySelector('[data-from-spec]')) fillSpecSelects();
      } catch (e) { $('s-status').innerHTML = '<span class="u-bad">' + esc(e.message) + '</span>'; }
    };
    $('s-spirit-pick').onchange = e => {
      const d = specDragons && specDragons[+e.target.value]; if (!d) return;
      S.single.spirit = cleanSpirit(d);
      let note = '';
      if (D.SINGLE_GRADES.includes(d.grade) && d.growth !== '진각') { S.single.grade = d.grade; refreshBuffUI(); }
      else note = ' (진각 드래곤은 정령 계산기처럼 7.0~9.0 등급만 계산하므로 등급은 그대로 둡니다)';
      $('s-spirit').innerHTML = spiritEditorHTML('single'); save(); markDirty('single');
      $('s-status').textContent = d.name + '의 정령 옵션을 가져왔습니다.' + note;
    };
    $('s-run').onclick = () => startRun('single');

    // 3인조 설정
    $('t-list-mode').onchange = e => { S.team.listMode = e.target.value; save(); };
    $('t-time').onchange = e => { S.team.timeLimitMs = +e.target.value; save(); };
    $('t-buffs').addEventListener('change', e => {
      const el = e.target.closest('[data-wk]'); if (!el) return;
      const key = el.closest('[data-weekly-key]').dataset.weeklyKey;
      if (el.dataset.wk === 'on') { if (key === 'buff') S.team.buffOn = el.checked; else S.team.debuffOn = el.checked; }
      else S.team.settingBuffs[key][el.dataset.wk] = el.value;
      updateWeeklyPreview(); save(); markDirty('team');
    });
    $('t-from-spec').onclick = () => {
      try { loadSpecDragons(); fillSpecSelects(); $('t-status').textContent = `내 스펙에서 드래곤 ${specDragons.length}마리를 읽었습니다(읽기 전용). 각 칸의 '내 스펙에서 고르기'로 넣으세요.`; }
      catch (e) { $('t-status').innerHTML = '<span class="u-bad">' + esc(e.message) + '</span>'; }
    };
    const dragons = $('t-dragons');
    dragons.addEventListener('change', e => {
      const card = e.target.closest('.ci-dragon'); if (!card) return;
      const i = +card.dataset.slot, d = S.team.dragons[i];
      if (e.target.matches('[data-growth]')) { d.growth = e.target.value; if (d.growth === '진각') d.grade = '진각'; else if (!['7.0', '8.0', '9.0'].includes(d.grade)) d.grade = '9.0'; patchDragonHead(i); }
      else if (e.target.matches('[data-grade]')) { d.grade = e.target.value; }
      else if (e.target.matches('[data-from-spec]')) {
        const src = specDragons && specDragons[+e.target.value]; if (!src) return;
        const r = resolveDragon(src.name);
        Object.assign(d, cleanDragon(src));
        if (r) { d.name = r.name; d.attr = r.attr; d.dtype = r.dtype || d.dtype; }
        else { $('t-status').innerHTML = `<span class="u-bad">${esc(src.name)}은(는) 현재 ${S.team.listMode === 'pvp' ? '길드전' : '뉴비 길드전'} 목록에 없습니다. 이름은 넣었지만 타입·속성을 확인해 주세요.</span>`; }
        const ed = card.querySelector('.ci-spirit-ed'); ed.outerHTML = spiritEditorHTML('team-' + i);
        patchDragonHead(i); e.target.value = '';
      } else return;
      save(); markDirty('team');
    });
    // 이름 검색 드롭다운
    dragons.addEventListener('input', e => {
      if (!e.target.matches('[data-name]')) return;
      const card = e.target.closest('.ci-dragon'), drop = card.querySelector('.ci-drop');
      const items = searchDragons(e.target.value);
      drop.innerHTML = items.length ? items.map(x => `<button type="button" class="ci-drop-item" data-pick="${esc(x.name)}" data-attr="${esc(x.attr)}"><img src="${esc(attrIcon(x.attr))}" alt="">${esc(x.name)}</button>`).join('') : '<div class="ci-drop-empty">목록에 없는 이름입니다</div>';
      drop.hidden = false;
    });
    dragons.addEventListener('focusin', e => { if (e.target.matches('[data-name]')) e.target.dispatchEvent(new Event('input', { bubbles: true })); });
    dragons.addEventListener('focusout', e => {
      if (!e.target.matches('[data-name]')) return;
      const card = e.target.closest('.ci-dragon');
      setTimeout(() => {
        card.querySelector('.ci-drop').hidden = true;
        const i = +card.dataset.slot, d = S.team.dragons[i];
        const val = e.target.value.trim();
        if (val === d.name) return;
        const r = val ? resolveDragon(val) : null;
        if (r) { d.name = r.name; d.attr = r.attr; d.dtype = r.dtype; }
        else { d.name = val; d.attr = ''; d.dtype = ''; }
        patchDragonHead(i); save(); markDirty('team');
      }, 180);
    });
    dragons.addEventListener('mousedown', e => { if (e.target.closest('.ci-drop')) e.preventDefault(); });
    dragons.addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      const card = b.closest('.ci-dragon'), i = +card.dataset.slot, d = S.team.dragons[i];
      const m = findDragonMatch(b.dataset.pick);
      d.name = b.dataset.pick; d.attr = b.dataset.attr; d.dtype = m ? m.type : '';
      card.querySelector('.ci-drop').hidden = true;
      patchDragonHead(i); save(); markDirty('team');
      if (!d.dtype) $('t-status').innerHTML = '<span class="u-bad">' + esc(d.name) + '의 타입을 찾지 못했습니다.</span>';
    });
    $('t-run').onclick = () => startRun('team');

    // 진행 취소
    document.querySelectorAll('.ci-cancel').forEach(b => b.onclick = () => { if (running) running.cancel(); });

    // 결과 조작 (다시 계산 없이 표시만 바꿈)
    $('s-results').addEventListener('click', e => {
      const U = UI.single; if (!U) return;
      let t;
      if ((t = e.target.closest('[data-selbuf]'))) { U.selBuf = +t.dataset.selbuf; renderSingleResults(); return; }
      if ((t = e.target.closest('#s-sum [data-type]'))) { U.selType = t.dataset.type; document.querySelectorAll('#s-sum [data-type]').forEach(r => r.classList.toggle('on', r.dataset.type === U.selType)); renderSingleDetail(); return; }
      if ((t = e.target.closest('[data-toptype]'))) { U.topType = t.dataset.toptype; renderSingleTop(); return; }
      if ((t = e.target.closest('[data-topbuf]'))) { U.topBuf = t.dataset.topbuf; renderSingleTop(); return; }
    });
    $('s-results').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('#s-sum [data-type]')) { e.preventDefault(); e.target.click(); } });
  }

  // ─────────────────────────── 시작 ───────────────────────────
  // 테마(ui.css)나 드래곤 목록을 못 읽었을 때 화면 맨 위에 알려 줍니다.
  function checkSiteFiles() {
    const missing = [];
    if (!getComputedStyle(document.documentElement).getPropertyValue('--u-r').trim()) missing.push('ui.css (테마)');
    if (!VIEWS) missing.push('dragons.js · dragon-views.js (드래곤 목록)');
    if (!missing.length) return;
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.style.cssText = 'margin:0 0 16px;padding:14px 16px;border:2px solid #e0706b;border-radius:8px;background:#2a1414;color:#fff;font:14px/1.75 sans-serif;word-break:keep-all';
    let where = location.pathname;
    try { where = decodeURIComponent(where); } catch (e) { /* 그대로 표시 */ }
    box.innerHTML = `<b>계산기 파일 일부를 읽지 못했어요: ${esc(missing.join(', '))}</b><br>
      이 계산기는 combat-index-test 폴더 안의 site-files 폴더에서 테마와 드래곤 목록을 읽어요. 파일을 낱개로 옮기지 말고 폴더째 두고 열어 주세요.<br>
      지금 연 파일: <code style="color:#ffd">${esc(where)}</code>`;
    document.querySelector('.ci-wrap').prepend(box);
  }

  function init() {
    applyTheme();
    checkSiteFiles();
    if (!VIEWS) {
      $('t-dragons').innerHTML = '<div class="u-warn bad">드래곤 목록(site-files/dragons.js)을 불러오지 못했습니다. combat-index-test 폴더를 통째로 두고 열어 주세요. 단일 모드와 장비 입력은 그대로 쓸 수 있습니다.</div>';
      $('t-run').disabled = true;
    }
    renderQuickAcc(); renderAccOwned();
    renderQuickPend(); renderCustomPend(); renderPendOwned();
    renderGems(); renderColl();
    renderSingleInputs();
    $('t-list-mode').value = S.team.listMode; $('t-time').value = String(S.team.timeLimitMs);
    $('t-opts').innerHTML = optsHTML('t'); syncOpts();
    renderWeekly();
    if (VIEWS) renderDragons();
    bind();
    showTab(S.tab);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
