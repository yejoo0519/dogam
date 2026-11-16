(function(root){
  'use strict';
  const GENERIC=/다이아|골드|Lv|레벨업|부화기|정수|보석|결정|망치|합성석|꿈의 (공격|방어|체력)|강림|뽑기권|얼음 조각|물약|정기|치료제|스톤|해제권|뿔|장식|정령/;
  const DEFAULT_RATES={shop:{dia:22,gold:30},market:{dia:8,gold:7.43}};
  // 같은 드래곤은 표기(알/드래곤 알/의 알)가 달라도 하나의 시세 키로 묶는다.
  function eggKey(name){
    return name.replace(/\(알\)/g,'').replace(/\s*드래곤의?\s*알$/,'').replace(/의\s*알$/,'').replace(/\s*알$/,'').replace(/\s+/g,' ').trim().replace(/^블랙 아머$/,'블랙아머');
  }
  function eggsOf(pkg){
    const map=new Map();
    for(const item of pkg.items){
      if(GENERIC.test(item.name)||item.name.startsWith('알(')) continue;
      const key=eggKey(item.name);
      map.set(key,(map.get(key)||0)+item.qty);
    }
    return Array.from(map,([key,qty])=>({key,qty}));
  }
  function qty(pkg,name){return pkg.items.reduce((sum,i)=>sum+(i.name===name?i.qty:0),0);}
  function calc(pkg,rates,eggPrices){
    const currency=qty(pkg,'다이아')*rates.dia+qty(pkg,'황금 다이아')*rates.gold;
    let egg=0,filled=0;const eggs=eggsOf(pkg);
    for(const e of eggs){const price=Number(eggPrices[e.key]);if(price>0){egg+=price*e.qty;filled++;}}
    const total=currency+egg;
    return {currency,egg,total,pct:pkg.price?total/pkg.price*100:null,eggs,filled};
  }
  const api={eggKey,eggsOf,calc,DEFAULT_RATES};
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  root.PackageValue=api;

  const $=id=>document.getElementById(id);
  const STORE='pkgeff_v1';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const won=value=>Math.round(value).toLocaleString('ko-KR')+'원';
  const pretty=value=>value?value.replaceAll('-','.'):'—';
  const state={basis:'shop',rates:{shop:{...DEFAULT_RATES.shop},market:{...DEFAULT_RATES.market}},eggs:{},query:'',sort:'recent',onlyEgg:false};
  let packages=[];
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||'null');
      if(!saved) return;
      if(saved.basis==='shop'||saved.basis==='market') state.basis=saved.basis;
      for(const k of ['shop','market']) for(const f of ['dia','gold']){const v=Number(saved.rates?.[k]?.[f]);if(v>=0&&Number.isFinite(v)) state.rates[k][f]=v;}
      if(saved.eggs&&typeof saved.eggs==='object') for(const [k,v] of Object.entries(saved.eggs)){const n=Number(v);if(n>0&&Number.isFinite(n)) state.eggs[k]=n;}
    }catch(error){console.warn('Package value: 저장된 값을 읽지 못했습니다',error);}
  }
  function save(){
    try{localStorage.setItem(STORE,JSON.stringify({basis:state.basis,rates:state.rates,eggs:state.eggs}));}catch(error){/* 저장 불가 환경에서는 이번 방문에만 유지 */}
  }
  const rates=()=>state.rates[state.basis];
  function period(pkg){
    const starts=pkg.noticeSalePeriods.map(p=>p.start).filter(Boolean).sort(),ends=pkg.noticeSalePeriods.map(p=>p.end).filter(Boolean).sort();
    return starts.length?`판매 ${pretty(starts[0])} — ${pretty(ends.at(-1))}`:`공지 ${pretty(pkg.noticeDate)}`;
  }
  function sumHtml(c){
    return `재화 환산 <b>${won(c.currency)}</b>${c.eggs.length?`<br>알 시세 <b>${c.filled?won(c.egg):'미입력'}</b>`:''}<br>합계 <b>${won(c.total)}</b>`;
  }
  function pctHtml(c){
    return `${c.pct.toFixed(1)}%<small>${c.eggs.length&&c.filled<c.eggs.length?'알 시세 제외':'가격 대비'}</small>`;
  }
  function visible(){
    const q=state.query.replace(/\s+/g,'').toLowerCase();
    let list=packages.map((pkg,index)=>({pkg,index,c:calc(pkg,rates(),state.eggs)}));
    if(q) list=list.filter(r=>(r.pkg.name+r.pkg.items.map(i=>i.name).join('')).replace(/\s+/g,'').toLowerCase().includes(q));
    if(state.onlyEgg) list=list.filter(r=>r.c.filled>0);
    if(state.sort==='pct') list.sort((a,b)=>b.c.pct-a.c.pct);
    else if(state.sort==='price') list.sort((a,b)=>a.pkg.price-b.pkg.price||b.pkg.noticeDate.localeCompare(a.pkg.noticeDate));
    return list;
  }
  function render(){
    const list=visible();
    $('resultCount').textContent=`${list.length}개`;
    if(!list.length){$('results').innerHTML='<div class="pkg-empty">조건에 맞는 패키지가 없습니다.</div>';return;}
    $('results').innerHTML='<div class="pe-list">'+list.map(({pkg,index,c})=>{
      const limit=pkg.limit?(/^\d+$/.test(pkg.limit)?pkg.limit+'회':pkg.limit):'제한 미확인';
      const eggs=c.eggs.length?c.eggs.map(e=>`<label class="pe-egg"><span>${escape(e.key)}${e.qty>1?' ×'+e.qty:''}</span><input type="number" min="0" step="100" inputmode="numeric" placeholder="알 시세(원)" data-egg="${escape(e.key)}" value="${state.eggs[e.key]??''}" aria-label="${escape(e.key)} 알 1개 시세(원)"></label>`).join(''):'<span class="pkg-muted">알 없음</span>';
      return `<div class="pe-row" data-index="${index}"><div class="pe-main"><div class="pe-title"><a href="${escape(pkg.url)}" target="_blank" rel="noopener noreferrer">${escape(pkg.name)} ↗</a></div><div class="pe-meta"><span class="pkg-mono">${won(pkg.price)}</span> · 구매 ${escape(limit)} · ${period(pkg)}</div><div class="pe-items">${pkg.items.map(i=>escape(i.name)+' '+i.qty.toLocaleString('ko-KR')).join(' · ')}</div></div><div class="pe-eggs">${eggs}</div><div class="pe-sum">${sumHtml(c)}</div><div class="pe-pct${c.pct>=100?' good':''}">${pctHtml(c)}</div></div>`;
    }).join('')+'</div>';
  }
  // 입력 중에는 목록을 다시 그리지 않고 값만 갱신해 포커스를 유지한다.
  function refreshValues(active){
    document.querySelectorAll('.pe-row').forEach(row=>{
      const c=calc(packages[Number(row.dataset.index)],rates(),state.eggs);
      row.querySelector('.pe-sum').innerHTML=sumHtml(c);
      const pct=row.querySelector('.pe-pct');pct.innerHTML=pctHtml(c);pct.classList.toggle('good',c.pct>=100);
    });
    document.querySelectorAll('[data-egg]').forEach(input=>{if(input!==active) input.value=state.eggs[input.dataset.egg]??'';});
  }
  function syncBasis(){
    document.querySelectorAll('[data-basis]').forEach(b=>{const on=b.dataset.basis===state.basis;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
    $('rateDia').value=rates().dia;$('rateGold').value=rates().gold;
  }
  $('basis').addEventListener('click',e=>{const b=e.target.closest('[data-basis]');if(!b)return;state.basis=b.dataset.basis;syncBasis();save();render();});
  for(const [id,field] of [['rateDia','dia'],['rateGold','gold']]) $(id).addEventListener('input',e=>{const v=Number(e.target.value);rates()[field]=v>=0&&Number.isFinite(v)?v:0;save();refreshValues();});
  $('results').addEventListener('input',e=>{
    const input=e.target.closest('[data-egg]');if(!input)return;
    const v=Number(input.value);
    if(v>0&&Number.isFinite(v)) state.eggs[input.dataset.egg]=v; else delete state.eggs[input.dataset.egg];
    save();refreshValues(input);
  });
  $('results').addEventListener('change',e=>{if(e.target.closest('[data-egg]')&&(state.sort==='pct'||state.onlyEgg))render();});
  $('resetEggs').addEventListener('click',()=>{state.eggs={};save();render();});
  $('query').addEventListener('input',e=>{state.query=e.target.value;render();});
  $('sort').addEventListener('change',e=>{state.sort=e.target.value;render();});
  $('onlyEgg').addEventListener('change',e=>{state.onlyEgg=e.target.checked;render();});
  async function init(){
    load();syncBasis();
    try{
      const response=await fetch('./data/pkg-prices.json',{cache:'no-cache'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const source=await response.json();
      if(source.schemaVersion!==1||!Array.isArray(source.packages))throw Error('지원하지 않는 데이터 형식');
      packages=source.packages.filter(p=>Number.isFinite(p.price)&&p.price>0&&Array.isArray(p.items)&&p.items.length);
      $('syncStatus').textContent=`가격 확인 패키지 ${packages.length.toLocaleString('ko-KR')}개 · 마지막 확인 ${pretty(source.checkedAt)}`;
      render();
    }catch(error){
      $('syncStatus').classList.add('error');$('syncStatus').textContent='패키지 기록을 불러오지 못했습니다. 새로고침해 주세요.';
      $('results').innerHTML='<div class="pkg-empty">기록 로딩에 실패했습니다.</div>';
      console.error('Package value:',error);
    }
  }
  init();
})(globalThis);
