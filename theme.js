// 테마 관리
const THEMES = {
  dark:  { name: '🌙 다크',   file: './theme-dark.css' },
  light: { name: '☀️ 라이트', file: './theme-light.css' },
  beige: { name: '🍂 베이지', file: './theme-beige.css' },
  custom:{ name: '🎨 커스텀', file: null }
};

function applyTheme(id, customVars) {
  const link = document.getElementById('theme-css');
  if(!link) return;
  if(id === 'custom' && customVars) {
    link.href = './theme-dark.css'; // 베이스
    let style = document.getElementById('custom-theme-style');
    if(!style) { style = document.createElement('style'); style.id = 'custom-theme-style'; document.head.appendChild(style); }
    style.textContent = `:root {
      --bg: ${customVars.bg};
      --bg2: ${customVars.bg2};
      --bg3: ${customVars.bg3};
      --border: ${customVars.border};
      --border2: ${customVars.border};
      --border3: ${customVars.border};
      --text: ${customVars.text};
      --text2: ${customVars.text2};
      --text3: ${customVars.text3};
      --text4: ${customVars.text4};
      --accent: ${customVars.accent};
      --accent-bg: ${customVars.accent}26;
      --accent-border: ${customVars.accent}66;
    }`;
  } else {
    const style = document.getElementById('custom-theme-style');
    if(style) style.textContent = '';
    link.href = THEMES[id]?.file || './theme-dark.css';
  }
}

function loadSavedTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  const custom = JSON.parse(localStorage.getItem('theme-custom') || 'null');
  applyTheme(saved, custom);
}

function saveTheme(id, customVars) {
  localStorage.setItem('theme', id);
  if(id === 'custom' && customVars) localStorage.setItem('theme-custom', JSON.stringify(customVars));
  applyTheme(id, customVars);
}

// 테마 설정 모달 열기
function openThemeModal() {
  const existing = document.getElementById('theme-modal-overlay');
  if(existing) { existing.style.display = 'flex'; return; }

  const current = localStorage.getItem('theme') || 'dark';
  const custom = JSON.parse(localStorage.getItem('theme-custom') || 'null') || {
    bg:'#1a1a2e', bg2:'#1e1e30', bg3:'#252538',
    border:'#333', text:'#eeeeee', text2:'#aaaaaa',
    text3:'#888888', text4:'#666666', accent:'#5dcff5'
  };

  const overlay = document.createElement('div');
  overlay.id = 'theme-modal-overlay';
  overlay.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center';
  overlay.onclick = e => { if(e.target === overlay) overlay.style.display = 'none'; };

  overlay.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;width:90%;max-width:380px;position:relative">
      <button onclick="document.getElementById('theme-modal-overlay').style.display='none'" style="position:absolute;top:12px;right:14px;background:none;border:none;color:var(--text2);font-size:18px;cursor:pointer">✕</button>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:16px">🎨 테마 설정</div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
        ${Object.entries(THEMES).map(([id, t]) => `
          <button onclick="selectTheme('${id}')" id="theme-btn-${id}"
            style="padding:10px 14px;border-radius:8px;border:2px solid ${current===id ? 'var(--accent)' : 'var(--border)'};
            background:${current===id ? 'var(--accent-bg)' : 'var(--bg3)'};
            color:${current===id ? 'var(--accent)' : 'var(--text2)'};
            font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;text-align:left">
            ${t.name}
          </button>
        `).join('')}
      </div>

      <div id="custom-options" style="display:${current==='custom'?'block':'none'}">
        <div style="font-size:12px;color:var(--text3);margin-bottom:8px">커스텀 색상</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${[
            ['bg','배경색'],['bg2','카드 배경'],['bg3','버튼 배경'],
            ['border','테두리'],['text','본문'],['text2','서브 텍스트'],
            ['accent','포인트 색상']
          ].map(([key, label]) => `
            <div style="display:flex;align-items:center;gap:6px">
              <input type="color" id="cv-${key}" value="${custom[key]||'#5dcff5'}"
                style="width:28px;height:28px;border:none;border-radius:4px;cursor:pointer;background:none">
              <span style="font-size:11px;color:var(--text3)">${label}</span>
            </div>
          `).join('')}
        </div>
        <button onclick="applyCustom()" style="margin-top:12px;width:100%;padding:9px;background:var(--accent-bg);border:1px solid var(--accent-border);border-radius:8px;color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          적용하기
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function selectTheme(id) {
  document.querySelectorAll('[id^="theme-btn-"]').forEach(b => {
    b.style.border = '2px solid var(--border)';
    b.style.background = 'var(--bg3)';
    b.style.color = 'var(--text2)';
  });
  const btn = document.getElementById(`theme-btn-${id}`);
  if(btn) {
    btn.style.border = '2px solid var(--accent)';
    btn.style.background = 'var(--accent-bg)';
    btn.style.color = 'var(--accent)';
  }
  document.getElementById('custom-options').style.display = id === 'custom' ? 'block' : 'none';
  if(id !== 'custom') saveTheme(id);
}

function applyCustom() {
  const keys = ['bg','bg2','bg3','border','text','text2','text3','text4','accent'];
  const vals = {};
  keys.forEach(k => {
    const el = document.getElementById(`cv-${k}`);
    if(el) vals[k] = el.value;
  });
  // text3, text4 자동 계산
  if(!vals.text3) vals.text3 = vals.text2;
  if(!vals.text4) vals.text4 = vals.text2;
  saveTheme('custom', vals);
  document.getElementById('theme-modal-overlay').style.display = 'none';
}

// 페이지 로드 시 테마 적용
loadSavedTheme();
