const SUPABASE_URL = 'https://ytudyupzaabisaupytuz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_nZ2vb00wab3vbsCXSN6iZA_hIJ-udxV';
async function supabase(method, table, data = null, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : ''
  };
  if(method === 'PATCH') headers['Prefer'] = 'return=representation';
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : null
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || '요청 실패');
  }
  return method === 'DELETE' ? null : res.json();
}
async function getCount(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact',
      'Range': '0-0'
    }
  });
  const range = res.headers.get('content-range');
  return range ? parseInt(range.split('/')[1]) : 0;
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('community_user')); } catch { return null; }
}
function setUser(user) { localStorage.setItem('community_user', JSON.stringify(user)); }
function logout() { localStorage.removeItem('community_user'); location.href = location.href.split('/').pop() || './index.html'; }
async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw);
  // crypto.subtle 은 https 에서만 존재 → 없을 때(http, 일부 인앱 브라우저)는 같은 결과를 내는 JS 구현 사용
  if (window.crypto && crypto.subtle && crypto.subtle.digest) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    } catch (e) {}
  }
  return sha256HexFallback(data);
}
function sha256HexFallback(bytes) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(total);
  m.set(bytes); m[len] = 0x80;
  const bits = len * 8, dv = new DataView(m.buffer);
  dv.setUint32(total - 8, Math.floor(bits / 0x100000000)); dv.setUint32(total - 4, bits >>> 0);
  const w = new Uint32Array(64), rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i-15],7) ^ rotr(w[i-15],18) ^ (w[i-15] >>> 3);
      const s1 = rotr(w[i-2],17) ^ rotr(w[i-2],19) ^ (w[i-2] >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
    }
    let [a,b,c,d,e,f,g,h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e,6) ^ rotr(e,11) ^ rotr(e,25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a,2) ^ rotr(a,13) ^ rotr(a,22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
  }
  return H.map(x => x.toString(16).padStart(8,'0')).join('');
}

// ── XSS 방지 공용 함수 ──
// dbEsc: DB/외부에서 온 문자열을 HTML 본문·속성에 넣을 때
function dbEsc(v) {
  return String(v == null ? '' : v).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
}
// dbArg: onclick="fn(${dbArg(x)})" 처럼 인라인 JS 인자로 넣을 때 (따옴표 포함해서 반환)
function dbArg(v) { return dbEsc(JSON.stringify(String(v == null ? '' : v))); }
// dbHtml: 게시글 본문처럼 서식 HTML을 보여줘야 할 때 — 허용 태그/속성만 남김
var DB_HTML_TAGS = new Set(['P','BR','B','STRONG','I','EM','U','S','STRIKE','DEL','H1','H2','H3','H4','OL','UL','LI','BLOCKQUOTE','PRE','CODE','A','IMG','SPAN','DIV','SUB','SUP','HR','TABLE','THEAD','TBODY','TR','TH','TD']);
var DB_HTML_ATTRS = new Set(['class','style','href','src','alt','title','width','height','colspan','rowspan','data-list','spellcheck']);
function dbSafeUrl(u, isImg) {
  const s = String(u || '').trim();
  if (/^(https?:|\/|\.\/|\.\.\/|#|mailto:)/i.test(s) && !/^\/\//.test(s)) return s;
  if (isImg && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(s)) return s;
  return '';
}
function dbHtml(html) {
  const doc = new DOMParser().parseFromString('<div>' + String(html == null ? '' : html) + '</div>', 'text/html');
  const root = doc.body.firstChild;
  (function walk(node) {
    Array.from(node.childNodes).forEach(ch => {
      if (ch.nodeType === 3) return;
      if (ch.nodeType !== 1) { ch.remove(); return; }
      const tg = String(ch.tagName).toUpperCase();
      if (!DB_HTML_TAGS.has(tg)) {
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE|NOSCRIPT|FORM|INPUT|TEXTAREA|BUTTON|SELECT|LINK|META|BASE)$/.test(tg)) { ch.remove(); return; }
        walk(ch); ch.replaceWith(...ch.childNodes); return;
      }
      Array.from(ch.attributes).forEach(a => {
        const n = a.name.toLowerCase();
        if (!DB_HTML_ATTRS.has(n)) { ch.removeAttribute(a.name); return; }
        if (n === 'href' || n === 'src') {
          const ok = dbSafeUrl(a.value, tg === 'IMG' && n === 'src');
          if (ok) ch.setAttribute(n, ok); else ch.removeAttribute(a.name);
        }
        if (n === 'style' && /url\s*\(|expression|javascript:|@import|behavior/i.test(a.value)) ch.removeAttribute('style');
      });
      if (tg === 'A') { ch.setAttribute('rel', 'noopener noreferrer nofollow'); if (/^https?:/i.test(ch.getAttribute('href') || '')) ch.setAttribute('target', '_blank'); }
      walk(ch);
    });
  })(root);
  return root.innerHTML;
}
// dbClean: 공유 코드·클라우드에서 불러온 스펙 데이터의 문자열 값에서 HTML 특수문자 제거
function dbClean(v) {
  if (typeof v === 'string') return v.replace(/[<>"`]/g, '');
  if (Array.isArray(v)) return v.map(dbClean);
  if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = dbClean(v[k]); return o; }
  return v;
}
