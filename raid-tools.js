/* 디데락 조합 — 조합 탐색 + 출전 선택 화면 스크린샷 드래곤 인식(초월·강림) */
(function (root) {
  'use strict';
  const T = 32;              // 아틀라스 썸네일 크기
  const ATLAS_COLS = 20;
  const BOX_OFF_X = -0.03, BOX_OFF_Y = -0.03, BOX_SIZE = 1.06; // 칸(간격 줄 중심 기준) 대비 초상 위치
  const DARK = 24, GAP_DARK = 14;

  function lumOf(d, i) { return (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000; }

  function detectGrid(d, W, H) {
    const L = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) L[i] = lumOf(d, j);
    const y1 = Math.round(H * 0.25), y2 = Math.round(H * 0.75);
    const col = new Float32Array(W);
    for (let y = y1; y < y2; y++) { const r = y * W; for (let x = 0; x < W; x++) if (L[r + x] < DARK) col[x]++; }
    for (let x = 0; x < W; x++) col[x] /= (y2 - y1);
    const pk = (arr, v) => { const i = Math.round(v); let m = 0; for (let k = i - 1; k <= i + 1; k++) if (k >= 0 && k < arr.length && arr[k] > m) m = arr[k]; return m; };
    let best = { s: -1 };
    for (let p = H * 0.09; p <= H * 0.17; p += 0.25) {
      for (let x0 = 0; x0 + 7 * p < W; x0++) {
        let s = 0, mn = 1;
        for (let k = 0; k < 8; k++) { const v = pk(col, x0 + k * p); s += v; if (v < mn) mn = v; }
        s += mn * 4;
        if (s > best.s) best = { s, p, x0 };
      }
    }
    if (best.s < 0) return null;
    // 간격 줄 중심을 다시 잡아 피치·시작점을 보정 (디코더마다 픽셀이 조금씩 달라도 같은 결과가 나오게)
    const center = (arr, g, w) => {
      // g 근처에서 어두운 비율 0.5 이상이 이어지는 구간의 가운데
      const a = Math.max(0, Math.round(g - w)), b = Math.min(arr.length - 1, Math.round(g + w));
      let bi = -1, bv = 0.5;
      for (let i = a; i <= b; i++) if (arr[i] >= bv) { bv = arr[i]; bi = i; }
      if (bi < 0) return null;
      let l = bi, r = bi;
      while (l - 1 >= a && arr[l - 1] >= 0.5) l--;
      while (r + 1 <= b && arr[r + 1] >= 0.5) r++;
      return (l + r) / 2;
    };
    let p = best.p, x0 = best.x0;
    {
      const pts = [];
      // 양 끝 간격은 패널 테두리와 붙어 있어 안쪽 6줄만 사용
      for (let k = 1; k < 7; k++) { const c = center(col, x0 + k * p, p * 0.06); if (c !== null) pts.push([k, c]); }
      if (pts.length >= 4) {
        const n = pts.length, mk = pts.reduce((s, q) => s + q[0], 0) / n, mv = pts.reduce((s, q) => s + q[1], 0) / n;
        let cv = 0, vk = 0; for (const [k, v] of pts) { cv += (k - mk) * (v - mv); vk += (k - mk) * (k - mk); }
        p = cv / vk; x0 = mv - p * mk;
      }
    }
    const xa = Math.round(x0), xb = Math.round(x0 + 7 * p);
    const row = new Float32Array(H);
    for (let y = 0; y < H; y++) { const r = y * W; let c = 0; for (let x = xa; x < xb; x++) if (L[r + x] < DARK) c++; row[y] = c / (xb - xa); }
    let y0 = 0, bestYs = -1;
    for (let t = 0; t < p; t += 0.5) { let s = 0; for (let y = t; y < H; y += p) s += pk(row, y); if (s > bestYs) { bestYs = s; y0 = t; } }
    // 리스트 영역(세로 간격 줄이 이어지는 구간)
    const gapCnt = new Uint8Array(H);
    for (let y = 0; y < H; y++) {
      let c = 0;
      for (let k = 0; k < 8; k++) {
        const gx = Math.round(x0 + k * p); let m = 255;
        for (let x = Math.max(0, gx - 3); x <= Math.min(W - 1, gx + 3); x++) m = Math.min(m, L[y * W + x]);
        if (m < GAP_DARK) c++;
      }
      gapCnt[y] = c;
    }
    // 세로 간격 줄이 이어지는 가장 긴 구간(행 사이 짧은 끊김은 허용)
    let vpTop = -1, vpBot = -1, curTop = -1, last = -1;
    const maxDrop = p * 0.3;
    for (let y = 0; y < H; y++) {
      if (gapCnt[y] < 6) continue;
      if (curTop < 0 || y - last > maxDrop) curTop = y;
      last = y;
      if (last - curTop > vpBot - vpTop) { vpTop = curTop; vpBot = last; }
    }
    const cells = [];
    if (vpTop < 0) return { p, x0, cells };
    // 리스트 안쪽 가로 간격으로 행 위치 보정
    {
      const offs = [];
      for (let y = y0; y < H; y += p) {
        if (y < vpTop + p * 0.5 || y > vpBot - p * 0.5) continue;
        const c = center(row, y, p * 0.06);
        if (c !== null) offs.push(c - Math.round((c - y0) / p) * p);
      }
      if (offs.length) y0 = offs.reduce((a, b) => a + b, 0) / offs.length;
      while (y0 - p >= 0) y0 -= p;
    }
    // 칸 안쪽(위아래 25% 제외)이 리스트 영역 안에 다 들어온 행만 사용
    let r = 0;
    for (let y = y0; y + p < H + 1; y += p) {
      if (y + p * 0.25 >= vpTop && y + p * 0.75 <= vpBot) {
        for (let c = 0; c < 7; c++) cells.push({ col: c, row: r, x: x0 + c * p, y, p });
        r++;
      }
    }
    return { p, x0, cells };
  }

  // 아래쪽 배지: 별 배지(초월·강림) / 보라 점(일반 성체) / 없음
  function badgeOf(d, W, H, c) {
    let pink = 0, pur = 0, n = 0;
    for (let v = 0.80; v < 0.97; v += 0.01) for (let u = 0.1; u < 0.9; u += 0.01) {
      const x = Math.round(c.x + u * c.p), y = Math.round(c.y + v * c.p);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2]; n++;
      if (R > 190 && G < 120 && B < 160 && R - B > 50) pink++;
      if (B > 190 && R > 120 && G < 150 && B > R + 10) pur++;
    }
    if (!n) return null;
    if (pink / n > 0.05 && pink >= pur) return 'star';
    if (pur / n > 0.08) return 'dots';
    return null;
  }

  // 비교에 쓸 썸네일 픽셀 마스크(타입 배지·아래 배지·테두리 제외)
  const MASK = (function () {
    const m = new Uint8Array(T * T);
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const cu = BOX_OFF_X + (u + 0.5) / T * BOX_SIZE, cv = BOX_OFF_Y + (v + 0.5) / T * BOX_SIZE;
      let ok = cu > 0.06 && cu < 0.94 && cv > 0.06 && cv < 0.76;
      if (cu > 0.5 && cv < 0.22) ok = false;
      m[v * T + u] = ok ? 1 : 0;
    }
    return m;
  })();

  function sampleCell(d, W, H, c) {
    const out = new Float32Array(T * T * 3);
    const S = BOX_SIZE * c.p, ox = c.x + BOX_OFF_X * c.p, oy = c.y + BOX_OFF_Y * c.p, step = S / T;
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
        const x = Math.round(ox + (u + (sx + 0.5) / 3) * step), y = Math.round(oy + (v + (sy + 0.5) / 3) * step);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
      const o = (v * T + u) * 3; if (n) { out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; }
    }
    return out;
  }

  // atlas: {data(RGBA), width}, list: [[id, stage], ...]
  function buildRefs(atlas, list) {
    return list.map(([id, stage], k) => {
      const ax = (k % ATLAS_COLS) * T, ay = Math.floor(k / ATLAS_COLS) * T;
      const px = new Float32Array(T * T * 3), w = new Uint8Array(T * T);
      for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
        const i = ((ay + v) * atlas.width + ax + u) * 4, o = (v * T + u) * 3;
        px[o] = atlas.data[i]; px[o + 1] = atlas.data[i + 1]; px[o + 2] = atlas.data[i + 2];
        w[v * T + u] = (atlas.data[i + 3] > 200 && MASK[v * T + u]) ? 1 : 0;
      }
      return { id, stage, px, w };
    });
  }

  function score(sample, ref) {
    let s = 0, n = 0;
    for (let k = 0; k < T * T; k++) {
      if (!ref.w[k]) continue;
      const o = k * 3;
      s += Math.abs(sample[o] - ref.px[o]) + Math.abs(sample[o + 1] - ref.px[o + 1]) + Math.abs(sample[o + 2] - ref.px[o + 2]);
      n++;
    }
    return n > 60 ? s / n / 3 : 999;
  }

  // 반환: [{cell, badge, sure, matches:[{id,stage,score}]}]
  // 보라 점 배지(초월 전)는 제외. 배지가 없고 확실히 맞는 드래곤도 없으면 제외.
  function scan(d, W, H, refs) {
    const g = detectGrid(d, W, H);
    if (!g || !g.cells.length) return [];
    const res = [];
    for (const c of g.cells) {
      const badge = badgeOf(d, W, H, c);
      if (badge === 'dots') continue;
      const smp = sampleCell(d, W, H, c);
      const best = new Map();
      for (const r of refs) {
        const s = score(smp, r), b = best.get(r.id);
        if (!b || s < b.score) best.set(r.id, { id: r.id, stage: r.stage, score: s });
      }
      const ms = [...best.values()].sort((a, b) => a.score - b.score).slice(0, 5);
      const margin = ms.length > 1 ? ms[1].score - ms[0].score : 99;
      const sure = ms.length > 0 && margin >= 8;
      if (!badge && !sure) continue;
      res.push({ cell: c, badge, sure, matches: ms });
    }
    return res;
  }


  // 디데락 조합 탐색: 패턴 조건(속성·타입 마리 수)을 정확히 맞추는 조합을 전부 탐색한다.
  // dims: [{kind:'e'|'t', key, need}], lists: 플레이어별 드래곤 배열({e,t,...}), k: 1인당 마리 수
  function raidSolveExact(dims, lists, k) {
    const D = dims.length, K1 = k + 1;
    const mul = []; let S = 1;
    for (const d of dims) { mul.push(S); S *= d.need + 1; }
    const N = S * K1;
    const target = dims.reduce((s, d, i) => s + d.need * mul[i], 0);
    const eIdx = {}, tIdx = {};
    dims.forEach((d, i) => { if (d.kind === 'e') eIdx[d.key] = i; else tIdx[d.key] = i; });
    const get = (code, i) => Math.floor(code / mul[i]) % (dims[i].need + 1);
    const addDim = (code, i, c) => (i < 0 || !c) ? code : (get(code, i) + c > dims[i].need ? -1 : code + c * mul[i]);
    const addVec = (a, b) => { for (let i = 0; i < D; i++) { const c = get(b, i); if (c && (a = addDim(a, i, c)) < 0) return -1; } return a; };
    const subVec = (a, b) => { for (let i = 0; i < D; i++) { const c = get(b, i); if (c) { if (get(a, i) < c) return -1; a -= c * mul[i]; } } return a; };

    const players = lists.map(list => {
      const m = new Map();
      for (const d of list) {
        const ei = d.e in eIdx ? eIdx[d.e] : -1, ti = d.t in tIdx ? tIdx[d.t] : -1, key = ei + ',' + ti;
        if (!m.has(key)) m.set(key, { ei, ti, ds: [] });
        m.get(key).ds.push(d);
      }
      return [...m.values()];
    });

    // 한 플레이어가 정확히 k마리로 만들 수 있는 조건 벡터 목록
    let bufA = new Uint8Array(N), bufB = new Uint8Array(N);
    function options(classes) {
      let cur = bufA, nxt = bufB, act = [0];
      cur[0] = 1;
      for (const cl of classes) {
        const nact = [];
        for (const key of act) {
          const code = Math.floor(key / K1), used = key % K1, maxC = Math.min(cl.ds.length, k - used);
          for (let c = 0; c <= maxC; c++) {
            let c2 = addDim(code, cl.ei, c); if (c2 < 0) break;
            c2 = addDim(c2, cl.ti, c); if (c2 < 0) break;
            const k2 = c2 * K1 + used + c;
            if (!nxt[k2]) { nxt[k2] = 1; nact.push(k2); }
          }
        }
        for (const key of act) cur[key] = 0;
        [cur, nxt] = [nxt, cur]; act = nact;
      }
      for (const key of act) cur[key] = 0;
      return act.filter(x => x % K1 === k).map(x => Math.floor(x / K1));
    }

    // 정한 벡터를 실제 드래곤으로 채우기
    function realize(classes, want) {
      const fail = new Set();
      const pick = [];
      function dfs(ci, rem, used) {
        if (ci === classes.length) return rem === 0 && used === k;
        const key = (ci * S + rem) * K1 + used;
        if (fail.has(key)) return false;
        const cl = classes[ci], maxC = Math.min(cl.ds.length, k - used);
        for (let c = maxC; c >= 0; c--) {
          let r = rem;
          if (c) {
            if (cl.ei >= 0) { if (get(r, cl.ei) < c) continue; r -= c * mul[cl.ei]; }
            if (cl.ti >= 0) { if (get(r, cl.ti) < c) continue; r -= c * mul[cl.ti]; }
          }
          pick.push(c);
          if (dfs(ci + 1, r, used + c)) return true;
          pick.pop();
        }
        fail.add(key);
        return false;
      }
      if (!dfs(0, want, 0)) return null;
      return classes.flatMap((cl, i) => cl.ds.slice(0, pick[i]));
    }

    const opts = players.map(options);
    let vecs = null;
    if (players.length === 1) {
      if (opts[0].includes(target)) vecs = [target];
    } else if (players.length === 2) {
      const s1 = new Set(opts[1]);
      for (const a of opts[0]) { const b = subVec(target, a); if (b >= 0 && s1.has(b)) { vecs = [a, b]; break; } }
    } else {
      // 앞 두 명 합을 모아두고, 뒤 두 명 합으로 맞춘다
      const left = new Map();
      for (const a of opts[0]) for (const b of opts[1]) {
        const s = addVec(a, b);
        if (s >= 0 && !left.has(s)) left.set(s, [a, b]);
      }
      const seen = new Set();
      outer:
      for (const c of opts[2]) for (const d of opts[3]) {
        const s = addVec(c, d);
        if (s < 0 || seen.has(s)) continue;
        seen.add(s);
        const rem = subVec(target, s);
        if (rem >= 0 && left.has(rem)) { vecs = left.get(rem).concat([c, d]); break outer; }
      }
    }
    if (!vecs) return null;
    return players.map((cl, i) => realize(cl, vecs[i]));
  }

  // 전부 맞출 수 없으면 맞추는 조건 수가 가장 많은 조합을 찾는다(조건을 적게 풀어주는 순서).
  function raidSolve(dims, lists, k, budgetMs) {
    const exact = raidSolveExact(dims, lists, k);
    if (exact) return { teams: exact, exact: true };
    const D = dims.length, start = Date.now();
    for (let r = 1; r <= D; r++) {
      const combos = [];
      (function gen(s, acc) { if (acc.length === r) { combos.push(acc.slice()); return; } for (let i = s; i < D; i++) { acc.push(i); gen(i + 1, acc); acc.pop(); } })(0, []);
      let best = null, bestMet = -1;
      for (const drop of combos) {
        if (r < D && Date.now() - start > (budgetMs || 6000)) break;
        const sub = dims.filter((_, i) => !drop.includes(i));
        const teams = raidSolveExact(sub, lists, k);
        if (!teams) continue;
        const cnt = {};
        for (const d of teams.flat()) { cnt['e' + d.e] = (cnt['e' + d.e] || 0) + 1; cnt['t' + d.t] = (cnt['t' + d.t] || 0) + 1; }
        const met = dims.filter(d => (cnt[d.kind + d.key] || 0) === d.need).length;
        if (met > bestMet) { bestMet = met; best = teams; }
      }
      if (best) return { teams: best, exact: false };
    }
    return { teams: lists.map(l => l.slice(0, k)), exact: false };
  }

  const api = { solve: raidSolve, detectGrid, badgeOf, buildRefs, scan, T, ATLAS_COLS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DV1_RAID = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
