(function(root){
  'use strict';
  const GENERIC=/다이아|골드|Lv|레벨업|부화기|정수|보석|결정|망치|합성석|꿈의 (공격|방어|체력)|강림|뽑기권|얼음 조각|사탕|물약|정기|치료제|스톤|해제권|뿔|장식|정령|토벌권|티켓|루비|확정권|변환권|스크롤|수정|파티클/;
  // 다이아·황금 다이아는 유저 거래 시세 기준(다이아 100개 800원, 황금 다이아 7,400개 55,000원)
  const DEFAULT_RATES={market:{dia:8,gold:7.43}};
  // 같은 드래곤은 표기(알/드래곤 알/의 알)가 달라도 하나의 시세 키로 묶는다.
  function eggKey(name){
    return name.replace(/\(알\)/g,'').replace(/\s*드래곤의?\s*알$/,'').replace(/의\s*알$/,'').replace(/\s*알$/,'').replace(/\s+/g,' ').trim().replace(/^블랙 아머$/,'블랙아머');
  }
  // 유저 간 거래가 되는 건 드래곤 알뿐이라, 거래가 안 되는 육성 재료는 알 시세 입력에서 뺀다.
  const NOT_EGG=new Set(['카닐']);
  function isEgg(item){
    if(item.kind) return item.kind==='egg';
    return !GENERIC.test(item.name)&&!item.name.startsWith('알(')&&!NOT_EGG.has(item.name);
  }
  // 구성품 한 줄의 1개 단가(원). 단가를 모르면 null.
  function unitWon(item,ctx){
    if(isEgg(item)){const v=Number(ctx.eggs[eggKey(item.name)]);return v>0?v:null;}
    if(item.name==='다이아') return ctx.rates.dia;
    if(item.name==='황금 다이아') return ctx.rates.gold;
    if(item.name==='골드') return ctx.goldWon>0?ctx.goldWon/1e8:null;
    const p=ctx.prices[item.name];
    if(!p||!(Number(p.v)>0)) return null;
    // 단위: won=원, dia=다이아, gold=골드(골드 1억당 원 시세로 환산)
    if(p.u==='gold') return ctx.goldWon>0?Number(p.v)*ctx.goldWon/1e8:null;
    return p.u==='won'?Number(p.v):Number(p.v)*ctx.rates.dia;
  }
  function calc(pkg,ctx){
    let value=0,missing=0;
    const lines=pkg.items.map(item=>{
      const unit=unitWon(item,ctx),egg=isEgg(item);
      if(unit==null) missing++; else value+=unit*item.qty;
      return {name:item.name,qty:item.qty,egg,key:egg?eggKey(item.name):null,value:unit==null?null:unit*item.qty};
    });
    return {lines,value,missing,gain:pkg.price>0?(value/pkg.price-1)*100:null};
  }
  const api={eggKey,isEgg,unitWon,calc,DEFAULT_RATES};
  if(typeof module==='object'&&module.exports){module.exports=api;return;}
  root.PackageValue=api;

  const $=id=>document.getElementById(id);
  const STORE='pkgeff_v2',PAGE=30;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const won=value=>Math.round(value).toLocaleString('ko-KR')+'원';
  const pretty=value=>value?value.replaceAll('-','.'):'—';
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const state={basis:'market',rates:{market:{...DEFAULT_RATES.market}},goldWon:0,eggs:{},prices:{},custom:[],query:'',sort:'recent',sale:'all',shown:PAGE};
  let official=[],defaults={};
  const num=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:0;};
  const unit=value=>value==='won'||value==='gold'?value:'dia';
  function load(){
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||'null');
      if(!saved){
        // 이전 버전(알 시세만 저장)에서 넘어온 값은 이어서 쓴다.
        const old=JSON.parse(localStorage.getItem('pkgeff_v1')||'null');
        if(old?.eggs) for(const [k,v] of Object.entries(old.eggs)) if(num(v)) state.eggs[k]=num(v);
        return;
      }
      if(num(saved.goldWon)) state.goldWon=num(saved.goldWon);
      for(const k of ['market']) for(const f of ['dia','gold']){const v=Number(saved.rates?.[k]?.[f]);if(v>=0&&Number.isFinite(v)) state.rates[k][f]=v;}
      for(const [k,v] of Object.entries(saved.eggs||{})) if(num(v)) state.eggs[k]=num(v);
      for(const [k,p] of Object.entries(saved.prices||{})) if(num(p?.v)&&p.u!=='evt') state.prices[k]={v:num(p.v),u:unit(p.u)};
      if(Array.isArray(saved.custom)) state.custom=saved.custom.filter(p=>p&&typeof p.name==='string'&&num(p.price)&&Array.isArray(p.items)).map(p=>({
        id:String(p.id),name:p.name,price:num(p.price),createdAt:String(p.createdAt||today),custom:true,
        items:p.items.filter(i=>i&&typeof i.name==='string'&&num(i.qty)).map(i=>({name:i.name,qty:num(i.qty),kind:i.kind==='egg'?'egg':'item'}))
      }));
    }catch(error){console.warn('Package value: 저장된 값을 읽지 못했습니다',error);}
  }
  function save(){
    try{localStorage.setItem(STORE,JSON.stringify({rates:state.rates,goldWon:state.goldWon,eggs:state.eggs,prices:state.prices,custom:state.custom}));}
    catch(error){/* 저장이 막힌 환경에서는 이번 방문에만 유지 */}
  }
  // 직접 넣은 단가가 데이터의 기본 단가보다 우선한다.
  const prices=()=>({...defaults,...state.prices});
  const ctx=()=>({rates:state.rates[state.basis],goldWon:state.goldWon,eggs:state.eggs,prices:prices()});
  const all=()=>state.custom.concat(official);
  function onSale(pkg){return !pkg.custom&&(pkg.always||pkg.noticeSalePeriods.some(p=>p.start&&p.end&&p.start<=today&&p.end>=today));}
  function period(pkg){
    if(pkg.custom) return `직접 등록 ${pretty(pkg.createdAt)}`;
    const starts=pkg.noticeSalePeriods.map(p=>p.start).filter(Boolean).sort(),ends=pkg.noticeSalePeriods.map(p=>p.end).filter(Boolean).sort();
    const limit=pkg.limit?' · 구매 '+(/^\d+$/.test(pkg.limit)?pkg.limit+'회':pkg.limit):'';
    if(pkg.always) return '상시 판매'+limit;
    return (starts.length?`${pretty(starts[0])} — ${pretty(ends.at(-1))}`:`공지 ${pretty(pkg.noticeDate)}`)+limit;
  }
  function resultHtml(price,c){
    const gain=c.gain==null?'—':(c.gain>=0?'+':'−')+Math.abs(c.gain).toFixed(1)+'%';
    return `<div><div class="pe-k">패키지 가격</div><div class="pe-v">${price>0?won(price):'—'}</div></div>`+
      `<div><div class="pe-k">구성품 가치</div><div class="pe-v">${won(c.value)}</div>${c.missing?`<div class="pe-sub">미환산 ${c.missing}종</div>`:''}</div>`+
      `<div><div class="pe-k">이득률</div><div class="pe-v ${c.gain>=0?'gain':'loss'}">${gain}</div>${price>0?`<div class="pe-sub">${c.value>=price?'+':'−'}${won(Math.abs(c.value-price))}</div>`:''}</div>`;
  }
  function chipHtml(line){
    const qty=line.qty.toLocaleString('ko-KR');
    if(line.egg) return `<label class="pe-chip egg" data-line="${escape(line.name)}"><b>${escape(line.key)}</b><em>×${qty}</em><input type="number" min="0" step="100" inputmode="numeric" placeholder="알 시세(원)" data-egg="${escape(line.key)}" value="${state.eggs[line.key]??''}" aria-label="${escape(line.key)} 알 1개 시세(원)"></label>`;
    return `<span class="pe-chip${line.value==null?' miss':''}" data-line="${escape(line.name)}"><b>${escape(line.name)}</b><em>×${qty}</em><i>${line.value==null?'미환산':won(line.value)}</i></span>`;
  }
  function visible(){
    const q=state.query.replace(/\s+/g,'').toLowerCase(),c=ctx();
    let list=all().map(pkg=>({pkg,c:calc(pkg,c)}));
    if(q) list=list.filter(r=>(r.pkg.name+r.pkg.items.map(i=>i.name).join('')).replace(/\s+/g,'').toLowerCase().includes(q));
    if(state.sale==='on') list=list.filter(r=>onSale(r.pkg));
    if(state.sale==='mine') list=list.filter(r=>r.pkg.custom);
    if(state.sort==='gain') list.sort((a,b)=>b.c.gain-a.c.gain);
    else if(state.sort==='price') list.sort((a,b)=>a.pkg.price-b.pkg.price);
    return list;
  }
  function render(){
    const list=visible(),page=list.slice(0,state.shown);
    $('resultCount').textContent=`${list.length}개`;
    $('moreWrap').hidden=list.length<=state.shown;
    if(!list.length){$('results').innerHTML='<div class="pkg-empty">조건에 맞는 패키지가 없습니다.</div>';return;}
    $('results').innerHTML=page.map(({pkg,c})=>{
      const title=pkg.custom||!pkg.url?escape(pkg.name):`<a href="${escape(pkg.url)}" target="_blank" rel="noopener noreferrer">${escape(pkg.name)} ↗</a>`;
      const badges=(pkg.always?'<span class="pkg-badge gold">상시</span>':onSale(pkg)?'<span class="pkg-badge gold">판매중</span>':'')+(pkg.custom?`<span class="pkg-badge">직접 등록</span><button type="button" class="pe-del" data-delete="${escape(pkg.id)}">삭제</button>`:'');
      return `<article class="pe-card" data-id="${escape(pkg.id)}"><div class="pe-card-head"><div><div class="pe-title">${title}</div><div class="pe-meta">${period(pkg)}</div></div><div class="pe-badges">${badges}</div></div><div class="pe-chips">${c.lines.map(chipHtml).join('')}</div><div class="pe-result">${resultHtml(pkg.price,c)}</div></article>`;
    }).join('');
  }
  // 알 시세 입력 중에는 카드를 다시 그리지 않고 값만 갱신해 포커스를 유지한다.
  function refreshValues(active){
    const c=ctx(),byId=new Map(all().map(p=>[p.id,p]));
    document.querySelectorAll('.pe-card').forEach(card=>{
      const pkg=byId.get(card.dataset.id);if(!pkg)return;
      card.querySelector('.pe-result').innerHTML=resultHtml(pkg.price,calc(pkg,c));
    });
    document.querySelectorAll('#results [data-egg]').forEach(input=>{if(input!==active) input.value=state.eggs[input.dataset.egg]??'';});
  }
  function syncBasis(){
    $('rateDia').value=state.rates[state.basis].dia;$('rateGold').value=state.rates[state.basis].gold;$('rateGoldCoin').value=state.goldWon||'';
  }
  function chipGroup(id,attr,key){
    $(id).addEventListener('click',e=>{
      const b=e.target.closest(`[data-${attr}]`);if(!b)return;
      state[key]=b.dataset[attr];state.shown=PAGE;
      $(id).querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b);});
      render();
    });
  }
  $('rateGoldCoin').addEventListener('input',e=>{state.goldWon=num(e.target.value);save();render();});
  for(const [id,field] of [['rateDia','dia'],['rateGold','gold']]) $(id).addEventListener('input',e=>{const v=Number(e.target.value);state.rates[state.basis][field]=v>=0&&Number.isFinite(v)?v:0;save();render();});
  chipGroup('sortChips','sort','sort');chipGroup('saleChips','sale','sale');
  $('query').addEventListener('input',e=>{state.query=e.target.value;state.shown=PAGE;render();});
  $('more').addEventListener('click',()=>{state.shown+=PAGE;render();});
  $('results').addEventListener('input',e=>{
    const input=e.target.closest('[data-egg]');if(!input)return;
    const v=num(input.value);if(v) state.eggs[input.dataset.egg]=v; else delete state.eggs[input.dataset.egg];
    save();refreshValues(input);
  });
  $('results').addEventListener('change',e=>{if(e.target.closest('[data-egg]')&&state.sort==='gain')render();});
  $('results').addEventListener('click',e=>{
    const del=e.target.closest('[data-delete]');if(!del)return;
    state.custom=state.custom.filter(p=>p.id!==del.dataset.delete);save();render();
  });
  document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close)close.closest('dialog').close();});

  /* ── 아이템 단가 ── */
  function itemNames(){
    const names=new Set();
    for(const pkg of all()) for(const item of pkg.items) if(!isEgg(item)&&item.name!=='다이아'&&item.name!=='황금 다이아'&&!item.name.startsWith('알(')) names.add(item.name);
    return Array.from(names).sort((a,b)=>a.localeCompare(b,'ko'));
  }
  function eggNames(){
    const names=new Set();
    for(const pkg of all()) for(const item of pkg.items) if(isEgg(item)) names.add(eggKey(item.name));
    return Array.from(names).sort((a,b)=>a.localeCompare(b,'ko'));
  }
  $('openPrices').addEventListener('click',()=>{
    $('priceList').innerHTML=itemNames().map(name=>{
      const p=state.prices[name]||defaults[name];
      return `<label class="pe-line"><span>${escape(name)}</span><input type="number" min="0" step="any" inputmode="decimal" data-price="${escape(name)}" value="${p?p.v:''}" placeholder="단가"><select data-unit="${escape(name)}" aria-label="${escape(name)} 단가 단위"><option value="dia"${!p||p.u==='dia'?' selected':''}>다이아</option><option value="won"${p?.u==='won'?' selected':''}>원</option><option value="gold"${p?.u==='gold'?' selected':''}>골드</option></select></label>`;
    }).join('');
    $('priceDialog').showModal();
  });
  function readPrice(name){
    const line=$('priceList'),input=line.querySelector(`[data-price="${CSS.escape(name)}"]`),sel=line.querySelector(`[data-unit="${CSS.escape(name)}"]`);
    const v=num(input.value);if(v) state.prices[name]={v,u:unit(sel.value)}; else delete state.prices[name];
    save();
  }
  $('priceList').addEventListener('input',e=>{const t=e.target.closest('[data-price],[data-unit]');if(t)readPrice(t.dataset.price||t.dataset.unit);});
  $('priceList').addEventListener('change',e=>{const t=e.target.closest('[data-unit]');if(t)readPrice(t.dataset.unit);});
  $('priceDialog').addEventListener('close',render);

  /* ── 패키지 등록 ── */
  function itemLine(){return '<div class="pe-line"><input type="text" list="itemNames" maxlength="30" placeholder="구성품 이름" data-f="name"><input type="number" min="0" step="1" inputmode="numeric" placeholder="수량" data-f="qty"><button type="button" data-remove>삭제</button></div>';}
  function eggLine(){return '<div class="pe-line"><input type="text" list="eggNames" maxlength="30" placeholder="알(드래곤) 이름" data-f="name"><input type="number" min="0" step="1" inputmode="numeric" placeholder="수량" data-f="qty" value="1"><input type="number" min="0" step="100" inputmode="numeric" placeholder="알 시세(원)" data-f="price"><button type="button" data-remove>삭제</button></div>';}
  function readForm(){
    const items=[],eggs={};
    $('regItems').querySelectorAll('.pe-line').forEach(line=>{
      const name=line.querySelector('[data-f=name]').value.trim(),qty=num(line.querySelector('[data-f=qty]').value);
      if(name&&qty) items.push({name,qty,kind:'item'});
    });
    $('regEggs').querySelectorAll('.pe-line').forEach(line=>{
      const name=line.querySelector('[data-f=name]').value.trim(),qty=num(line.querySelector('[data-f=qty]').value),price=num(line.querySelector('[data-f=price]').value);
      if(name&&qty){items.push({name,qty,kind:'egg'});if(price) eggs[eggKey(name)]=price;}
    });
    return {name:$('regName').value.trim(),price:num($('regPrice').value),items,eggs};
  }
  function preview(){
    const form=readForm(),c=ctx();
    $('regPreview').innerHTML=resultHtml(form.price,calc(form,{...c,eggs:{...c.eggs,...form.eggs}}));
  }
  $('openRegister').addEventListener('click',()=>{
    $('registerForm').reset();
    $('itemNames').innerHTML=['다이아','황금 다이아'].concat(itemNames()).map(n=>`<option value="${escape(n)}">`).join('');
    $('eggNames').innerHTML=eggNames().map(n=>`<option value="${escape(n)}">`).join('');
    $('regItems').innerHTML=itemLine()+itemLine();$('regEggs').innerHTML=eggLine();
    preview();$('registerDialog').showModal();
  });
  $('regAddItem').addEventListener('click',()=>$('regItems').insertAdjacentHTML('beforeend',itemLine()));
  $('regAddEgg').addEventListener('click',()=>$('regEggs').insertAdjacentHTML('beforeend',eggLine()));
  $('registerForm').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){b.closest('.pe-line').remove();preview();}});
  $('registerForm').addEventListener('input',e=>{
    // 이미 저장된 알 시세가 있으면 이름을 고를 때 채워 준다.
    const name=e.target.closest('#regEggs [data-f=name]');
    if(name){const price=name.closest('.pe-line').querySelector('[data-f=price]'),known=state.eggs[eggKey(name.value.trim())];if(known&&!price.value) price.value=known;}
    preview();
  });
  $('registerForm').addEventListener('submit',e=>{
    e.preventDefault();
    const form=readForm();
    if(!form.name||!form.price){$('registerForm').reportValidity();return;}
    if(!form.items.length){$('regPreview').innerHTML='<div><div class="pe-k">구성품 또는 알을 한 줄 이상 입력해 주세요.</div></div>';return;}
    Object.assign(state.eggs,form.eggs);
    state.custom.unshift({id:'c'+Date.now().toString(36),name:form.name,price:form.price,createdAt:today,custom:true,items:form.items});
    save();state.shown=PAGE;$('registerDialog').close();render();
  });

  async function init(){
    load();syncBasis();
    try{
      const response=await fetch('./data/pkg-prices.json',{cache:'no-cache'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const source=await response.json();
      if(source.schemaVersion!==1||!Array.isArray(source.packages))throw Error('지원하지 않는 데이터 형식');
      for(const [name,v] of Object.entries(source.itemPrices?.items||{})) {const val=typeof v==='object'&&v?v.v:v,u=typeof v==='object'&&v?v.u:source.itemPrices.unit;if(num(val)) defaults[name]={v:num(val),u:unit(u)};}
      official=source.packages.filter(p=>Number.isFinite(p.price)&&p.price>0&&Array.isArray(p.items)&&p.items.length)
        .map((p,i)=>({...p,id:'n'+p.noticeIds.join('-')+'-'+i,noticeSalePeriods:p.noticeSalePeriods||[]}));
      $('syncStatus').textContent=`패키지 ${official.length.toLocaleString('ko-KR')}개 · 마지막 확인 ${pretty(source.checkedAt)}`;
      render();
    }catch(error){
      $('syncStatus').classList.add('error');$('syncStatus').textContent='패키지 기록을 불러오지 못했습니다. 직접 등록한 패키지만 표시합니다.';
      console.error('Package value:',error);render();
    }
  }
  init();
})(globalThis);
