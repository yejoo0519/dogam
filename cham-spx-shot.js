/* 챔대 자동 계산기 · 정령 배분: 정령 목록 스크린샷을 읽어 보유 정령에 추가
   (my-shot-engine.js 의 DV1Shot 사용 · 이미지는 브라우저 안에서만 처리) */
(function () {
  'use strict';
  var EN = typeof IS_EN !== 'undefined' && IS_EN;
  var T = EN ? {
    btn: 'Screenshot', reading: function (i, n) { return 'Reading… (' + i + '/' + n + ')'; },
    done: function (n, m) { return n + ' spirit(s) added' + (m ? ' · ' + m + ' image(s) had no spirit list' : ''); },
    none: 'No spirits found. Capture the spirit list screen (landscape).', memo: 'Shot',
    hint: 'Capture the in-game spirit list and upload/paste it — options are read automatically (bonus stat stays empty).'
  } : {
    btn: '스크린샷', reading: function (i, n) { return '읽는 중… (' + i + '/' + n + ')'; },
    done: function (n, m) { return '정령 ' + n + '개 추가했어요' + (m ? ' · ' + m + '장은 정령 목록을 못 찾았어요' : '') + ' · 옵션을 한 번 확인해 주세요'; },
    none: '정령을 못 찾았어요. 게임 정령 목록 화면을 가로로 캡처해 주세요.', memo: '스샷',
    hint: '게임 정령 목록 화면을 캡처해서 올리거나 붙여넣으면 옵션을 자동으로 읽어요. (부가옵은 직접 골라 주세요)'
  };
  var hd = document.getElementById('spx-hd');
  if (!hd || !window.DV1Shot) return;
  var addBtn = document.getElementById('t-spx-add');
  var fileIn = document.createElement('input');
  fileIn.type = 'file'; fileIn.accept = 'image/*'; fileIn.multiple = true; fileIn.hidden = true;
  var btn = document.createElement('button');
  btn.className = 'btn'; btn.type = 'button'; btn.textContent = T.btn; btn.title = T.hint;
  btn.onclick = function (e) { e.stopPropagation(); fileIn.click(); };
  addBtn.parentNode.insertBefore(btn, addBtn);
  hd.appendChild(fileIn);
  var msg = document.createElement('div');
  msg.className = 'spx-shot-msg';
  msg.style.cssText = 'font-size:12px;color:var(--gold);margin:-2px 0 10px;display:none';
  var body = document.getElementById('spx-body');
  body.insertBefore(msg, body.firstChild);
  function say(t) { msg.textContent = t; msg.style.display = t ? '' : 'none'; }

  function load(f) {
    return new Promise(function (ok, no) {
      var u = URL.createObjectURL(f), im = new Image();
      im.onload = function () { ok(im); setTimeout(function () { URL.revokeObjectURL(u); }, 0); };
      im.onerror = function () { URL.revokeObjectURL(u); no(new Error('load')); };
      im.src = u;
    });
  }
  async function handle(files) {
    files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    S.spx.fold = false; applySpxFold();
    var added = 0, miss = 0, base = S.spx.list.length;
    for (var i = 0; i < files.length; i++) {
      say(T.reading(i + 1, files.length));
      await new Promise(function (r) { setTimeout(r, 0); });
      try {
        var src = DV1Shot.fromCanvasSource(await load(files[i]));
        var sp = DV1Shot.analyze(src.im).filter(function (r) { return r.kind === 'spirit' && r.opts && r.opts.length === 4; });
        if (!sp.length) { miss++; continue; }
        sp.forEach(function (r) {
          var x = mkSpirit();
          x.sp = r.opts.map(function (o) { return { stat: o.stat, type: o.type }; });
          x.memo = T.memo + ' ' + (base + (++added));
          S.spx.list.push(x);
        });
      } catch (e) { miss++; }
    }
    renderSpxList(); if (typeof renderSpxSetting === 'function') renderSpxSetting(); save();
    say(added ? T.done(added, miss) : T.none);
    if (added) { var cards = document.querySelectorAll('.spx-card'); if (cards[base]) cards[base].scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  fileIn.addEventListener('change', function () { handle(fileIn.files); fileIn.value = ''; });
  var page = document.getElementById('page-spx');
  page.addEventListener('dragover', function (e) { e.preventDefault(); });
  page.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); handle(e.dataTransfer.files); } });
  document.addEventListener('paste', function (e) {
    if (page.style.display === 'none') return;
    var fs = Array.prototype.map.call(e.clipboardData ? e.clipboardData.items : [], function (it) { return it.kind === 'file' ? it.getAsFile() : null; }).filter(Boolean);
    if (fs.length) { e.preventDefault(); handle(fs); }
  });
})();
