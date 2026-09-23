/* ============================================================
   ui.js — 공통 셸(세로 내비 / 모바일 탭바 / 상단바)을 그려줍니다.
   ui.css 다음에 불러오세요.

   <body class="u">
     <div class="u-app">
       <!-- 여기에 셸이 들어갑니다 -->
       <main class="u-wrap full">...</main>
     </div>
   <script src="./ui.js"></script>
   <script>UI.shell({page:'tier'});</script>
   ============================================================ */
(function (w, d) {
  'use strict';
  // Hide restricted navigation before the asynchronous permission check.
  var accessRule=d.createElement('style');
  accessRule.textContent='html:not([data-cham-auto-allowed]) a[href*="cham_auto.html"]{display:none!important}';
  d.head.appendChild(accessRule);
  var accessBase = new URL('.', d.currentScript.src);
  if (!d.querySelector('link[href$="cham-access.css"]')) {
    var accessStyle=d.createElement('link'); accessStyle.rel='stylesheet';
    accessStyle.href=new URL('cham-access.css',accessBase).href; d.head.appendChild(accessStyle);
  }
  if (!w.ChamAccess && !d.querySelector('script[src$="cham-access.js"]')) {
    var accessScript=d.createElement('script');
    accessScript.src=new URL('cham-access.js',accessBase).href; d.head.appendChild(accessScript);
  }

  var EN = /\/en\//.test(location.pathname);
  var UP = EN ? '../' : './';
  var HOME = EN ? './index.html' : './index.html';

  var T = EN ? {
    kicker: 'DRAGON VILLAGE 1', site: 'Dex', home: 'Home',
    g_info: 'INFO', g_guide: 'GUIDE', g_calc: 'CALCULATOR', g_etc: 'MORE', g_acct: 'ACCOUNT',
    more: 'More', theme: 'Theme', lang: '한국어', spec: 'My Spec', login: 'Sign in'
  } : {
    kicker: 'DRAGON VILLAGE 1', site: '종합 정보사이트', home: '메인',
    g_info: '정보', g_guide: '공략', g_calc: '계산기', g_etc: '편의성', g_acct: '계정',
    more: '전체', theme: '테마', lang: 'EN', spec: '내 스펙', login: '로그인'
  };

  /* 사이트 전체 메뉴 — 한 곳에서만 고치면 모든 페이지에 반영됩니다. */
  var NAV = [
    { g: T.g_info, items: [
      ['tier',    EN ? 'Tier list'    : '초월 등급표',  'tier.html'],
      ['dex',     EN ? 'Dragon dex'   : '드래곤 도감',  'dex.html'],
      ['sss',     EN ? 'SSS ranking'  : 'SSS 랭킹',    'sss.html'],
      ['cham',    EN ? 'Champ ranking': '챔대 랭킹',    'cham.html'],
      ['pkg',     EN ? 'Packages'     : '패키지 복각',  'pkg.html']
    ] },
    { g: T.g_calc, items: [
      ['score-guide', EN ? 'BV & TAR guide' : '비밸·TAR 설명서', 'score-guide.html'],
      ['calculator',  EN ? 'Spirit sim'   : '정령 시뮬레이터', 'calculator.html'],
      ['spirit-peak', EN ? 'Spirit peak' : '정령 고점', 'spirit-peak.html'],
      ['pvp',         EN ? 'Guild war'    : '길드전', 'pvp.html'],
      ...(EN ? [['noob','Guild (new)','noob.html']] : []),
      ['cham_manual', EN ? 'Champ manual' : '챔대 수동',      'cham_manual.html'],
      ['cham_auto',   EN ? 'Champ auto'   : '챔대 자동',      'cham_auto.html']
    ] },
    { g: T.g_guide, items: [
      ['guide',     EN ? 'Guides'      : '공략 & 가이드', 'guide.html'],
      ['raid_info', EN ? 'Raid'        : '레이드 정보',   'raid_info.html'],
      ['raid',      EN ? 'Arha gate'   : '아르하 입구',   'raid.html']
    ] },
    { g: T.g_etc, items: [
      ['my',           EN ? 'My spec'  : '내 스펙 관리', 'my.html'],
      ...(!EN ? [['guild-home','길드','guild-home.html']] : []),
      ['guild',        EN ? 'Guilds'   : '길드 홍보',   'guild.html'],
      ['aura-preview', EN ? 'Auras'    : '오라 미리보기', 'aura-preview.html'],
      ['patchnote',    EN ? 'Patch'    : '패치 노트',   'patchnote.html']
    ] }
  ];

  /* 모바일 하단 탭바 — 4개만 */
  var TAB = [
    ['home', T.home,  HOME,           'M3 9.5 10 3l7 6.5V17H3z'],
    ['dex',  EN ? 'Dex' : '도감', 'dex.html',
      'M4 4h12v12H4zM4 8h12M8 4v12'],
    ['calc', EN ? 'Calc' : '계산기', 'calculator.html',
      'M5 3h10v14H5zM7.5 7h5M7.5 10.5h5M7.5 14h5'],
    ['my',   EN ? 'My' : '내 스펙', 'my.html',
      'M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 17c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5']
  ];

  var TASK_GO = null;

  function el(tag, cls, html) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var UI = {
    /* opt: {page, title, sub, nav, foot, tabbar} */
    shell: function (opt) {
      opt = opt || {};
      var app = d.querySelector('.u-app');
      if (!app) return;
      d.body.classList.add('u');

      /* ── PC 세로 내비 ── */
      var side = el('nav', 'u-side');
      side.setAttribute('aria-label', EN ? 'Site' : '사이트 메뉴');
      var hd = el('div', 'u-side-hd');
      hd.innerHTML =
        '<button type="button" class="u-sidetog" onclick="UI.side(0)" title="' +
        esc(EN ? 'Hide menu' : '메뉴 접기') + '" aria-label="' + esc(EN ? 'Hide menu' : '메뉴 접기') + '">' +
        '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M9 3 4 8l5 5M14 3 9 8l5 5"/></svg></button>' +
        '<div class="u-side-kicker">' + esc(T.kicker) + '</div>' +
        '<a class="u-side-t" href="' + HOME + '" style="display:block">' + esc(opt.title || T.site) + '</a>' +
        (opt.sub ? '<div class="u-side-s">' + esc(opt.sub) + '</div>' : '');
      side.appendChild(hd);

      var list = el('div', 'u-side-nav');

      (opt.nav || NAV).forEach(function (grp) {
        list.appendChild(el('div', 'u-side-grp', esc(grp.g)));
        grp.items.forEach(function (it) {
          var a = el('a', 'u-nav-i' + (it[0] === opt.page ? ' on' : ''));
          a.href = (EN && ['score-guide.html','index.html','calculator.html','spirit-peak.html','pvp.html','noob.html','cham_auto.html','cham_manual.html','dex.html','tier.html','sss.html','cham.html','raid.html','raid_info.html','my.html','aura-preview.html','patchnote.html'].includes(it[2]) ? './' : UP) + it[2];
          a.innerHTML = esc(it[1]) + (it[3] ? '<span class="n">' + esc(it[3]) + '</span>' : '');
          if (it[0] === opt.page) a.setAttribute('aria-current', 'page');
          list.appendChild(a);
        });
      });
      side.appendChild(list);

      var ft = el('div', 'u-side-ft');
      ft.innerHTML = (opt.foot || '') +
        '<div class="u-row" style="margin-top:10px;gap:6px">' +
        '<button type="button" class="u-btn sm" onclick="UI.theme()">' + esc(T.theme) + '</button>' +
        '<a class="u-btn sm" href="' + (EN ? '../index.html' : './en/index.html') + '">' + esc(T.lang) + '</a>' +
        '</div>';
      side.appendChild(ft);
      app.insertBefore(side, app.firstChild);

      /* ── 접었을 때 나타나는 열기 버튼 ── */
      var open = el('button', 'u-sideopen');
      open.type = 'button';
      open.title = EN ? 'Show menu' : '메뉴 펼치기';
      open.setAttribute('aria-label', open.title);
      open.onclick = function () { UI.side(1); };
      open.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M2 4h12M2 8h12M2 12h12"/></svg>';
      d.body.appendChild(open);
      try { if (localStorage.getItem('u-side') === 'off') d.body.classList.add('side-off'); } catch (e) {}

      /* ── 모바일 상단바 ── */
      var top = el('div', 'u-topbar');
      top.innerHTML =
        '<a class="u-btn sm" href="' + HOME + '" aria-label="' + esc(T.home) + '">' +
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 5 8l5 5"/></svg></a>' +
        '<div style="flex-grow:1;min-width:0">' +
        '<div class="t">' + esc(opt.title || T.site) + '</div>' +
        (opt.sub ? '<div class="s">' + esc(opt.sub) + '</div>' : '') + '</div>' +
        '<button type="button" class="u-btn sm" onclick="UI.theme()">' + esc(T.theme) + '</button>';
      app.insertBefore(top, side.nextSibling);

      /* ── 페이지 안 작업 탭 (가로) ──
         사이드 메뉴를 접어도 쓸 수 있도록 본문 위쪽에 둡니다.
         opt.tasks = {on:'calc', items:[['calc','자동 계산'],['sim','시뮬레이션','12']],
                      go:function(key){...}} */
      if (opt.tasks && opt.tasks.items && opt.tasks.items.length) {
        TASK_GO = opt.tasks.go || null;
        var tbar = el('nav', 'u-taskbar');
        tbar.setAttribute('aria-label', EN ? 'Section' : '작업 탭');
        opt.tasks.items.forEach(function (it) {
          var btn = el('button', it[0] === opt.tasks.on ? 'on' : '');
          btn.type = 'button';
          btn.setAttribute('data-task', it[0]);
          btn.innerHTML = esc(it[1]) + '<span class="n">' + esc(it[2] == null ? '' : it[2]) + '</span>';
          btn.onclick = function () { UI.task(it[0]); };
          tbar.appendChild(btn);
        });
        /* 본문(설정+결과)을 세로 칸으로 감싸고 그 맨 위에 탭을 얹습니다. */
        var content = app.querySelector('.u-content') || app.querySelector('.u-wrap');
        if (content) {
          var col = el('div', 'u-col');
          content.parentNode.insertBefore(col, content);
          col.appendChild(tbar);
          col.appendChild(content);
        } else {
          app.appendChild(tbar);
        }
        d.body.classList.add('has-taskbar');
      }

      /* ── 설정 패널 접기 버튼 ── */
      var setp = app.querySelector('.u-setpane');
      if (setp) {
        setp.style.position = setp.style.position || '';
        var tg = el('button', 'u-panetog');
        tg.type = 'button';
        tg.title = EN ? 'Hide settings' : '설정 접기';
        tg.setAttribute('aria-label', tg.title);
        tg.onclick = function () { UI.pane(0); };
        tg.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
          'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3 4 8l5 5M14 3 9 8l5 5"/></svg>';
        setp.insertBefore(tg, setp.firstChild);
        var rail = el('div', 'u-paneopen');
        var ob = el('button', '');
        ob.type = 'button';
        ob.title = EN ? 'Show settings' : '설정 펼치기';
        ob.setAttribute('aria-label', ob.title);
        ob.onclick = function () { UI.pane(1); };
        ob.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
          'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3l5 5-5 5M2 3l5 5-5 5"/></svg>';
        rail.appendChild(ob);
        setp.parentNode.insertBefore(rail, setp);
        try { if (localStorage.getItem('u-pane') === 'off') d.body.classList.add('pane-off'); } catch (e) {}
      }

      /* ── 모바일 하단 탭바 ── */
      if (opt.tabbar !== false) {
        var bar = el('nav', 'u-tabbar');
        bar.setAttribute('aria-label', EN ? 'Main' : '주요 메뉴');
        TAB.forEach(function (t) {
          var a = el('a', t[0] === opt.page ? 'on' : '');
          a.href = t[2];
          a.innerHTML = '<svg viewBox="0 0 20 20"><path d="' + t[3] + '"/></svg>' + esc(t[1]);
          bar.appendChild(a);
        });
        var more = el('a', '');
        more.href = HOME;
        more.innerHTML = '<svg viewBox="0 0 20 20"><path d="M4 6h12M4 10h12M4 14h12"/></svg>' + esc(T.more);
        bar.appendChild(more);
        d.body.appendChild(bar);
        d.body.classList.add('has-tabbar');
      }
    },

    /* 설정 패널 접기 — UI.pane(0) 접기, UI.pane(1) 펼치기, UI.pane() 토글 */
    pane: function (on) {
      var off = (on == null) ? !d.body.classList.contains('pane-off') : !on;
      d.body.classList.toggle('pane-off', off);
      try { localStorage.setItem('u-pane', off ? 'off' : 'on'); } catch (e) {}
      w.dispatchEvent(new Event('resize'));
    },

    /* 계산기 작업 탭 전환 — UI.task('sim') */
    task: function (key) {
      d.querySelectorAll('.u-nav-i.task').forEach(function (a) {
        a.classList.toggle('on', a.getAttribute('data-task') === key);
      });
      var bar = d.querySelector('.u-taskbar');
      if (bar) bar.querySelectorAll('[data-task]').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-task') === key);
      });
      if (TASK_GO) TASK_GO(key);
    },

    /* 작업 탭 옆 숫자 — UI.taskn('dragon', 9) */
    taskn: function (key, n) {
      d.querySelectorAll('[data-task="' + key + '"] .n').forEach(function (s) {
        s.textContent = (n == null || n === 0) ? '' : n;
      });
    },

    /* 사이드 메뉴 접기/펼치기 — UI.side(0) 접기, UI.side(1) 펼치기, UI.side() 토글 */
    side: function (on) {
      var off = (on == null) ? !d.body.classList.contains('side-off') : !on;
      d.body.classList.toggle('side-off', off);
      try { localStorage.setItem('u-side', off ? 'off' : 'on'); } catch (e) {}
      w.dispatchEvent(new Event('resize'));
    },

    /* 셸 제목/부제 갱신 — UI.title('...'), UI.sub('전체 123마리') */
    title: function (t) {
      d.querySelectorAll('.u-side-t, .u-topbar .t').forEach(function (n) { n.textContent = t; });
    },
    sub: function (t) {
      d.querySelectorAll('.u-side-s, .u-topbar .s').forEach(function (n) { n.textContent = t; });
    },

    /* 테마 순환 — theme.js가 있으면 그쪽을 쓰고, 없으면 자체 처리 */
    theme: function () {
      var order = ['dark', 'light', 'beige'];
      var cur = localStorage.getItem('theme');
      if (order.indexOf(cur) < 0) cur = 'dark';
      var nx = order[(order.indexOf(cur) + 1) % order.length];
      try { localStorage.setItem('theme', nx); } catch (e) {}
      d.documentElement.setAttribute('data-theme', nx);
      if (typeof w.applyTheme === 'function') { w.applyTheme(nx); return; }
      var l = d.getElementById('theme-css');
      if (l) l.setAttribute('href', UP + 'theme-' + nx + '.css');
    },

    /* 진행률 바: UI.prog(btn, 42) / UI.prog(btn, null) 로 제거 */
    prog: function (btn, p) {
      if (!btn || !btn.parentNode) return;
      var e = btn.parentNode.querySelector('.u-prog');
      if (p == null) { if (e) e.remove(); return; }
      if (!e) { e = el('div', 'u-prog', '<i></i>'); btn.insertAdjacentElement('afterend', e); }
      e.firstChild.style.width = Math.max(0, Math.min(100, p)) + '%';
    },

    esc: esc
  };

  w.UI = UI;
})(window, document);
