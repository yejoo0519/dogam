/* 길드전 계산기 연동 — 다른 페이지에서 길드전 드래곤에 정령을 귀속하거나 예비 정령을 추가한다.
 * 드래곤 셋팅은 spec_sync.js와 같은 저장 위치(내 스펙 · 길드전 · 뉴비 · 활성 프리셋)에 함께 쓰고,
 * 업로드 대기 표시를 남겨 다음에 길드전/내 스펙 페이지를 열 때 클라우드에도 올라가게 한다.
 * 예비 정령은 길드전 페이지 저장값에만 들어간다. */
(function (w) {
  'use strict';
  var PRE = /\/en\//.test(location.pathname) ? 'dv1simEN' : 'dv1sim';
  var K = { spec: PRE + '_spec', presets: PRE + '_spec_presets', pending: PRE + '_dragon_pending', pvp: PRE + '_pvp', noob: PRE + '_noob' };
  var CATS = ['땅', '물', '불', '바람', '빛', '어둠', '여명', '황혼', '악몽'];

  function rd(k) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function wr(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid(p) { return p + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6); }
  function hasDr(dc) { return !!dc && Object.keys(dc).some(function (c) { return Array.isArray(dc[c]) && dc[c].some(function (d) { return d && d.name; }); }); }

  /* 지금 길드전 계산기가 쓰는 드래곤 셋팅 (내 스펙 → 길드전 저장값 순) */
  function current() {
    var spec = rd(K.spec), pvp = rd(K.pvp);
    if (spec && hasDr(spec.dragonCards)) return spec.dragonCards;
    if (pvp && hasDr(pvp.dragonCards)) return pvp.dragonCards;
    return null;
  }
  function dragons() {
    var dc = current(), out = [];
    if (!dc) return out;
    CATS.forEach(function (c) {
      (dc[c] || []).forEach(function (d, i) {
        if (d && d.name) out.push({ cat: c, idx: i, uid: d.uid || '', name: d.name, dtype: d.dtype || '', grade: d.grade || '', growth: d.growth || '' });
      });
    });
    return out;
  }
  function normOpts(opts) {
    return [0, 1, 2, 3].map(function (i) {
      var o = (opts || [])[i] || {};
      var st = ['hp', 'atk', 'def'].indexOf(o.stat) >= 0 ? o.stat : '';
      return { stat: st, type: st ? (o.type === '+' ? '+' : '%') : '' };
    });
  }
  function apply(dc, ref, opts, bonus) {
    var list = dc && dc[ref.cat];
    if (!Array.isArray(list)) return false;
    var d = null;
    if (ref.uid) d = list.find(function (x) { return x && x.uid === ref.uid; });
    if (!d) { var c = list[ref.idx]; if (c && c.name === ref.name) d = c; }
    if (!d) return false;
    d.opts = normOpts(opts);
    d.bonus = ['hp', 'atk', 'def'].indexOf(bonus) >= 0 ? bonus : '';
    return true;
  }
  /* 여러 드래곤에 한 번에 귀속: items = [{ref, opts, bonus}] */
  function setSpirits(items) {
    var dc = current();
    if (!dc) return 0;
    dc = JSON.parse(JSON.stringify(dc));
    var n = 0;
    items.forEach(function (it) { if (apply(dc, it.ref, it.opts, it.bonus)) n++; });
    if (!n) return 0;
    var spec = rd(K.spec) || {}; spec.dragonCards = dc; wr(K.spec, spec);
    [K.pvp, K.noob].forEach(function (k) { var o = rd(k); if (o || k === K.pvp) { o = o || {}; o.dragonCards = dc; wr(k, o); } });
    var P = rd(K.presets);
    if (P && P.v === 2 && Array.isArray(P.presets)) {
      var a = P.presets.find(function (p) { return p.id === P.activeId; }) || P.presets[0];
      if (a) { a.data = a.data || {}; a.data.dragonCards = dc; wr(K.presets, P); }
    }
    try { localStorage.setItem(K.pending, '1'); } catch (e) {}
    /* 이 페이지가 드래곤 셋팅을 메모리에 들고 있으면(내 스펙) 같이 바꿔서 오래된 값으로 덮어쓰지 않게 한다 */
    try { if (typeof S !== 'undefined' && S && S.dragonCards) S.dragonCards = JSON.parse(JSON.stringify(dc)); } catch (e) {}
    return n;
  }
  function addReserves(list) {
    if (!list.length) return 0;
    var o = rd(K.pvp) || {};
    if (!Array.isArray(o.reserveSpirits)) o.reserveSpirits = [];
    list.forEach(function (r) {
      o.reserveSpirits.push({ uid: uid('rsv'), name: String(r.name || '').slice(0, 30), opts: normOpts(r.opts), bonus: ['hp', 'atk', 'def'].indexOf(r.bonus) >= 0 ? r.bonus : '' });
    });
    wr(K.pvp, o);
    return list.length;
  }
  function label(d) { return d.cat + ' · ' + d.name + (d.dtype ? ' (' + d.dtype + ')' : ''); }

  w.GuildLink = { dragons: dragons, setSpirits: setSpirits, addReserves: addReserves, label: label };
})(window);
