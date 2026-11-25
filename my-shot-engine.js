/* 내 스펙 스크린샷 인식 엔진
   게임 인벤토리 팝업(5열 카드) 스크린샷에서 장신구 · 펜던트 · 젬 · 정령을 읽습니다.
   - 카드 위치: 화면 중앙과 높이 기준 고정 배치 + 세로 스크롤만 탐색
   - 스탯 종류: 숫자 글자색 (노랑=체, 빨강=공, 하늘=방, 초록/보라=기타)
   - 숫자: 게임 폰트에서 뽑은 템플릿과 모양 비교
   이미지는 브라우저 안에서만 처리되고 어디로도 전송되지 않습니다. */
(function () {
  'use strict';
  var BG = [41, 40, 33];
  var TW = 12, TH = 18;
  var TITLE_MAX_D = 0.2, DIGIT_MAX_D = 0.2;

  var TPL = (window.DV1_SHOT_TPL || []).map(function (t) {
    var v = new Float32Array(TW * TH);
    for (var i = 0; i < v.length; i++) v[i] = parseInt(t[2][i], 16) / 15;
    return { c: t[0], a: t[1], v: v, digit: /^[0-9]$/.test(t[0]) };
  });
  var PEND = window.DV1_SHOT_PEND || {};

  function Img(data, w, h) { this.d = data; this.w = w; this.h = h; }
  Img.prototype.px = function (x, y) { var i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2]]; };

  /* ---------- 영역 / 카드 ---------- */
  /* 검은 여백(레터박스)과 폰 내비게이션 바를 뺀 게임 화면 영역.
     줄/칸마다 '검지 않은 픽셀'이 20% 넘는 구간 중 가장 긴 구간을 고릅니다 (JPEG 번짐, 내비 버튼 아이콘 무시) */
  function contentRect(im) {
    var d = im.d, w = im.w, h = im.h, x, y, i;
    var step = Math.max(1, Math.floor(Math.min(w, h) / 360));
    var colN = new Float32Array(w), rowN = new Float32Array(h), nx = 0, ny = 0;
    function lit(p) { return d[p] > 18 || d[p + 1] > 18 || d[p + 2] > 18; }
    for (y = 0; y < h; y += step) ny++;
    for (x = 0; x < w; x += step) nx++;
    for (x = 0; x < w; x++) { var n = 0; for (y = 0; y < h; y += step) if (lit((y * w + x) * 4)) n++; colN[x] = n / ny; }
    for (y = 0; y < h; y++) { var m = 0; for (x = 0; x < w; x += step) if (lit((y * w + x) * 4)) m++; rowN[y] = m / nx; }
    function longest(arr, len) {
      var bs = -1, be = -1, s0 = -1, last = -1, gapMax = Math.max(3, Math.round(len * 0.01));
      for (var p = 0; p <= len; p++) {
        var on = p < len && arr[p] > 0.2;
        if (on) { if (s0 < 0) s0 = p; last = p; continue; }
        if (s0 >= 0 && p < len && p - last <= gapMax) continue;   // 테두리 선 같은 얇은 어두운 줄은 이어 붙임
        if (s0 >= 0) { if (last + 1 - s0 > be - bs) { bs = s0; be = last + 1; } s0 = -1; }
      }
      return bs < 0 ? null : [bs, be];
    }
    var cx = longest(colN, w), cy = longest(rowN, h);
    if (!cx || !cy) return null;
    return { x0: cx[0], x1: cx[1], y0: cy[0], y1: cy[1] };
  }
  function isBg(im, x, y) {
    var i = (y * im.w + x) * 4;
    return Math.abs(im.d[i] - BG[0]) <= 14 && Math.abs(im.d[i + 1] - BG[1]) <= 14 && Math.abs(im.d[i + 2] - BG[2]) <= 14;
  }
  function colRuns(im, x, k) {
    var res = [], s = -1, gap = 0, lastOn = -1;
    for (var y = 0; y <= im.h; y++) {
      var on = y < im.h && isBg(im, x, y);
      if (on) { if (s < 0) s = y; lastOn = y; gap = 0; continue; }
      if (s >= 0 && y < im.h && ++gap <= 2) continue;   // JPEG 잡음 몇 픽셀은 이어 붙임
      if (s >= 0) {
        var hgt = lastOn + 1 - s;
        if (Math.abs(hgt - 319 * k) <= 25 * k) res.push(s);
        s = -1; gap = 0;
      }
    }
    return res;
  }
  function findCards(im) {
    var r = contentRect(im); if (!r) return [];
    var k = (r.y1 - r.y0) / 1080, cx = (r.x0 + r.x1) / 2, out = [];
    for (var c = 0; c < 5; c++) {
      var left = cx + k * (-805.5 + 330 * c);
      // 카드 왼쪽 배경 띠(폭 약 12)를 세로로 훑음. 잘라낸 캡처는 위치가 몇 px 어긋나므로 몇 군데 찔러 봄
      var P = [7, 3, 11, -1, 15, -5], ts = [];
      for (var q = 0; q < P.length && !ts.length; q++) {
        var x = Math.round(left + P[q] * k);
        if (x >= 0 && x < im.w) ts = colRuns(im, x, k);
      }
      ts.forEach(function (t) { out.push({ col: c, l: Math.round(left), t: t, k: k }); });
    }
    if (!out.length) out = findCardsCropped(im);
    else refineCards(im, out);
    out.sort(function (a, b) { return Math.abs(a.t - b.t) > 30 * a.k ? a.t - b.t : a.col - b.col; });
    return out;
  }
  /* 화면 높이로 잡은 배율 · 위치가 조금 어긋난 캡처(팝업만 잘라낸 캡처 등)용 보정:
     카드 왼쪽 끝(배경 띠 시작)을 실제로 찾아 맞추고, 칸 간격(330)으로 배율을 다시 잡는다 */
  function refineCards(im, cards) {
    var k = cards[0].k;
    cards.forEach(function (c) {
      var y = Math.round(c.t + 160 * k), best = null;
      if (y >= im.h) return;
      for (var x = Math.round(c.l - 14 * k); x <= Math.round(c.l + 14 * k); x++) {
        if (x < 1 || x + 8 * k >= im.w) continue;
        if (isBg(im, x - 1, y) || !isBg(im, x, y)) continue;
        var ok = true;
        for (var xx = x; xx < x + 8 * k; xx++) if (!isBg(im, Math.round(xx), y)) { ok = false; break; }
        if (ok && (best == null || Math.abs(x - c.l) < Math.abs(best - c.l))) best = x;
      }
      if (best == null) return;
      c.l = best;
    });
    var ps = [];
    cards.forEach(function (a) { cards.forEach(function (b) {
      var dc = b.col - a.col;
      if (dc > 0 && Math.abs(a.t - b.t) <= 6 * k) ps.push((b.l - a.l) / dc / 330);
    }); });
    if (!ps.length) return;
    ps.sort(function (a, b) { return a - b; });
    var nk = ps[ps.length >> 1];
    if (Math.abs(nk - k) / k <= 0.06) cards.forEach(function (c) { c.k = nk; });
  }
  /* 잘라낸 캡처용: 화면 크기에 기대지 않고 카드 배경색이 가로로 이어진 길이(카드 폭 291)로 배율을 구해 카드를 찾습니다 */
  function vRuns(im, x, k, left, col, out) {
    var s = -1, gap = 0, lastOn = -1;
    for (var y = 0; y <= im.h; y++) {
      var on = y < im.h && isBg(im, x, y);
      if (on) { if (s < 0) s = y; lastOn = y; gap = 0; continue; }
      if (s >= 0 && y < im.h && ++gap <= 2) continue;
      if (s >= 0) {
        var hgt = lastOn + 1 - s;
        if (Math.abs(hgt - 319 * k) <= 25 * k) out.push({ col: col, l: Math.round(left), t: s, k: k });
        s = -1; gap = 0;
      }
    }
  }
  function findCardsCropped(im) {
    var w = im.w, h = im.h, hist = {}, starts = [], y, x;
    var ystep = Math.max(1, Math.floor(h / 600));
    for (y = 0; y < h; y += ystep) {
      x = 0;
      while (x < w) {
        if (!isBg(im, x, y)) { x++; continue; }
        var s0 = x; while (x < w && isBg(im, x, y)) x++;
        var len = x - s0;
        if (len >= 60 && len <= w / 3) { var b = len >> 1; hist[b] = (hist[b] || 0) + 1; starts.push([s0, len]); }
      }
    }
    var best = -1, bn = 0;
    for (var key in hist) { var n = (hist[key] || 0) + (hist[+key - 1] || 0) + (hist[+key + 1] || 0); if (n > bn) { bn = n; best = +key; } }
    if (best < 0 || bn < 10) return [];
    var L = best * 2 + 1, k = L / 291, lefts = [];
    starts.forEach(function (st) {
      if (Math.abs(st[1] - L) > 4 * Math.max(1, k)) return;
      for (var i = 0; i < lefts.length; i++) if (Math.abs(lefts[i][0] - st[0]) <= 3) { lefts[i][1]++; return; }
      lefts.push([st[0], 1]);
    });
    lefts = lefts.filter(function (l) { return l[1] >= 3; }).sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    lefts.forEach(function (l, i) { var x0 = Math.round(l[0] + 7 * k); if (x0 < w) vRuns(im, x0, k, l[0], i, out); });
    return out;
  }

  /* ---------- 마스크 / 글자 분할 ---------- */
  function region(im, card, x0r, x1r, y0r, y1r) {
    var k = card.k;
    var x0 = Math.max(0, Math.floor(card.l + x0r * k)), x1 = Math.min(im.w, Math.floor(card.l + x1r * k));
    var y0 = Math.max(0, Math.floor(card.t + y0r * k)), y1 = Math.min(im.h, Math.floor(card.t + y1r * k));
    return { x0: x0, y0: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
  }
  var CLS = {
    hp: function (r, g, b) { return r > 120 && g > 120 && b < 90 && Math.abs(r - g) < 70; },
    atk: function (r, g, b) { return r > 140 && g < 90 && b < 100; },
    def: function (r, g, b) { return b > 140 && g > 110 && r < 120; },
    grn: function (r, g, b) { return g > 140 && r < 120 && b < 120; },
    mag: function (r, g, b) { return r > 140 && b > 140 && g < 120; }
  };
  function maskOf(im, rg, fn) {
    var m = new Uint8Array(rg.w * rg.h), n = 0;
    for (var y = 0; y < rg.h; y++) for (var x = 0; x < rg.w; x++) {
      var i = ((rg.y0 + y) * im.w + rg.x0 + x) * 4;
      if (fn(im.d[i], im.d[i + 1], im.d[i + 2])) { m[y * rg.w + x] = 1; n++; }
    }
    return { m: m, w: rg.w, h: rg.h, n: n };
  }
  function whiteMask(im, rg) { return maskOf(im, rg, function (r, g, b) { return r > 150 && g > 150 && b > 150; }); }
  function segment(M, minH) {
    var out = [], s = -1;
    for (var x = 0; x <= M.w; x++) {
      var on = false;
      if (x < M.w) for (var y = 0; y < M.h; y++) if (M.m[y * M.w + x]) { on = true; break; }
      if (on && s < 0) s = x;
      if (!on && s >= 0) {
        var r0 = -1, r1 = -1;
        for (var yy = 0; yy < M.h; yy++) {
          for (var xx = s; xx < x; xx++) if (M.m[yy * M.w + xx]) { if (r0 < 0) r0 = yy; r1 = yy + 1; break; }
        }
        if (r0 >= 0 && r1 - r0 >= minH) out.push([s, x, r0, r1]);
        s = -1;
      }
    }
    return out;
  }
  function splitWide(M, bx) {
    var out = [];
    bx.forEach(function (b) {
      var s = b[0], e = b[1], r0 = b[2], r1 = b[3], w = e - s, h = r1 - r0;
      if (h > 0 && w / h > 0.95) {
        var n = Math.max(2, Math.round(w / (0.62 * h))), prof = [], q, x, y;
        for (x = 0; x < w; x++) { var c = 0; for (y = r0; y < r1; y++) c += M.m[y * M.w + s + x]; prof.push(c); }
        var cuts = [0];
        for (q = 1; q < n; q++) {
          var cc = Math.floor(w * q / n), lo = Math.max(1, cc - Math.floor(w / (n * 3))), hi = Math.min(w - 1, cc + Math.floor(w / (n * 3)));
          if (hi > lo) { var best = lo; for (x = lo; x < hi; x++) if (prof[x] < prof[best]) best = x; cc = best; }
          cuts.push(cc);
        }
        cuts.push(w);
        for (q = 0; q < cuts.length - 1; q++) {
          var a0 = -1, a1 = -1;
          for (y = r0; y < r1; y++) for (x = s + cuts[q]; x < s + cuts[q + 1]; x++) if (M.m[y * M.w + x]) { if (a0 < 0) a0 = y; a1 = y + 1; break; }
          if (a0 >= 0) out.push([s + cuts[q], s + cuts[q + 1], a0, a1]);
        }
      } else out.push(b);
    });
    return out;
  }
  function normGlyph(M, b) {
    var s = b[0], w = b[1] - b[0], r0 = b[2], h = b[3] - b[2], v = new Float32Array(TW * TH);
    for (var i = 0; i < TH; i++) for (var j = 0; j < TW; j++) {
      var acc = 0;
      for (var p = 0; p < 4; p++) for (var u = 0; u < 4; u++) {
        var x = Math.floor((j + (u + 0.5) / 4) * w / TW), y = Math.floor((i + (p + 0.5) / 4) * h / TH);
        acc += M.m[(r0 + y) * M.w + s + x];
      }
      v[i * TW + j] = acc / 16;
    }
    return v;
  }
  function classify(M, b, digitsOnly) {
    var v = normGlyph(M, b), asp = (b[1] - b[0]) / (b[3] - b[2]), best = null, bd = 9;
    for (var t = 0; t < TPL.length; t++) {
      var T = TPL[t]; if (digitsOnly && !T.digit) continue;
      var d = 0; for (var i = 0; i < v.length; i++) d += Math.abs(v[i] - T.v[i]);
      d = d / v.length + 0.5 * Math.abs(asp - T.a);
      if (d < bd) { bd = d; best = T.c; }
    }
    return { c: best, d: bd };
  }

  /* ---------- 카드 해석 ---------- */
  /* 위치가 1~3px 어긋나면 작은 숫자가 잘려 6→4처럼 틀리게 읽혀서, 위아래로 조금씩 옮겨 가장 또렷하게 읽히는 자리를 고른다 */
  function readStatLines(im, card) {
    var best = null, bs = null;
    [0, 2, 4, -2, 6, -4].forEach(function (dy) {
      var c = { col: card.col, l: card.l, t: Math.round(card.t + dy * card.k), k: card.k };
      var ls = readStatLinesAt(im, c);
      if (!ls.length) return;
      var sc = ls.length * 10 - Math.max.apply(null, ls.map(function (l) { return l.d; }));
      if (bs == null || sc > bs + 1e-9) { bs = sc; best = ls; }
    });
    return best || [];
  }
  function readStatLinesAt(im, card) {
    var lines = [], k = card.k;
    [213, 249, 285].forEach(function (cy) {
      var rg = region(im, card, 220, 291, cy - 16, cy + 16), best = null, bn = 0;
      for (var key in CLS) { var M = maskOf(im, rg, CLS[key]); if (M.n > bn) { bn = M.n; best = { key: key, M: M }; } }
      if (!best || bn < 25 * k * k) return;
      var bx = segment(best.M, 10 * k);
      if (bx.length < 2) return;
      var last = bx[bx.length - 1], lw = last[1] - last[0];
      if (lw < 17 * k || lw > 27 * k || last[1] < best.M.w - 14 * k) return;
      var digits = '', conf = 0;
      for (var i = 0; i < bx.length - 1; i++) { var r = classify(best.M, bx[i], true); digits += r.c; conf = Math.max(conf, r.d); }
      var val = parseInt(digits, 10);
      if (!isFinite(val) || digits.length > 2) return;
      lines.push({ stat: best.key === 'grn' || best.key === 'mag' ? 'etc' : best.key, val: val, unsure: conf > DIGIT_MAX_D, d: conf });
    });
    return lines;
  }
  function readCount(im, card) {
    var rg = region(im, card, 190, 291, 266, 300), M = whiteMask(im, rg);
    var bx = splitWide(M, segment(M, 6 * card.k));
    if (bx.length < 2) return null;
    var head = classify(M, bx[0], false);
    if (head.c !== 'x') return null;
    var s = '';
    for (var i = 1; i < bx.length; i++) { var r = classify(M, bx[i], true); if (r.d > DIGIT_MAX_D) return null; s += r.c; }
    var n = parseInt(s, 10);
    return isFinite(n) && n > 0 ? n : null;
  }
  function readTitleLevel(im, card) {
    var rg = region(im, card, 0, 291, 4, 44), M = whiteMask(im, rg);
    var bx = splitWide(M, segment(M, 6 * card.k)), s = '', worst = 0;
    for (var i = bx.length - 1; i >= 0; i--) {
      var r = classify(M, bx[i], false);
      worst = Math.max(worst, r.d);
      if (r.c === '+') return s && worst < TITLE_MAX_D ? { n: parseInt(s, 10), d: worst } : null;
      if (!/^[0-9]$/.test(r.c)) return null;
      s = r.c + s;
      if (s.length > 3) return null;
    }
    return null;
  }
  /* 인챈트: 아이콘 왼쪽 위 글자(HP/ATK/DEF +xx.x%)의 색. 글자 조각들이 같은 높이로 나란히 있는지로 아이콘 그림과 구분 */
  function readEnchant(im, card) {
    var k = card.k, rg = region(im, card, 14, 250, 76, 122), best = null;
    ['hp', 'atk', 'def'].forEach(function (key) {
      var M = maskOf(im, rg, CLS[key]);
      var bx = segment(M, 12 * k).filter(function (b) { var h = b[3] - b[2]; return h >= 15 * k && h <= 26 * k; });
      var top = 0;
      bx.forEach(function (b) {
        var n = bx.filter(function (o) { return Math.abs(o[2] - b[2]) <= 3 * k && Math.abs((o[3] - o[2]) - (b[3] - b[2])) <= 4 * k; }).length;
        if (n > top) top = n;
      });
      if (top >= 3 && (!best || top > best.n)) best = { key: key, n: top };
    });
    return best ? best.key : null;
  }
  function iconStats(im, card) {
    var rg = region(im, card, 14, 278, 64, 200), cells = [], gx = 8, gy = 6;
    for (var i = 0; i < gy; i++) for (var j = 0; j < gx; j++) {
      var sx = rg.x0 + Math.floor(j * rg.w / gx), ex = rg.x0 + Math.floor((j + 1) * rg.w / gx);
      var sy = rg.y0 + Math.floor(i * rg.h / gy), ey = rg.y0 + Math.floor((i + 1) * rg.h / gy);
      var r = 0, g = 0, b = 0, n = 0;
      for (var y = sy; y < ey; y++) for (var x = sx; x < ex; x++) { var p = (y * im.w + x) * 4; r += im.d[p]; g += im.d[p + 1]; b += im.d[p + 2]; n++; }
      cells.push(r / n, g / n, b / n);
    }
    return cells;
  }
  /* 2줄 펜던트가 달 펜던트인지 (테이머 · 발두르 펜던트와 구분) */
  function pendIcon(im, card) {
    var f = iconStats(im, card), best = null, bd = 1e9;
    for (var key in PEND) {
      var ref = PEND[key], d = 0;
      for (var i = 0; i < f.length; i++) d += Math.abs(f[i] - ref[i]);
      d /= f.length;
      if (d < bd) { bd = d; best = key; }
    }
    return best || 'moon';
  }
  function gemStat(im, card) {
    var rg = region(im, card, 14, 278, 64, 260), red = 0, blue = 0;
    for (var y = rg.y0; y < rg.y0 + rg.h; y += 2) for (var x = rg.x0; x < rg.x0 + rg.w; x += 2) {
      var p = (y * im.w + x) * 4, r = im.d[p], g = im.d[p + 1], b = im.d[p + 2];
      if (r > 150 && g < 90 && b < 110) red++;
      if (b > 150 && r < 100) blue++;
    }
    return red > blue ? 'atk' : 'def';
  }


  /* 정령 카드: 그림 오른쪽 4줄 (아이콘 + 수치). 줄 글자색으로 스탯(노랑=체, 빨강=공, 하늘=방),
     마지막 글자 높이로 %/+ 를 구분 ('+'는 숫자보다 키가 작음). 수치는 쓰지 않는다 (풀강 기준으로 넣음) */
  var SP_ROWS = [182, 218, 254, 290];
  function readSpirit(im, card) {
    var k = card.k, opts = [];
    for (var r = 0; r < SP_ROWS.length; r++) {
      var cy = SP_ROWS[r], rg = region(im, card, 226, 293, cy - 17, cy + 17), best = null, bn = 0;
      ['hp', 'atk', 'def'].forEach(function (key) { var M = maskOf(im, rg, CLS[key]); if (M.n > bn) { bn = M.n; best = { key: key, M: M }; } });
      if (!best || bn < 60 * k * k) return null;
      var bx = segment(best.M, 6 * k);
      if (!bx.length || (bx.length < 2 && bx[0][1] - bx[0][0] <= 30 * k)) return null;
      var top = 1e9, bot = -1;
      bx.forEach(function (b) { if (b[2] < top) top = b[2]; if (b[3] > bot) bot = b[3]; });
      var textH = bot - top;
      if (textH < 14 * k || textH > 30 * k) return null;
      var last = bx[bx.length - 1], s = last[0], e = last[1];
      if (e - s > 30 * k) s = e - Math.round(11 * k);      // 숫자와 붙어 버린 '+' : 오른쪽 끝 한 글자 폭만
      else if (e - s < 7 * k) return null;
      var g0 = -1, g1 = -1;
      for (var y = 0; y < best.M.h; y++) for (var x = s; x < e; x++) if (best.M.m[y * best.M.w + x]) { if (g0 < 0) g0 = y; g1 = y + 1; break; }
      if (g0 < 0) return null;
      opts.push({ stat: best.key, type: (g1 - g0) / textH < 0.8 ? '+' : '%' });
    }
    return opts;
  }
  /* 카드 위치가 조금 어긋나도(잘라낸 캡처 등) 주변을 조금씩 옮겨 보며 정령을 읽는다 */
  function readSpiritNear(im, card) {
    var k = card.k, D = [0, -4, 4, -8, 8, -12, 12, -16, 16];
    for (var i = 0; i < D.length; i++) for (var j = 0; j < 5; j++) {
      var c = { col: card.col, l: Math.round(card.l + D[i] * k), t: Math.round(card.t + D[j] * k), k: k, inferred: card.inferred };
      var sp = readSpirit(im, c);
      if (sp) return { card: c, opts: sp };
    }
    return null;
  }
  /* 정령 화면: 읽힌 카드로 칸 간격(가로 330)을 맞춰 격자를 다시 만들고, 칸마다 정령을 찾는다.
     (그림이 카드 테두리를 가려 못 찾은 칸, 잘라낸 캡처에서 위치가 어긋난 칸까지) */
  function spiritCards(im, cards) {
    if (!cards.length) return [];
    var k = cards[0].k, P = 330 * k, W = 291 * k;
    var anchors = [];
    cards.forEach(function (c) { var r = readSpiritNear(im, c); if (r) anchors.push(r.card); });
    if (!anchors.length) return [];
    var rows = [];
    cards.concat(anchors).forEach(function (c) { if (!rows.some(function (t) { return Math.abs(t - c.t) <= 20 * k; })) rows.push(c.t); });
    // 가로 기준점: 읽힌 카드들의 왼쪽 위치를 간격으로 나눈 나머지의 평균
    var a0 = anchors[0].l, sum = 0;
    anchors.forEach(function (c) { var d = c.l - a0; d -= Math.round(d / P) * P; sum += d; });
    var base = a0 + sum / anchors.length; base -= Math.floor((base + W * 0.35) / P) * P;
    var out = [];
    rows.sort(function (x, y) { return x - y; }).forEach(function (t) {
      for (var l = base, c = 0; l + W * 0.65 <= im.w; l += P, c++) {
        var r = readSpiritNear(im, { col: c, l: Math.round(l), t: t, k: k, inferred: true });
        if (r && !out.some(function (o) { return Math.abs(o.l - r.card.l) < P / 2 && Math.abs(o.t - r.card.t) < 100 * k; })) out.push(r.card);
      }
    });
    out.sort(function (x, y) { return Math.abs(x.t - y.t) > 30 * k ? x.t - y.t : x.l - y.l; });
    return out;
  }

  /* 정령 관리 화면 (왼쪽 정령 목록 + 오른쪽 선택한 정령 상세): 오른쪽 상세의 옵션 4칸(2×2)을 읽는다.
     기준 좌표는 게임 화면 높이 1041 · 화면 가운데 기준. 스탯은 아이콘 색(하트=체, 방패=방, 회색 칼=공),
     %/+ 는 수치 마지막 글자 모양(%는 폭이 넓음)으로 구분. 한 장에 정령 1마리 */
  var PANEL_H = 1041;
  var PANEL_ICON = [[190, 852], [555, 852], [190, 968], [555, 968]];   // 아이콘 중심 (가운데 기준 x, y)
  var PANEL_TXT = 80;                                                // 아이콘 중심 → 수치 시작
  var PANEL_BONUS = [190, 750];                                      // 부가옵 줄 아이콘 (체 40 · 공/방 10이라 아이콘만 보면 됨)
  function iconKind(im, x, y, k) {
    var R = Math.round(26 * k), h = 0, s = 0, g = 0, n = 0;
    for (var yy = Math.max(0, y - R); yy < Math.min(im.h, y + R); yy++) for (var xx = Math.max(0, x - R); xx < Math.min(im.w, x + R); xx++) {
      var i = (yy * im.w + xx) * 4, r = im.d[i], gg = im.d[i + 1], b = im.d[i + 2]; n++;
      if (r > 190 && gg < 140 && b < 90 && r - gg > 80) h++;
      else if (b > 170 && r < 150 && b - r > 60) s++;
      else if (r > 130 && gg > 130 && b > 130 && Math.max(r, gg, b) - Math.min(r, gg, b) < 35) g++;
    }
    var min = n * 0.06;
    if (h >= min && h > s) return 'hp';
    if (s >= min) return 'def';
    if (g >= min) return 'atk';
    return null;
  }
  function panelType(im, x, y, k) {
    var rg = { x0: Math.max(0, x), y0: Math.max(0, Math.round(y - 26 * k)), w: Math.round(220 * k), h: Math.round(52 * k) };
    if (rg.x0 + rg.w > im.w) rg.w = im.w - rg.x0;
    if (rg.y0 + rg.h > im.h) rg.h = im.h - rg.y0;
    if (rg.w <= 0 || rg.h <= 0) return null;
    var M = whiteMask(im, rg), bx = segment(M, 14 * k);
    if (bx.length < 2 || bx.length > 6) return null;
    var top = 1e9, bot = -1;
    bx.forEach(function (b) { if (b[2] < top) top = b[2]; if (b[3] > bot) bot = b[3]; });
    var th = bot - top;
    if (th < 20 * k || th > 46 * k) return null;
    var last = bx[bx.length - 1], lw = last[1] - last[0], lh = last[3] - last[2];
    return lw / lh > 0.8 ? '%' : '+';
  }
  function readPanelAt(im, cx, y0, k) {
    var opts = [];
    for (var i = 0; i < 4; i++) {
      var x = Math.round(cx + PANEL_ICON[i][0] * k), y = Math.round(y0 + PANEL_ICON[i][1] * k);
      if (x < 0 || x >= im.w || y < 0 || y >= im.h) return null;
      var st = iconKind(im, x, y, k); if (!st) return null;
      var tp = panelType(im, Math.round(x + PANEL_TXT * k), y, k); if (!tp) return null;
      opts.push({ stat: st, type: tp });
    }
    // 옵션 칸 배경(어두운 회색) 확인: 두 줄 사이
    var by = Math.round(y0 + 910 * k), bxx = Math.round(cx + 380 * k);
    if (by >= im.h || bxx >= im.w) return null;
    var p = im.px(bxx, by);
    if (Math.max(p[0], p[1], p[2]) > 70) return null;
    var bx = Math.round(cx + PANEL_BONUS[0] * k), byy = Math.round(y0 + PANEL_BONUS[1] * k);
    opts.bonus = bx < im.w && byy < im.h ? (iconKind(im, bx, byy, k) || '') : '';
    return opts;
  }
  function readPanel(im) {
    var r = contentRect(im); if (!r) return null;
    var k = (r.y1 - r.y0) / PANEL_H;
    var anchors = [(r.x0 + r.x1) / 2, r.x1 - 900 * k, r.x0 + 900 * k];   // 가운데 기준, 안 되면 오른쪽 · 왼쪽 끝 기준
    var D = [0, -6, 6, -12, 12, -20, 20];
    for (var a = 0; a < anchors.length; a++) for (var i = 0; i < D.length; i++) for (var j = 0; j < D.length; j++) {
      var cx = anchors[a] + D[i] * k, y0 = r.y0 + D[j] * k;
      var opts = readPanelAt(im, cx, y0, k);
      if (opts) {
        // 미리보기 그림용: 정령 초상(상세 왼쪽 위)을 감싸는 가짜 카드 (thumbOf: l+14k, t+60k, 264k×258k)
        return { kind: 'spirit', opts: opts, bonus: opts.bonus || '', panel: true, card: { col: 0, l: Math.round(cx + 102 * k), t: Math.round(y0 + 280 * k), k: k } };
      }
    }
    return null;
  }

  /* 한 장 해석 → 카드별 결과 */
  function analyze(im) {
    var res = analyzeCards(im);
    if (res.some(function (r) { return r.kind !== 'none'; })) return res;
    var p = readPanel(im);
    return p ? [p] : res;
  }
  function analyzeCards(im) {
    var cards = findCards(im), spiritShot = cards.some(function (c) { return readSpiritNear(im, c); });
    if (spiritShot) cards = spiritCards(im, cards);
    return cards.map(function (card) {
      var res = { card: card };
      var sp = readSpirit(im, card);
      if (sp) { res.kind = 'spirit'; res.opts = sp; return res; }
      if (card.inferred || spiritShot) { res.kind = 'none'; return res; }   // 정령 화면의 못 읽은 칸(옵션 3줄 이하 등)은 장비로 보지 않음
      var cnt = readCount(im, card);
      if (cnt) {
        var tl = readTitleLevel(im, card), lv = tl ? tl.n : null;
        res.kind = 'gem'; res.count = cnt; res.title = lv; res.titleD = tl ? tl.d : null;
        if (lv) {
          if (lv >= 100 && lv % 4 === 0) { res.stat = 'hp'; res.level = lv / 4; }
          else { res.stat = gemStat(im, card); res.level = lv; }
        }
        return res;
      }
      var lines = readStatLines(im, card);
      res.lines = lines;
      if (!lines.length) { res.kind = 'none'; return res; }
      var maxv = Math.max.apply(null, lines.map(function (l) { return l.val; }));
      var ench = readEnchant(im, card);
      if (!ench && maxv <= 6 && lines.every(function (l) { return l.stat !== 'etc'; })) {
        res.kind = 'pend';
        res.ptype = lines.length === 3 ? '태양' : lines.length === 2 ? '달' : '별';
        if (lines.length === 2) { res.icon = pendIcon(im, card); if (res.icon !== 'moon') res.ptype = null; }
        return res;
      }
      res.kind = 'acc'; res.enchant = ench;
      return res;
    });
  }

  function fromCanvasSource(src) {
    var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0);
    return { im: new Img(g.getImageData(0, 0, w, h).data, w, h), canvas: cv };
  }

  window.DV1Shot = { analyze: analyze, fromCanvasSource: fromCanvasSource, Img: Img };
})();
