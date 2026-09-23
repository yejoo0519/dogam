(function (w,d) {
  'use strict';
  if(w.ChamAccess)return;
  const base=new URL('.',d.currentScript.src);
  const en=/\/en\//.test(location.pathname);
  const restricted=d.documentElement.hasAttribute('data-cham-auto-page');
  let pending=null;
  let config=null;
  function user(){try{return JSON.parse(localStorage.getItem('community_user'));}catch(_){return null;}}
  function readyConfig(){
    if(typeof supabase==='function')return Promise.resolve();
    if(!config)config=new Promise((resolve,reject)=>{
      const s=d.createElement('script');s.src=new URL('sb_config.js',base).href;
      s.onload=resolve;s.onerror=()=>reject(new Error('Configuration unavailable'));d.head.appendChild(s);
    });
    return config;
  }
  async function readMember(){
    const u=user();if(!u||u.id==null)return null;
    await readyConfig();
    let timeout;
    const rows=await Promise.race([
      supabase('GET','users',null,'?id=eq.'+encodeURIComponent(u.id)+'&select=id,is_admin,is_banned,can_cham_auto'),
      new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Permission check timed out')),8000);})
    ]).finally(()=>clearTimeout(timeout));
    const current=user();
    if(!current||String(current.id)!==String(u.id))return null;
    return Array.isArray(rows)&&rows.length===1?rows[0]:null;
  }
  function apply(allowed){
    d.documentElement.toggleAttribute('data-cham-auto-allowed',allowed);
    const category=d.querySelector('#cat-calculator');
    if(category){
      const count=Array.from(category.querySelectorAll('a.card')).filter(a=>allowed||!a.getAttribute('href').includes('cham_auto.html')).length;
      const meta=category.querySelector('.meta');
      if(meta)meta.textContent=en?'· '+count+' pages':'· '+count+'개 메뉴';
    }
    if(!restricted||!d.body)return;
    let box=d.getElementById('cham-access-message');
    if(allowed){if(box)box.remove();return;}
    if(!box){
      box=d.createElement('section');box.id='cham-access-message';box.setAttribute('role','alert');
      const title=d.createElement('h1');title.textContent=en?'Permission required':'이용 권한이 필요합니다';
      const info=d.createElement('p');info.textContent=en?'Sign in with an approved account. If access is still denied, contact the administrator.':'권한을 부여받은 계정으로 로그인해 주세요. 권한이 없거나 확인할 수 없으면 이용할 수 없습니다.';
      box.append(title,info);
      for(const [url,label] of [['./index.html',en?'Home':'메인으로'],['./login.html',en?'Sign in':'로그인']]){
        const a=d.createElement('a');a.href=url;a.textContent=label;box.appendChild(a);
      }
      d.body.appendChild(box);
    }
  }
  function refresh(){
    if(pending)return pending;
    pending=(async()=>{
      let allowed=false;
      try{const row=await readMember();allowed=!!row&&row.can_cham_auto===true&&row.is_banned!==true;}catch(_){/* Deny on missing migration/network errors. */}
      apply(allowed);return allowed;
    })().finally(()=>{pending=null;});
    return pending;
  }
  w.ChamAccess={refresh,requireAccess:refresh,isAdmin:async()=>{
    try{const row=await readMember();return !!row&&row.is_admin===true&&row.is_banned!==true;}catch(_){return false;}
  }};
  const start=()=>{apply(false);refresh();};
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});else start();
  w.addEventListener('storage',e=>{if(e.key==='community_user'||e.key===null){apply(false);refresh();}});
  w.addEventListener('pageshow',()=>{apply(false);refresh();});
  w.addEventListener('focus',refresh);
  d.addEventListener('visibilitychange',()=>{if(!d.hidden)refresh();});
  setInterval(()=>{if(!d.hidden)refresh();},15000);
})(window,document);
