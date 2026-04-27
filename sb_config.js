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

// 로그인 상태 관리
function getUser() {
  try { return JSON.parse(localStorage.getItem('community_user')); } catch { return null; }
}
function setUser(user) { localStorage.setItem('community_user', JSON.stringify(user)); }
function logout() { localStorage.removeItem('community_user'); location.href = location.href.split('/').pop() || './index.html'; }

// 비밀번호 SHA-256 해시
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}
