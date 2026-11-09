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
  function findCards(im) {
    var r = contentRect(im); if (!r) return [];
    var k = (r.y1 - r.y0) / 1080, cx = (r.x0 + r.x1) / 2, out = [];
    for (var c = 0; c < 5; c++) {
      var left = cx + k * (-805.5 + 330 * c), x = Math.round(left + 7 * k);
      if (x < 0 || x >= im.w) continue;
      var s = -1, gap = 0, lastOn = -1;
      for (var y = 0; y <= im.h; y++) {
        var on = y < im.h && isBg(im, x, y);
        if (on) { if (s < 0) s = y; lastOn = y; gap = 0; continue; }
        if (s >= 0 && y < im.h && ++gap <= 2) continue;   // JPEG 잡음 몇 픽셀은 이어 붙임
        if (s >= 0) {
          var hgt = lastOn + 1 - s;
          if (Math.abs(hgt - 319 * k) <= 25 * k) out.push({ col: c, l: Math.round(left), t: s, k: k });
          s = -1; gap = 0;
        }
      }
    }
    if (!out.length) out = findCardsCropped(im);
    out.sort(function (a, b) { return Math.abs(a.t - b.t) > 30 * a.k ? a.t - b.t : a.col - b.col; });
    return out;
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
  function readStatLines(im, card) {
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
      lines.push({ stat: best.key === 'grn' || best.key === 'mag' ? 'etc' : best.key, val: val, unsure: conf > DIGIT_MAX_D });
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
  /* 정령 화면: 한 줄에 몇 칸만 찾혔으면(그림이 카드 테두리를 가린 경우) 같은 줄 나머지 칸도 정령인지 확인 */
  function spiritCards(im, cards) {
    if (!cards.length) return cards;
    var k = cards[0].k, rows = [];
    cards.forEach(function (c) { if (!rows.some(function (t) { return Math.abs(t - c.t) <= 6 * k; })) rows.push(c.t); });
    var r = contentRect(im); if (!r) return cards;
    var cx = (r.x0 + r.x1) / 2, out = cards.slice();
    rows.forEach(function (t) {
      for (var c = 0; c < 5; c++) {
        if (out.some(function (o) { return o.col === c && Math.abs(o.t - t) <= 6 * k; })) continue;
        var card = { col: c, l: Math.round(cx + k * (-805.5 + 330 * c)), t: t, k: k, inferred: true };
        if (readSpirit(im, card)) out.push(card);
      }
    });
    out.sort(function (a, b) { return Math.abs(a.t - b.t) > 30 * a.k ? a.t - b.t : a.col - b.col; });
    return out;
  }

  /* 한 장 해석 → 카드별 결과 */
  function analyze(im) {
    var cards = findCards(im);
    if (cards.some(function (c) { return readSpirit(im, c); })) cards = spiritCards(im, cards);
    return cards.map(function (card) {
      var res = { card: card };
      var sp = readSpirit(im, card);
      if (sp) { res.kind = 'spirit'; res.opts = sp; return res; }
      if (card.inferred) { res.kind = 'none'; return res; }
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
