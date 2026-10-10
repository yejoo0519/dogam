/* calc-cloud.js — 계산기 입력값 로그인 동기화 (요르문간드 계산기 · 배치 계산기)
 * users.calc_settings (jsonb) = { "<localStorage 키>": { data, t }, ... }
 * 내 스펙(users.spec_data)은 읽지도 쓰지도 않습니다.
 * 로그인하지 않았으면 아무것도 하지 않고, 입력값은 지금처럼 이 브라우저에만 남습니다.
 * 사용: CalcCloud.pull(key) → 클라우드가 더 최신이면 로컬에 쓰고 true
 *       CalcCloud.push(key) → 로컬 값을 잠시 뒤 업로드
 *       CalcCloud.clear(key) → 클라우드 값도 비움 (입력 초기화)
 */
(function(root){
  'use strict';
  const COL='calc_settings',DELAY=2000,timers={};
  const user=()=>{try{return typeof getUser==='function'?getUser():null}catch(_){return null}};
  const ready=()=>{const u=user();return !!(u&&u.id&&typeof supabase==='function')};
  const metaKey=k=>k+':t';
  const localT=k=>{try{return Number(localStorage.getItem(metaKey(k)))||0}catch(_){return 0}};
  const setT=(k,t)=>{try{localStorage.setItem(metaKey(k),String(t))}catch(_){}};
  async function fetchAll(){const rows=await supabase('GET','users',null,'?id=eq.'+user().id+'&select='+COL);const v=rows&&rows[0]?rows[0][COL]:null;return v&&typeof v==='object'?v:(typeof v==='string'?JSON.parse(v||'{}'):{});}
  // 다른 계산기 값은 그대로 두고 이 키만 바꿉니다.
  async function upload(k,entry){const all=await fetchAll();all[k]=entry;await supabase('PATCH','users',{[COL]:all},'?id=eq.'+user().id);}
  async function pull(k){
    if(!ready())return false;
    try{
      const e=(await fetchAll())[k];
      if(!e){if(localStorage.getItem(k))push(k);return false;}
      if(e.t<localT(k)){await uploadLocal(k);return false;}
      if(e.t===localT(k))return false;
      if(e.data==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(e.data));
      setT(k,e.t);return true;
    }catch(err){console.warn('[calc-cloud] load failed',err);return false;}
  }
  async function uploadLocal(k){let data=null;try{data=JSON.parse(localStorage.getItem(k)||'null')}catch(_){}await upload(k,{data,t:localT(k)});}
  function push(k){
    const t=Date.now();setT(k,t);if(!ready())return;
    clearTimeout(timers[k]);
    timers[k]=setTimeout(()=>uploadLocal(k).catch(err=>console.warn('[calc-cloud] save failed',err)),DELAY);
  }
  async function clear(k){
    const t=Date.now();setT(k,t);clearTimeout(timers[k]);if(!ready())return;
    try{await upload(k,{data:null,t})}catch(err){console.warn('[calc-cloud] clear failed',err)}
  }
  // 페이지 시작 시: 클라우드가 더 최신이면 한 번 새로고침해 그 값으로 다시 그립니다.
  function start(k){
    const flag='calc-cloud-reloaded:'+k;let again=false;try{again=sessionStorage.getItem(flag)==='1';sessionStorage.removeItem(flag)}catch(_){}
    pull(k).then(changed=>{if(changed&&!again){try{sessionStorage.setItem(flag,'1')}catch(_){}location.reload();}});
  }
  root.CalcCloud={pull,push,clear,ready,start};
})(globalThis);
