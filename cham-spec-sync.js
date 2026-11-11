/* 챔대 계산기: 열 때 클라우드의 내 스펙(장신구·젬·펜던트)을 받아와 이 기기의 오래된 사본을 바꾼다.
   (다른 기기에서 지운 장신구가 계속 계산에 들어가던 문제) + 계산에 쓰는 장신구 목록 보기 */
(function () {
  'use strict';
  var EN = typeof IS_EN !== 'undefined' && IS_EN;
  var PRE = EN ? 'dv1simEN' : 'dv1sim';
  var K = { spec: PRE + '_spec', presets: PRE + '_spec_presets' };
  function rd(k) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var GEAR = ['accCards', 'gems', 'pendants', 'coll'];
  function sig(o) { o = o || {}; return JSON.stringify(GEAR.map(function (f) { return o[f] || null; })); }

  async function pull() {
    var u = typeof getUser === 'function' ? getUser() : null;
    if (!u || typeof supabase !== 'function') return false;
    var rows = await supabase('GET', 'users', null, '?id=eq.' + u.id + '&select=spec_data');
    var raw = rows && rows[0] && rows[0].spec_data;
    if (!raw) return false;
    if (typeof raw === 'string') raw = JSON.parse(raw);
    var P = raw && raw.v === 2 && Array.isArray(raw.presets) && raw.presets.length ? raw : { v: 2, activeId: 'p1', presets: [{ id: 'p1', name: '기본', data: raw }] };
    var lp = rd(K.presets), want = lp && lp.activeId && P.presets.some(function (x) { return x.id === lp.activeId; }) ? lp.activeId : P.activeId;
    var a = P.presets.find(function (x) { return x.id === want; }) || P.presets[0];
    var d = a.data || {};
    var spec = rd(K.spec) || {};
    if (sig(spec) === sig(d)) return false;
    GEAR.forEach(function (f) { spec[f] = d[f] || (f === 'accCards' || f === 'pendants' ? [] : {}); });
    wr(K.spec, spec);
    if (lp && Array.isArray(lp.presets)) {
      var la = lp.presets.find(function (x) { return x.id === want; });
      if (la) { la.data = la.data || {}; GEAR.forEach(function (f) { la.data[f] = spec[f]; }); wr(K.presets, lp); }
    }
    return true;
  }
  function refreshView() {
    try { loadSpec(); renderSpecLine(); if (S.page === 'sim' && typeof renderSim === 'function') renderSim(); if (S.page === 'spx' && typeof renderSpxSetting === 'function') renderSpxSetting(); } catch (e) { console.warn(e); }
  }

  /* 장신구 목록 보기: 상단 '장신구 N' 을 누르면 펼침 */
  function accList() {
    if (!SPEC || !SPEC.accCards.length) return EN ? 'No accessories in My Spec.' : '내 스펙에 장신구가 없어요.';
    return SPEC.accCards.map(function (a) { return typeof nm === 'function' ? nm(a) : a.ko; }).join(' · ');
  }
  var open = false;
  function decorate() {
    var line = document.getElementById('spec-line'); if (!line) return;
    var acc = Array.prototype.find.call(line.querySelectorAll('span'), function (s) { return /^(장신구|Accessories)/.test(s.textContent.trim()); });
    if (!acc || acc.dataset.cs) return;
    acc.dataset.cs = '1'; acc.style.cursor = 'pointer'; acc.style.textDecoration = 'underline dotted';
    acc.title = EN ? 'Show accessories used in the calculation' : '계산에 쓰는 장신구 보기';
    acc.onclick = function () { open = !open; draw(); };
    draw();
  }
  function draw() {
    var line = document.getElementById('spec-line'); if (!line) return;
    var box = document.getElementById('cs-acc');
    if (!open) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.id = 'cs-acc'; box.style.cssText = 'font-size:12px;color:var(--dim);line-height:1.7;margin:6px 0 2px;padding:8px 10px;border:1px solid var(--bd);border-radius:8px'; line.parentNode.insertBefore(box, line.nextSibling); }
    box.innerHTML = '<b style="color:var(--text)">' + (EN ? 'Accessories in use' : '계산에 쓰는 장신구') + '</b><br>' + accList().replace(/</g, '&lt;') +
      '<br><span style="color:var(--dimmer)">' + (EN ? 'Taken from My Spec. If something is wrong, fix it in My Spec.' : '내 스펙에서 가져와요. 없는 장신구가 있으면 내 스펙에서 지워 주세요.') + '</span>';
  }
  var orig = window.renderSpecLine;
  if (typeof orig === 'function') window.renderSpecLine = renderSpecLine = function () { var r = orig.apply(this, arguments); decorate(); if (open) draw(); return r; };

  function start() {
    decorate();
    pull().then(function (changed) { if (changed) refreshView(); }).catch(function (e) { console.warn('[cham-spec-sync]', e); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
