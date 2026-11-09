/* 내 스펙 — 스크린샷으로 장신구 · 펜던트 · 젬 · 정령 등록 (UI)
   정령은 풀강 기준(옵션 스탯 · %/+ 만 읽음, 부가옵 없음)으로 길드전 예비 정령에 넣거나 길드전 드래곤에 귀속합니다.
   인식은 my-shot-engine.js. 결과는 미리보기로 보여주고, 확인을 눌러야 S에 반영합니다. */
(function () {
  'use strict';
  if (!globalThis.DV1_DRAGON_VIEWS || !window.DV1Shot) return;
  var root = document.getElementById('shot-root');
  if (!root) return;

  var SKN = { hp: '체', atk: '공', def: '방' };
  var SCOL = { hp: 'var(--hpc)', atk: 'var(--atc)', def: 'var(--dfc)' };
  /* 게임 젬 수치 → 사이트 젬 칸 (35·36은 뉴비용 칸, 38~44는 기존 37~40 칸) */
  var GEM_KEY = { 35: 35, 36: 36, 38: 37, 40: 38, 42: 39, 44: 40 };
  var items = [];   // {id, kind, label, ok, on, data, thumb, shot}
  var seq = 0, spSeq = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  root.innerHTML =
    '<div class="sec shot-sec">' +
      '<div class="sec-hd"><span>스크린샷으로 등록</span></div>' +
      '<div class="sec-bd">' +
        '<div class="shot-guide">' +
          '<strong>캡처는 레무리아 입구 또는 아르하 입구에서 해 주세요</strong>' +
          '<p>드래곤에게 <b>장착하지 않은 장신구 · 펜던트 · 젬</b>까지 전부 목록에 나오는 곳이 레무리아 입구 / 아르하 입구예요. 다른 화면에서 찍으면 빠지는 아이템이 생길 수 있어요.</p>' +
          '<ol>' +
            '<li>레무리아 입구나 아르하 입구에서 장신구 · 펜던트 · 젬 목록을 열어요.</li>' +
            '<li>카드 10칸(5×2)이 잘리지 않게 한 화면씩 캡처해요. 반쯤 가려진 카드는 읽지 않아요.</li>' +
            '<li>끝까지 내리면서 찍은 캡처를 여기에 한 번에 올려요.</li>' +
          '</ol>' +
          '<p style="margin:6px 0"><b>정령</b>도 정령 목록 화면을 같은 방식으로 캡처해서 올리면 돼요. 옵션은 풀강 기준으로 읽어요.</p>' +
          '<p class="shot-guide-note">같은 카드가 두 장에 겹쳐 찍히면 장신구 · 펜던트는 두 번 들어가니, 미리보기에서 체크를 풀어 주세요. (젬은 자동으로 한 번만 세요)</p>' +
        '</div>' +
        '<p class="shot-help">여러 장을 한 번에 올려도 되고, 붙여넣기(Ctrl+V)도 돼요. 이미지는 서버로 보내지 않고 이 브라우저 안에서만 처리돼요. 가로 화면 · 720p 이상 캡처를 권장해요.</p>' +
        '<label class="shot-drop" id="shot-drop"><input type="file" id="shot-file" accept="image/*" multiple hidden>' +
          '<strong>스크린샷 선택</strong><span>또는 여기로 끌어다 놓기</span></label>' +
        '<div id="shot-status" class="shot-status" role="status" aria-live="polite"></div>' +
        '<div id="shot-result"></div>' +
      '</div>' +
    '</div>';

  var css = document.createElement('style');
  css.textContent =
    '.shot-help{font-size:12px;color:var(--dim);line-height:1.7;margin:0 0 12px}' +
    '.shot-guide{border:1px solid rgba(212,168,71,.35);background:rgba(212,168,71,.07);border-radius:9px;padding:12px 14px;margin:0 0 12px;font-size:12px;line-height:1.7;color:var(--text)}' +
    '.shot-guide strong{display:block;font-size:13px;color:var(--gold);margin-bottom:4px}' +
    '.shot-guide p{margin:0 0 6px;color:var(--dim)}.shot-guide b{color:var(--text)}' +
    '.shot-guide ol{margin:4px 0 6px;padding-left:18px}.shot-guide li{margin:2px 0}' +
    '.shot-guide .shot-guide-note{margin:0;font-size:11px}' +
    '.shot-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1.5px dashed var(--bd);border-radius:10px;padding:26px 16px;cursor:pointer;background:var(--sf2);text-align:center}' +
    '.shot-drop:hover,.shot-drop.over{border-color:var(--gold)}' +
    '.shot-drop strong{font-size:14px;color:var(--text)}.shot-drop span{font-size:11px;color:var(--dim)}' +
    '.shot-status{font-size:12px;color:var(--dim);margin:10px 0 0;min-height:1em}' +
    '.shot-group{margin-top:16px}.shot-group h4{display:flex;align-items:center;gap:8px;font-size:13px;margin:0 0 8px;color:var(--text)}' +
    '.shot-group h4 small{font-weight:400;color:var(--dim);font-size:11px}' +
    '.shot-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px}' +
    '.shot-it{display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--bd);border-radius:8px;background:var(--sf2);font-size:12px;min-height:54px}' +
    '.shot-it.off{opacity:.45}.shot-it.bad{opacity:.55;border-style:dashed}' +
    '.shot-it img{width:42px;height:46px;object-fit:cover;border-radius:5px;flex-shrink:0;background:#000}' +
    '.shot-it .nm{flex:1;min-width:0;line-height:1.45;word-break:keep-all}' +
    '.shot-it .sub{display:block;font-size:11px;color:var(--dim)}' +
    '.shot-it input[type=checkbox]{accent-color:var(--gold);width:16px;height:16px;flex-shrink:0}' +
    '.shot-it select{font-size:11px;padding:3px 6px;margin-top:3px}' +
    '.shot-opts{display:flex;flex-wrap:wrap;gap:8px 16px;margin:16px 0 10px;font-size:12px;color:var(--dim)}' +
    '.shot-opts label{display:flex;align-items:center;gap:6px;cursor:pointer}.shot-opts input{accent-color:var(--gold)}' +
    '.shot-actions{display:flex;gap:8px;flex-wrap:wrap}.shot-actions button{width:auto;flex:0 0 auto}';
  document.head.appendChild(css);

  var fileIn = document.getElementById('shot-file'), drop = document.getElementById('shot-drop');
  var status = document.getElementById('shot-status'), result = document.getElementById('shot-result');

  /* ---------- 인식 결과 → 등록 항목 ---------- */
  function matchAcc(lines) {
    var v = { hp: 0, atk: 0, def: 0 }, etc = false;
    lines.forEach(function (l) { if (l.stat === 'etc') etc = true; else v[l.stat] += l.val; });
    var hit = ACC_DB.filter(function (a) {
      return Math.round(a.hp * 100) === v.hp && Math.round(a.atk * 100) === v.atk && Math.round(a.def * 100) === v.def &&
        (a.n.indexOf('빛뿔') === 0) === etc;
    });
    return hit.length === 1 ? hit[0] : null;
  }
  function statTxt(lines) {
    return lines.map(function (l) { return l.stat === 'etc' ? '기타' + l.val + '%' : '<span style="color:' + SCOL[l.stat] + '">' + SKN[l.stat] + l.val + '%</span>'; }).join(' ');
  }
  function thumbOf(canvas, card) {
    var k = card.k, c = document.createElement('canvas');
    c.width = 84; c.height = 92;
    c.getContext('2d').drawImage(canvas, card.l + 14 * k, card.t + 60 * k, 264 * k, 258 * k, 0, 0, 84, 92);
    return c.toDataURL('image/jpeg', 0.7);
  }
  function toItems(res, canvas, shot) {
    return res.map(function (r) {
      var it = { id: ++seq, shot: shot, thumb: thumbOf(canvas, r.card), on: true, ok: true, kind: r.kind };
      if (r.kind === 'gem') {
        var key = r.level ? GEM_KEY[r.level] : null;
        if (!r.level || !r.stat) { it.ok = false; it.label = '젬 수치를 못 읽었어요'; it.sub = '× ' + r.count; }
        else if (!key) { it.ok = false; it.label = SKN[r.stat] + ' ' + r.level + '젬 × ' + r.count; it.sub = '사이트에 입력칸이 없는 수치라 건너뛰어요'; }
        else {
          it.data = { stat: r.stat, key: key, count: r.count, level: r.level };
          it.label = '<span style="color:' + SCOL[r.stat] + '">' + SKN[r.stat] + '</span> ' + r.level + '젬 × ' + r.count;
          it.sub = key !== r.level ? '사이트 칸: ' + r.level + '젬 (기존 ' + key + ')' : '사이트 칸: ' + r.level + '젬 (뉴비용)';
        }
      } else if (r.kind === 'pend') {
        if (!r.ptype) { it.ok = false; it.label = '달 · 태양 · 별 펜던트가 아니에요'; it.sub = statTxt(r.lines); }
        else {
          it.data = { type: r.ptype, options: r.lines.map(function (l) { return { stat: l.stat, val: l.val }; }) };
          it.label = r.ptype + ' 펜던트'; it.sub = statTxt(r.lines);
          if (r.lines.some(function (l) { return l.unsure; })) it.sub += ' · 숫자 확인 필요';
        }
      } else if (r.kind === 'acc') {
        var a = matchAcc(r.lines);
        if (!a) { it.ok = false; it.label = '목록에 없는 장신구예요'; it.sub = statTxt(r.lines); }
        else { it.data = { name: a.n, enchant: r.enchant || 'none' }; it.label = a.n; it.sub = statTxt(r.lines); }
      } else if (r.kind === 'spirit') {
        it.data = { opts: r.opts, dest: 'rsv' };
        spSeq++;
        it.label = '정령 ' + spSeq;
        it.sub = r.opts.map(function (o) { return '<span style="color:' + SCOL[o.stat] + '">' + SKN[o.stat] + o.type + '</span>'; }).join(' ');
      } else { it.ok = false; it.label = '읽을 수 있는 정보가 없어요'; it.sub = ''; }
      if (!it.ok) it.on = false;
      return it;
    });
  }

  /* ---------- 화면 ---------- */
  var GROUPS = [['acc', '장신구'], ['pend', '펜던트'], ['gem', '젬'], ['spirit', '정령']];
  function render() {
    if (!items.length) { result.innerHTML = ''; return; }
    var html = '';
    GROUPS.forEach(function (g) {
      var list = items.filter(function (i) { return i.kind === g[0]; });
      if (!list.length) return;
      var on = list.filter(function (i) { return i.on; }).length;
      html += '<div class="shot-group"><h4>' + g[1] + ' <small>' + on + '개 선택 · 인식 ' + list.filter(function (i) { return i.ok; }).length + '/' + list.length + '</small></h4><div class="shot-list">';
      list.forEach(function (i) {
        var enc = '';
        if (i.kind === 'acc' && i.ok) {
          enc = '<select data-enc="' + i.id + '" aria-label="인챈트">' +
            [['none', '인챈트 없음'], ['hp', '체 +21%'], ['atk', '공 +21%'], ['def', '방 +21%']].map(function (o) {
              return '<option value="' + o[0] + '"' + (i.data.enchant === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
            }).join('') + '</select>';
        }
        if (i.kind === 'spirit') {
          enc = '<select data-dest="' + i.id + '" aria-label="보낼 곳"><option value="rsv"' + (i.data.dest === 'rsv' ? ' selected' : '') + '>길드전 예비 정령</option>' +
            (window.GuildLink ? GuildLink.catalogOptions(/^\d+$/.test(i.data.dest) ? i.data.dest : '') : '') + '</select>';
        }
        html += '<label class="shot-it' + (i.ok ? (i.on ? '' : ' off') : ' bad') + '">' +
          '<input type="checkbox" data-id="' + i.id + '"' + (i.on ? ' checked' : '') + (i.ok ? '' : ' disabled') + '>' +
          '<img src="' + i.thumb + '" alt="">' +
          '<span class="nm">' + i.label + '<span class="sub">' + i.sub + '</span>' + enc + '</span></label>';
      });
      html += '</div></div>';
    });
    if (items.some(function (i) { return i.kind === 'spirit'; })) {
      html += '<p class="shot-help" style="margin-top:8px">정령은 옵션을 풀강 기준으로 넣고 부가옵은 비워요. 정령마다 <b>길드전 예비 정령</b>으로 보내거나, <b>드래곤을 골라</b> 그 정령을 단 드래곤으로 길드전 계산기 [내 용 정보]에 등록해요. (등급 9.0 · 강림(축복)으로 들어가니 길드전 계산기에서 맞게 바꿔 주세요)</p>';
    }
    var others = items.filter(function (i) { return i.kind === 'none'; }).length;
    if (others) html += '<p class="shot-help" style="margin-top:12px">정보를 못 읽은 칸 ' + others + '개는 뺐어요.</p>';
    html += '<div class="shot-opts">' +
      '<label><input type="checkbox" id="shot-rep-acc"> 기존 장신구를 지우고 바꾸기</label>' +
      '<label><input type="checkbox" id="shot-rep-pend"> 기존 펜던트를 지우고 바꾸기</label>' +
      '<span>젬은 인식된 칸만 개수를 덮어써요</span></div>' +
      '<div class="shot-actions"><button type="button" class="btn-gold" id="shot-apply">선택한 항목 내 스펙에 반영</button>' +
      '<button type="button" class="btn-white" id="shot-clear">결과 비우기</button></div>';
    result.innerHTML = html;
  }

  result.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.id) { var it = items.find(function (i) { return i.id === +t.dataset.id; }); if (it) { it.on = t.checked; render(); } }
    if (t.dataset.enc) { var a = items.find(function (i) { return i.id === +t.dataset.enc; }); if (a) a.data.enchant = t.value; }
    if (t.dataset.dest) { var sp = items.find(function (i) { return i.id === +t.dataset.dest; }); if (sp) sp.data.dest = t.value; }
  });
  result.addEventListener('click', function (e) {
    if (e.target.id === 'shot-clear') { items = []; render(); status.textContent = ''; }
    if (e.target.id === 'shot-apply') apply();
  });

  function apply() {
    var sel = items.filter(function (i) { return i.on && i.ok; });
    if (!sel.length) { alert('반영할 항목을 골라 주세요.'); return; }
    var msg = [];
    var acc = sel.filter(function (i) { return i.kind === 'acc'; }).map(function (i) { return { name: i.data.name, enchant: i.data.enchant }; });
    var pend = sel.filter(function (i) { return i.kind === 'pend'; }).map(function (i) { return JSON.parse(JSON.stringify(i.data)); });
    var gemSum = {};
    /* 같은 젬이 겹친 스크린샷에 두 번 찍힌 경우(종류·수치·개수 같음 + 다른 스크린샷)는 한 번만 셉니다 */
    var seen = {};
    sel.filter(function (i) { return i.kind === 'gem'; }).forEach(function (i) {
      var sig = i.data.stat + '|' + i.data.level + '|' + i.data.count;
      if (seen[sig] && seen[sig] !== i.shot) return;
      seen[sig] = i.shot;
      var k = i.data.stat + '|' + i.data.key;
      gemSum[k] = (gemSum[k] || 0) + i.data.count;
    });
    var repAcc = document.getElementById('shot-rep-acc').checked, repPend = document.getElementById('shot-rep-pend').checked;
    if (acc.length) { if (repAcc) S.accCards = []; S.accCards.unshift.apply(S.accCards, acc); msg.push('장신구 ' + acc.length + '개'); }
    if (pend.length) { if (repPend) S.pendants = []; S.pendants.unshift.apply(S.pendants, pend); msg.push('펜던트 ' + pend.length + '개'); }
    var gn = 0;
    Object.keys(gemSum).forEach(function (k) {
      var p = k.split('|');
      if (!S.gems[p[0]]) S.gems[p[0]] = {};
      S.gems[p[0]][p[1]] = gemSum[k]; gn++;
    });
    if (gn) msg.push('젬 ' + gn + '칸');
    var sps = sel.filter(function (i) { return i.kind === 'spirit'; });
    if (sps.length && window.GuildLink) {
      var cat = GuildLink.catalog(), rsv = [], add = [];
      sps.forEach(function (i) {
        var d = /^\d+$/.test(i.data.dest) ? cat[+i.data.dest] : null;
        if (d) add.push({ attr: d.attr, name: d.name, dtype: d.dtype, opts: i.data.opts, bonus: '' });
        else rsv.push({ name: '', opts: i.data.opts, bonus: '' });
      });
      var nb = GuildLink.addDragons(add), nr = GuildLink.addReserves(rsv);
      if (nr) msg.push('예비 정령 ' + nr + '개');
      if (nb) msg.push('길드전 드래곤 ' + nb + '마리 등록');
    }
    if (typeof renderAll === 'function') renderAll();
    if (typeof qSave === 'function') qSave();
    items = []; render();
    status.textContent = msg.join(' · ') + ' 반영했어요.';
    if (typeof showToast === 'function') showToast(msg.join(' · ') + ' 반영 완료');
  }

  /* ---------- 파일 읽기 ---------- */
  function loadFile(f) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function () { res(im); setTimeout(function () { URL.revokeObjectURL(url); }, 0); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('이미지를 열 수 없어요: ' + f.name)); };
      im.src = url;
    });
  }
  async function handle(files) {
    files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    var found = 0, empty = 0, low = false;
    for (var n = 0; n < files.length; n++) {
      status.textContent = '읽는 중… (' + (n + 1) + '/' + files.length + ')';
      await new Promise(function (r) { setTimeout(r, 0); });
      try {
        var img = await loadFile(files[n]);
        var src = DV1Shot.fromCanvasSource(img), res = DV1Shot.analyze(src.im);
        if (!res.length) { empty++; continue; }
        if (res[0].card.k < 0.62) low = true;
        var list = toItems(res, src.canvas, ++seq);
        items = items.concat(list);
        found += list.length;
      } catch (e) { empty++; }
    }
    var parts = [found + '칸 읽음'];
    if (empty) parts.push(empty + '장은 목록 화면을 찾지 못했어요');
    if (low) parts.push('해상도가 낮은 캡처는 숫자가 틀릴 수 있으니 꼭 확인해 주세요');
    status.textContent = parts.join(' · ');
    render();
  }
  fileIn.addEventListener('change', function () { handle(fileIn.files); fileIn.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { handle(e.dataTransfer.files); });
  document.addEventListener('paste', function (e) {
    if (root.closest('[hidden]')) return;
    var fs = Array.prototype.map.call(e.clipboardData ? e.clipboardData.items : [], function (i) { return i.kind === 'file' ? i.getAsFile() : null; }).filter(Boolean);
    if (fs.length) { e.preventDefault(); handle(fs); }
  });
})();
