(function(root){
  'use strict';
  const GENERIC=/다이아|골드|Lv|레벨업|부화기|정수|보석|결정|망치|합성석|꿈의 (공격|방어|체력)|강림|뽑기권|얼음 조각|사탕|물약|정기|치료제|디바인 스톤|해제권|뿔|장식|정령|토벌권|티켓|루비|확정권|변환권|스크롤|수정|파티클/;
  // market: 유저 거래 시세(다이아 100개 800원, 황금 다이아 7,400개 55,000원)
  // ingame: 다이아 상점(33,000원에 1,500개), 황금 다이아 상점(33,000원에 1,100개)
  const DEFAULT_RATES={market:{dia:8,gold:7.43},ingame:{dia:22,gold:30}};
  // 같은 드래곤은 표기(알/드래곤 알/의 알)가 달라도 하나의 시세 키로 묶는다.
  function eggKey(name){
    return name.replace(/\(알\)/g,'').replace(/\s*드래곤의?\s*알$/,'').replace(/의\s*알$/,'').replace(/\s*알$/,'').replace(/\s+/g,' ').trim().replace(/^블랙 아머$/,'블랙아머');
  }
  // 유저 간 거래가 되는 건 드래곤 알뿐이라, 거래가 안 되는 육성 재료는 알 시세 입력에서 뺀다.
  const NOT_EGG=new Set(['카닐']);
  function isEgg(item){
    if(item.kind) return item.kind==='egg';
    // 강림 전용 장식도 거래 시세를 직접 넣는 항목이라 알과 같은 입력칸으로 받는다.
    if(/전용 장식/.test(item.name)) return true;
    return !GENERIC.test(item.name)&&!item.name.startsWith('알(')&&!NOT_EGG.has(item.name);
  }
  // 구성품 한 줄의 1개 단가(원). 단가를 모르면 null.
  function unitWon(item,ctx){
    if(isEgg(item)){const v=Number(ctx.eggs[eggKey(item.name)]);return v>0?v:null;}
    if(item.name==='다이아') return ctx.rates.dia;
    if(item.name==='황금 다이아') return ctx.rates.gold;
    // 골드는 거래가 안 돼서 기본 0원. 직접 시세를 넣으면 그 값으로 환산한다.
    if(item.name==='골드') return ctx.goldWon>0?ctx.goldWon/1e8:0;
    const p=ctx.prices[item.name];
    // 기본 단가 0은 '가치 없음'으로 확정된 값이라 미환산과 구분한다.
    if(!p||!(Number(p.v)>=0)) return null;
    // 단위: won=원, dia=다이아, gdia=황금 다이아, gold=골드(골드 1억당 원 시세로 환산)
    if(p.u==='gdia') return Number(p.v)*ctx.rates.gold;
    if(p.u==='gold') return ctx.goldWon>0?Number(p.v)*ctx.goldWon/1e8:0;
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
  const state={basis:'market',rates:{market:{...DEFAULT_RATES.market},ingame:{...DEFAULT_RATES.ingame}},goldWon:0,eggs:{},prices:{market:{},ingame:{}},custom:[],query:'',sort:'recent',sale:'all',shown:PAGE};
  // 골드 1억의 기본값(다이아 개수). 직접 입력한 골드 시세가 없을 때 다이아 단가를 곱해 쓴다.
  let official=[],defaults={},defaultsIngame={},defaultGoldDia=0,notes={},notesIngame={};
  // 구성품 아이콘: 아이템은 assets/items 코드, 드래곤 알은 드래곤 번호(성체 프로필)로 보여 준다.
  let icons={items:{},eggs:{}};
  function iconHtml(line){
    const code=line.egg?icons.eggs[line.key]:icons.items[line.name];
    if(code==null) return '';
    const src=line.egg?`dragon/${encodeURIComponent(code)}/profile/4.png`:`assets/items/${encodeURIComponent(code)}.webp`;
    return `<img class="pe-ico" src="${src}" alt="" loading="lazy" decoding="async">`;
  }
  const BASIS_LABEL={market:'유저 거래 기준',ingame:'인게임 재화값 기준'};
  const TYPE_LABEL={trade:'유저 거래가',shop:'인게임 상점',estimate:'추정',zero:'0원 지정'};
  const num=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:0;};
  // 단가는 0도 유효한 값(평가 제외)이라 빈칸만 '값 없음'으로 본다.
  const priceVal=value=>{if(value===''||value==null)return null;const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;};
  const unit=value=>value==='won'||value==='gold'||value==='gdia'?value:'dia';
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
      if(saved.basis==='ingame'||saved.basis==='market') state.basis=saved.basis;
      // 잠깐 쓰던 인게임 기본값(다이아 5.12원)이 저장돼 있으면 새 기본값을 쓴다.
      if(saved.rates?.ingame?.dia===5.12) delete saved.rates.ingame.dia;
      for(const k of ['market','ingame']) for(const f of ['dia','gold']){const v=Number(saved.rates?.[k]?.[f]);if(v>=0&&Number.isFinite(v)) state.rates[k][f]=v;}
      for(const [k,v] of Object.entries(saved.eggs||{})) if(num(v)) state.eggs[k]=num(v);
      const readPrices=src=>{const out={};for(const [k,p] of Object.entries(src||{})){const v=priceVal(p?.v);if(v!=null&&p.u!=='evt') out[k]={v,u:unit(p.u)};}return out;};
      if(saved.prices&&(saved.prices.market||saved.prices.ingame)){state.prices.market=readPrices(saved.prices.market);state.prices.ingame=readPrices(saved.prices.ingame);}
      // 예전 버전은 두 기준이 같은 단가를 썼으니 양쪽에 그대로 옮긴다.
      else if(saved.prices){state.prices.market=readPrices(saved.prices);state.prices.ingame=readPrices(saved.prices);}
      if(Array.isArray(saved.custom)) state.custom=saved.custom.filter(p=>p&&typeof p.name==='string'&&num(p.price)&&Array.isArray(p.items)).map(p=>({
        id:String(p.id),name:p.name,price:num(p.price),createdAt:String(p.createdAt||today),custom:true,
        items:p.items.filter(i=>i&&typeof i.name==='string'&&num(i.qty)).map(i=>({name:i.name,qty:num(i.qty),kind:i.kind==='egg'?'egg':'item'}))
      }));
    }catch(error){console.warn('Package value: 저장된 값을 읽지 못했습니다',error);}
  }
  function save(){
    try{localStorage.setItem(STORE,JSON.stringify({basis:state.basis,rates:state.rates,goldWon:state.goldWon,eggs:state.eggs,prices:state.prices,custom:state.custom}));}
    catch(error){/* 저장이 막힌 환경에서는 이번 방문에만 유지 */}
  }
  // 직접 넣은 단가가 데이터의 기본 단가보다 우선한다.
  // 인게임 기준에서는 인게임 가격이 있는 아이템만 그 값으로 바꾸고, 나머지는 유저 거래 단가를 그대로 쓴다.
  const baseDefaults=()=>({...defaults,...(state.basis==='ingame'?defaultsIngame:{})});
  const prices=()=>({...baseDefaults(),...state.prices[state.basis]});
  const goldWon=()=>state.goldWon>0?state.goldWon:defaultGoldDia*state.rates[state.basis].dia;
  const ctx=()=>({rates:state.rates[state.basis],goldWon:goldWon(),eggs:state.eggs,prices:prices()});
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
    if(line.egg) return `<label class="pe-chip egg" data-line="${escape(line.name)}">${iconHtml(line)}<b>${escape(line.key)}</b><em>×${qty}</em><input type="number" min="0" step="100" inputmode="numeric" placeholder="${/장식/.test(line.key)?'장식':'알'} 시세(원)" data-egg="${escape(line.key)}" value="${state.eggs[line.key]??''}" aria-label="${escape(line.key)} 1개 시세(원)"></label>`;
    return `<span class="pe-chip${line.value==null?' miss':''}" data-line="${escape(line.name)}">${iconHtml(line)}<b>${escape(line.name)}</b><em>×${qty}</em><i>${line.value==null?'미환산':won(line.value)}</i></span>`;
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
      // 인게임 상점 배너가 있으면 이름 옆에 붙여서 패키지를 한눈에 구분할 수 있게 한다.
      const banner=pkg.banner?`<div class="pe-banner"><img src="assets/pkg-banner/${escape(pkg.banner)}" alt="" loading="lazy" decoding="async"></div>`:'';
      return `<article class="pe-card" data-id="${escape(pkg.id)}"><div class="pe-card-head">${banner}<div class="pe-head-text"><div class="pe-title">${title}</div><div class="pe-meta">${period(pkg)}</div></div><div class="pe-badges">${badges}</div></div><div class="pe-chips">${c.lines.map(chipHtml).join('')}</div><div class="pe-result">${resultHtml(pkg.price,c)}</div></article>`;
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
    document.querySelectorAll('[data-basis]').forEach(b=>{const on=b.dataset.basis===state.basis;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);});
    $('rateDia').value=state.rates[state.basis].dia;$('rateGold').value=state.rates[state.basis].gold;$('rateGoldCoin').value=state.goldWon||'';$('rateGoldCoin').placeholder=defaultGoldDia?`기본 ${Math.round(defaultGoldDia*state.rates[state.basis].dia).toLocaleString('ko-KR')}`:'기본 0';
  }
  function chipGroup(id,attr,key){
    $(id).addEventListener('click',e=>{
      const b=e.target.closest(`[data-${attr}]`);if(!b)return;
      state[key]=b.dataset[attr];state.shown=PAGE;
      $(id).querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b);});
      render();
    });
  }
  $('rateGoldCoin').addEventListener('input',e=>{state.goldWon=num(e.target.value);save();render();refreshCalc();});
  $('basis').addEventListener('click',e=>{const b=e.target.closest('[data-basis]');if(!b)return;state.basis=b.dataset.basis;syncBasis();save();render();refreshCalc();renderNotes();});
  for(const [id,field] of [['rateDia','dia'],['rateGold','gold']]) $(id).addEventListener('input',e=>{const v=Number(e.target.value);state.rates[state.basis][field]=v>=0&&Number.isFinite(v)?v:0;save();syncBasis();render();refreshCalc();});
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
      const own=state.prices[state.basis][name],p=own||prices()[name],n=noteOf(name);
      return `<label class="pe-line"><span>${escape(name)}${own?' <em class="pe-own">직접 수정</em>':''}${n?`<small class="pe-note">${escape(TYPE_LABEL[n.type]||'')} · ${escape(n.basis)}</small>`:''}</span><input type="number" min="0" step="any" inputmode="decimal" data-price="${escape(name)}" value="${p?p.v:''}" placeholder="단가"><select data-unit="${escape(name)}" aria-label="${escape(name)} 단가 단위"><option value="dia"${!p||p.u==='dia'?' selected':''}>다이아</option><option value="gdia"${p?.u==='gdia'?' selected':''}>황금 다이아</option><option value="won"${p?.u==='won'?' selected':''}>원</option><option value="gold"${p?.u==='gold'?' selected':''}>골드</option></select></label>`;
    }).join('');
    $('priceBasis').textContent=BASIS_LABEL[state.basis];
    $('priceDialog').showModal();
  });
  function readPrice(name){
    const line=$('priceList'),input=line.querySelector(`[data-price="${CSS.escape(name)}"]`),sel=line.querySelector(`[data-unit="${CSS.escape(name)}"]`);
    const v=priceVal(input.value),own=state.prices[state.basis];if(v!=null) own[name]={v,u:unit(sel.value)}; else delete own[name];
    save();
  }
  $('priceList').addEventListener('input',e=>{const t=e.target.closest('[data-price],[data-unit]');if(t)readPrice(t.dataset.price||t.dataset.unit);});
  $('priceList').addEventListener('change',e=>{const t=e.target.closest('[data-unit]');if(t)readPrice(t.dataset.unit);});
  $('priceDialog').addEventListener('close',()=>{render();refreshCalc();renderNotes();});

  /* ── 패키지 등록 ── */
  /* ── 직접 계산: 왼쪽 목록에서 눌러 담고, 오른쪽 바구니에서 수량을 넣는다 ── */
  const QUICK=['다이아','황금 다이아','골드','스페셜 Lv+1','Lv-1','Lv+1','프리미엄 Lv+1','꿈의 부화기 +1','상급 초월의 정수 세트','초월의 보석','최상급 강화의 정수','꿈의 정수(최상급)','페르시온 결정','강림 강화곤','더블 맥스 레벨업','합성석','디트의 망치','카닐'];
  const PICK_TABS=[['all','자주 쓰는'],['cur','재화'],['lv','레벨업'],['mat','정수·재료'],['gem','젬·망치'],['etc','정령·기타'],['egg','드래곤']];
  let pickTab='all';
  function catOf(name){
    if(/^(다이아|황금 다이아|골드|루비|디바인 스톤|카닐|축복의 보석|얼음 조각|사탕)$/.test(name)) return 'cur';
    if(/Lv|레벨업|부화기|더블 맥스|승천/.test(name)) return 'lv';
    if(/꿈의 (공격|방어|체력)|망치|합성석|아르하의 (공격|방어|체력)/.test(name)) return 'gem';
    if(/정수|보석|결정|강림|파티클|수정|강화곤|정기|뿔|보주/.test(name)) return 'mat';
    return 'etc';
  }
  // 지금 목록의 패키지에 자주 들어가는 구성품 순서(자주 쓰는 탭·자동완성용)
  function itemFreq(){
    const count=new Map();
    for(const pkg of all()) for(const item of pkg.items) if(!isEgg(item)&&!item.name.startsWith('알(')) count.set(item.name,(count.get(item.name)||0)+1);
    for(const name of Object.keys(prices())) if(!count.has(name)) count.set(name,0);
    return Array.from(count).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko')).map(([n])=>n);
  }
  // 드래곤은 최근 패키지에 나온 순서대로
  function eggRecent(){
    const seen=new Set();
    for(const pkg of [...all()].sort((a,b)=>String(b.noticeDate||b.createdAt||'').localeCompare(String(a.noticeDate||a.createdAt||'')))) for(const item of pkg.items) if(isEgg(item)) seen.add(eggKey(item.name));
    return [...seen];
  }
  const fmtUnit=w=>w==null?'단가 없음':w>0&&w<10?w.toFixed(2)+'원':won(w);
  // 골드는 1개 단가가 너무 작아서 1억 기준으로 보여 준다.
  const unitLabel=(name,c)=>name==='골드'?'1억 '+won(c.goldWon):fmtUnit(unitWon({name,kind:'item'},c));
  const norm=v=>v.replace(/\s+/g,'').toLowerCase();
  function tileHtml(name,kind){
    const c=ctx(),egg=kind==='egg',line={name,egg,key:egg?eggKey(name):null};
    const sub=egg?(state.eggs[eggKey(name)]?won(state.eggs[eggKey(name)]):'알 시세 입력'):unitLabel(name,c);
    return `<button type="button" class="pe-tile${egg?' egg':''}" data-pick="${escape(name)}" data-kind="${kind}" title="${escape(name)}">${iconHtml(line)||'<span class="pe-ico pe-ico-none"></span>'}<span class="pe-tile-name">${escape(name)}</span><small>${escape(sub)}</small><b class="pe-tile-n" hidden></b></button>`;
  }
  function renderPick(){
    const q=norm($('pickQuery').value||'');
    const items=[...new Set([...QUICK,...itemFreq()])].filter(n=>!n.startsWith('알(')),eggs=eggRecent();
    let list;
    if(q) list=[...items.filter(n=>norm(n).includes(q)).map(n=>[n,'item']),...eggs.filter(n=>norm(n).includes(q)).map(n=>[n,'egg'])];
    else if(pickTab==='egg') list=eggs.map(n=>[n,'egg']);
    else if(pickTab==='all') list=items.slice(0,24).map(n=>[n,'item']);
    else list=items.filter(n=>catOf(n)===pickTab).map(n=>[n,'item']);
    $('pickTabs').innerHTML=PICK_TABS.map(([k,l])=>`<button type="button" role="tab" data-tab="${k}" aria-selected="${!q&&pickTab===k}" class="${!q&&pickTab===k?'on':''}">${l}</button>`).join('');
    $('pickGrid').innerHTML=list.length?list.map(([n,k])=>tileHtml(n,k)).join(''):`<div class="pe-pick-empty">검색 결과가 없어요. 아래에 이름을 직접 넣어 담을 수 있어요.</div>`;
    markTiles();
  }
  function lineHtml(name,kind,qty=''){
    const egg=kind==='egg',line={name,egg,key:egg?eggKey(name):null};
    const unitText=egg?'':`<small>${name==='골드'?'':'개당 '}${escape(unitLabel(name,ctx()))}</small>`;
    const price=egg?`<input type="number" min="0" step="100" inputmode="numeric" placeholder="알 시세(원)" data-f="price" value="${escape(state.eggs[eggKey(name)]??'')}" aria-label="${escape(name)} 알 1개 시세(원)">`:'';
    return `<div class="pe-line${egg?' egg':''}" data-kind="${kind}" data-name="${escape(name)}">${iconHtml(line)||'<span class="pe-ico pe-ico-none"></span>'}<span class="pe-line-name">${escape(name)}${unitText}</span><input type="number" min="0" step="1" inputmode="numeric" placeholder="수량" data-f="qty" value="${escape(qty)}" aria-label="${escape(name)} 수량">${price}<i class="pe-line-val" data-f="val"></i><button type="button" data-remove aria-label="${escape(name)} 빼기">×</button></div>`;
  }
  const basketLines=()=>[...$('regItems').querySelectorAll('.pe-line')];
  function addLine(name,kind,qty){
    name=String(name||'').trim();if(!name)return;
    if(!kind) kind=isEgg({name})?'egg':'item';
    if(kind==='egg') name=eggKey(name);
    let line=basketLines().find(l=>l.dataset.kind===kind&&l.dataset.name===name);
    if(!line){
      $('regItems').querySelector('.pe-basket-empty')?.remove();
      $('regItems').insertAdjacentHTML('beforeend',lineHtml(name,kind,qty??(kind==='egg'?1:'')));
      line=$('regItems').lastElementChild;
    }else if(qty!=null) line.querySelector('[data-f=qty]').value=qty;
    preview();
    return line;
  }
  function focusLine(line){
    if(!line)return;
    const input=line.dataset.kind==='egg'&&!line.querySelector('[data-f=price]').value?line.querySelector('[data-f=price]'):line.querySelector('[data-f=qty]');
    input.focus();try{input.select();}catch(error){/* 일부 브라우저는 숫자칸 선택을 막음 */}
    line.classList.add('flash');setTimeout(()=>line.classList.remove('flash'),500);
  }
  function clearBasket(){$('regItems').innerHTML='<div class="pe-basket-empty">왼쪽에서 구성품을 눌러 담아 주세요.</div>';}
  function fillTemplate(id){
    const pkg=all().find(p=>p.id===id);if(!pkg)return;
    $('regName').value=pkg.name;$('regPrice').value=pkg.price;
    clearBasket();
    for(const i of pkg.items) addLine(isEgg(i)?eggKey(i.name):i.name,isEgg(i)?'egg':'item',i.qty);
    preview();
  }
  function readForm(){
    const items=[],eggs={};
    basketLines().forEach(line=>{
      const name=line.dataset.name,kind=line.dataset.kind,qty=num(line.querySelector('[data-f=qty]').value);
      if(!name||!qty)return;
      items.push({name,qty,kind});
      if(kind==='egg'){const price=num(line.querySelector('[data-f=price]').value);if(price) eggs[eggKey(name)]=price;}
    });
    return {name:$('regName').value.trim(),price:num($('regPrice').value),items,eggs};
  }
  // 바구니에 담긴 수량을 왼쪽 목록 타일에 표시
  function markTiles(){
    const have=new Map(basketLines().map(l=>[l.dataset.kind+':'+l.dataset.name,l.querySelector('[data-f=qty]').value]));
    $('pickGrid').querySelectorAll('.pe-tile').forEach(t=>{
      const v=have.get(t.dataset.kind+':'+(t.dataset.kind==='egg'?eggKey(t.dataset.pick):t.dataset.pick));
      const n=t.querySelector('.pe-tile-n');t.classList.toggle('in',v!=null);n.hidden=v==null;n.textContent=v?'×'+Number(v).toLocaleString('ko-KR'):'담음';
    });
  }
  function preview(){
    const form=readForm(),c=ctx(),cc={...c,eggs:{...c.eggs,...form.eggs}};
    $('regPreview').innerHTML=resultHtml(form.price,calc(form,cc));
    const lines=basketLines();
    lines.forEach(line=>{
      const name=line.dataset.name,kind=line.dataset.kind,qty=num(line.querySelector('[data-f=qty]').value),out=line.querySelector('[data-f=val]');
      if(!qty){out.textContent='';out.classList.remove('miss');return;}
      const unitPrice=unitWon({name,kind},cc);
      out.textContent=unitPrice==null?(kind==='egg'?'시세 없음':'미환산'):won(unitPrice*qty);out.classList.toggle('miss',unitPrice==null);
    });
    $('basketCount').textContent=lines.length?`${lines.length}종`:'';
    if(!lines.length&&!$('regItems').querySelector('.pe-basket-empty')) clearBasket();
    markTiles();
  }
  // 기준·단가가 바뀌면 목록 타일과 바구니의 개당 단가를 다시 계산
  function refreshCalc(){
    renderPick();
    basketLines().forEach(line=>{const small=line.querySelector('.pe-line-name small');if(small&&line.dataset.kind!=='egg') small.textContent=(line.dataset.name==='골드'?'':'개당 ')+unitLabel(line.dataset.name,ctx());});
    preview();
  }
  function resetForm(){
    $('registerForm').reset();
    const items=[...new Set([...QUICK,...itemFreq()])].filter(n=>!n.startsWith('알('));
    $('pickNames').innerHTML=[...items,...eggRecent()].map(n=>`<option value="${escape(n)}">`).join('');
    $('regTemplate').innerHTML='<option value="">직접 입력</option>'+all().filter(p=>p.price&&p.items.length).map(p=>`<option value="${escape(p.id)}">${escape(p.name)} · ${won(p.price)}${p.custom?' · 직접 등록':p.always?' · 상시':' · '+pretty(p.noticeDate)}</option>`).join('');
    clearBasket();renderPick();preview();
  }
  $('regReset').addEventListener('click',resetForm);
  $('basketClear').addEventListener('click',()=>{clearBasket();preview();});
  $('regTemplate').addEventListener('change',e=>{if(e.target.value)fillTemplate(e.target.value);});
  $('pickTabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;pickTab=b.dataset.tab;$('pickQuery').value='';renderPick();});
  $('pickQuery').addEventListener('input',renderPick);
  $('pickGrid').addEventListener('click',e=>{const b=e.target.closest('[data-pick]');if(b)focusLine(addLine(b.dataset.pick,b.dataset.kind));});
  function freeAdd(){const v=$('freeName').value.trim();if(!v)return;$('freeName').value='';focusLine(addLine(v));}
  $('freeAdd').addEventListener('click',freeAdd);
  // 엔터: 검색칸이면 첫 결과 담기, 수량·시세칸이면 다시 검색칸으로. 폼 제출은 막는다.
  $('registerForm').addEventListener('keydown',e=>{
    if(e.key!=='Enter'||e.isComposing)return;
    const t=e.target;if(!(t instanceof HTMLInputElement))return;
    e.preventDefault();
    if(t.id==='pickQuery'){const first=$('pickGrid').querySelector('[data-pick]');if(first){focusLine(addLine(first.dataset.pick,first.dataset.kind));t.value='';renderPick();}return;}
    if(t.id==='freeName'){freeAdd();return;}
    if(t.closest('.pe-line')){const q=$('pickQuery');q.focus();try{q.select();}catch(error){/* 무시 */}}
  });
  $('registerForm').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){b.closest('.pe-line').remove();preview();}});
  $('registerForm').addEventListener('input',e=>{if(e.target.closest('#regItems,#regPrice'))preview();});
  $('registerForm').addEventListener('submit',e=>{
    e.preventDefault();
    const form=readForm();
    if(!form.name||!form.price){$('regPreview').innerHTML='<div><div class="pe-k">패키지 이름과 가격을 입력해 주세요.</div></div>';return;}
    if(!form.items.length){$('regPreview').innerHTML='<div><div class="pe-k">구성품을 하나 이상 담고 수량을 넣어 주세요.</div></div>';return;}
    Object.assign(state.eggs,form.eggs);
    state.custom.unshift({id:'c'+Date.now().toString(36),name:form.name,price:form.price,createdAt:today,custom:true,items:form.items});
    save();state.shown=PAGE;resetForm();render();
  });

  /* ── 단가 근거 ── */
  function noteOf(name){return (state.basis==='ingame'&&notesIngame[name])||notes[name]||null;}
  function renderNotes(){
    const box=$('noteList');if(!box)return;
    const c=ctx(),groups={trade:[],shop:[],estimate:[],zero:[]};
    const names=new Set([...Object.keys(notes),...Object.keys(notesIngame)]);
    for(const name of names){
      const n=noteOf(name);if(!n||!groups[n.type])continue;
      const w=unitWon({name},c),own=state.prices[state.basis][name];
      groups[n.type].push(`<tr><td>${escape(name)}</td><td class="pe-num">${w==null?'—':w<10&&w>0?w.toFixed(2)+'원':won(w)}${own?' <em class="pe-own">직접 수정</em>':''}</td><td>${escape(n.basis)}</td></tr>`);
    }
    $('noteBasis').textContent=BASIS_LABEL[state.basis];
    box.innerHTML=Object.entries(groups).filter(([,r])=>r.length).map(([t,r])=>`<h3>${TYPE_LABEL[t]} <span class="pkg-muted">${r.length}종</span></h3><div class="pe-table-wrap"><table class="pe-table"><thead><tr><th>아이템</th><th>1개 단가</th><th>근거</th></tr></thead><tbody>${r.join('')}</tbody></table></div>`).join('');
  }
  async function init(){
    load();syncBasis();
    try{
      const response=await fetch('./data/pkg-prices.json',{cache:'no-cache'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const source=await response.json();
      if(source.schemaVersion!==1||!Array.isArray(source.packages))throw Error('지원하지 않는 데이터 형식');
      if(num(source.itemPrices?.goldPer100mDia)) defaultGoldDia=num(source.itemPrices.goldPer100mDia);
      if(source.itemIcons) icons={items:source.itemIcons.items||{},eggs:source.itemIcons.eggs||{}};
      syncBasis();
      for(const [name,v] of Object.entries(source.itemPrices?.items||{})) {const val=typeof v==='object'&&v?v.v:v,u=typeof v==='object'&&v?v.u:source.itemPrices.unit;if(Number.isFinite(Number(val))&&Number(val)>=0) defaults[name]={v:Number(val),u:unit(u)};}
      notes=source.itemPrices?.notes||{};notesIngame=source.itemPrices?.ingameNotes||{};
      for(const [name,v] of Object.entries(source.itemPrices?.ingame||{})) {const val=typeof v==='object'&&v?v.v:v,u=typeof v==='object'&&v?v.u:source.itemPrices.unit;if(Number.isFinite(Number(val))&&Number(val)>=0) defaultsIngame[name]={v:Number(val),u:unit(u)};}
      // 지금 구성으로 바뀐 시점(listFrom) 이전의 기간 한정 패키지는 목록에서 뺀다. 상시 패키지·패스는 항상 표시.
      const listFrom=typeof source.listFrom==='string'?source.listFrom:'';
      official=source.packages.filter(p=>Number.isFinite(p.price)&&p.price>0&&Array.isArray(p.items)&&p.items.length&&(p.always||!listFrom||p.noticeDate>=listFrom))
        .map((p,i)=>({...p,id:'n'+p.noticeIds.join('-')+'-'+i,noticeSalePeriods:p.noticeSalePeriods||[]}));
      $('syncStatus').textContent=`패키지 ${official.length.toLocaleString('ko-KR')}개${listFrom?` (${pretty(listFrom)} 이후 판매분과 상시 패키지)`:''} · 마지막 확인 ${pretty(source.checkedAt)}`;
      render();resetForm();renderNotes();
    }catch(error){
      $('syncStatus').classList.add('error');$('syncStatus').textContent='패키지 기록을 불러오지 못했습니다. 직접 등록한 패키지만 표시합니다.';
      console.error('Package value:',error);render();
    }
  }
  init();
})(globalThis);
