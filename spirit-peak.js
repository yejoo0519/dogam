(function(w,d){
 'use strict';
 const D=PeakData,$=id=>d.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const assetBase=new URL('.',document.currentScript.src).href;
 const icon=(src,label)=>`<img class="peak-item-image" src="${esc(src)}" alt="${esc(label)}" loading="lazy" onerror="this.onerror=null;this.src='${assetBase}assets/peak-equipment.svg'">`;
 const gemIcon=s=>icon('https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/icon/'+({hp:15,atk:16,def:17}[s])+'.png',D.SK[s]+' 젬');
 const freshSpirit=()=>({opts:Array.from({length:4},(_,i)=>({stat:'',type:i===3?'+':'%'})),bonus:''});
 const state={spirit:freshSpirit(),result:null,sort:'bv',type:'all',busy:false};
 function dirty(){if(state.result)$('peak-status').textContent='입력 조건이 변경되었습니다. 아래 결과는 직전 계산 결과입니다. 다시 계산해 주세요.';}
 function renderSpirit(){
   $('peak-presets').innerHTML=D.SP_PRESETS.filter(p=>p.id!=='custom').map(p=>`<button onclick="Peak.preset('${p.id}')">${p.name} <small>${p.types.join('')}</small></button>`).join('');
   $('peak-spirit').innerHTML=SpiritInput.options(state.spirit,'Peak.spOpt',[],(n,s,t)=>!s||!t?'':t==='%'?'+'+Math.round(D.SP_PCT[n]*100)+'%':'+'+D.SP_PLUS[s][n])+SpiritInput.bonus(state.spirit,'Peak.bonus',[]);
 }
 function config(){return {mode:'theory',spirit:state.spirit,grade:$('peak-grade').value,buff:Number($('peak-buff').value)};}
 function resultCard(r,i){
   const gemCounts=new Map();for(const g of r.alloc.gems){const key=g.s+'|'+D.GEM_NAME[g.lv];gemCounts.set(key,(gemCounts.get(key)||0)+1);}
   const pend=r.pend?`${r.pend.type} · ${r.pend.options.map(o=>D.SK[o.stat]+' '+o.val+'%').join(' / ')}`:'미장착';
   return `<article class="peak-result"><header><div><strong>${i+1}. ${r.type}</strong> <small>${r.buff.label}</small></div><div class="peak-metrics"><span>비밸 · 백만<b>${(r.bv/1e6).toFixed(2)}</b></span><span>TAR<b>${r.tar==null?'—':r.tar.toFixed(2)}</b></span></div></header><dl><dt>장신구</dt><dd class="peak-item-line">${icon(D.ACC_DB[r.accIndex].img,D.ACC_DB[r.accIndex].n)}<span>${esc(D.ACC_DB[r.accIndex].n)}</span></dd><dt>인첸트</dt><dd>${r.enc==='none'?'없음':D.SK[r.enc]+' +21%'}</dd><dt>젬 배분</dt><dd class="peak-gem-results">${[...gemCounts].map(([k,n])=>{const [s,lv]=k.split('|');return `<span class="peak-gem-tag" data-stat="${s}">${gemIcon(s)}${D.SK[s]} ${lv}단계 × ${n}</span>`;}).join('')||'미장착'}</dd><dt>펜던트</dt><dd class="peak-item-line">${r.pend?icon(D.IMG_PEND[r.pend.type],r.pend.type+' 펜던트'):''}<span>${pend}</span></dd></dl><div class="peak-final">${r.values.map((n,i)=>`<div>${['체력','공격','방어'][i]}<strong>${n.toLocaleString('ko-KR')}</strong></div>`).join('')}</div></article>`;
 }
 function renderResults(){
   const result=state.result;if(!result)return;
   const sorted=result.rows.slice().sort((a,b)=>(state.sort==='tar'?(b.tar??-Infinity)-(a.tar??-Infinity):b.bv-a.bv)||b.bv-a.bv||a.order-b.order);
   $('peak-type-filter').className='peak-type-filter';
   $('peak-type-filter').innerHTML=['all',...D.DTYPES].map(type=>{const best=sorted.find(r=>type==='all'||r.type===type);return `<button aria-pressed="${state.type===type}" onclick="Peak.filter('${type}')">${type==='all'?'전체':type}${best?' · '+(state.sort==='tar'?(best.tar?.toFixed(1)??'—'):(best.bv/1e6).toFixed(1)):''}</button>`;}).join('');
   const rows=sorted.filter(r=>state.type==='all'||r.type===state.type).slice(0,10);
   $('peak-result-caption').textContent=`이론상 고점 · ${result.config.grade} 등급 · ${result.config.buff}버프 · ${result.tested.toLocaleString()}개 후보 비교 · ${state.sort==='tar'?'TAR':'비밸'} TOP ${rows.length}`;
   $('peak-result-list').innerHTML=rows.map(resultCard).join('');
   d.querySelectorAll('[data-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sort===state.sort)));
 }
 w.Peak={
   dirty,
   spOpt(i,field,v){if(state.busy)return;state.spirit.opts[i][field]=v;renderSpirit();dirty();},
   bonus(v){if(state.busy)return;state.spirit.bonus=v;renderSpirit();dirty();},
   preset(id){const p=D.SP_PRESETS.find(p=>p.id===id);if(state.busy||!p)return;state.spirit.opts.forEach((o,i)=>o.type=p.types[i]);renderSpirit();dirty();},
   resetSpirit(){if(state.busy)return;state.spirit=freshSpirit();renderSpirit();dirty();},
   sort(sort){if(state.busy)return;state.sort=sort;d.querySelectorAll('[data-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sort===sort)));renderResults();},
   filter(type){state.type=type;renderResults();},
   async run(){
     if(state.busy)return;
     if(!$('peak-spirit').querySelector('.champ-chip[aria-pressed="true"]')&&!state.spirit.bonus){$('peak-status').textContent='정령 옵션 또는 부가옵을 하나 이상 입력해 주세요.';return;}
     state.busy=true;let ok=false;CalcProgress.start();$('peak-status').textContent='선택한 조건에서 고점 세팅을 찾고 있습니다.';
     try{state.result=await PeakEngine.calculate(config(),p=>CalcProgress.update(p,'고점 계산'));state.type='all';renderResults();ok=true;$('peak-status').textContent='계산 완료. 비밸·TAR 기준과 타입을 바꿔 결과를 확인하세요.';}
     catch(e){$('peak-status').textContent='계산하지 못했습니다: '+e.message;}
     finally{state.busy=false;CalcProgress.finish(ok);}
   },
   getResults:()=>state.result?JSON.parse(JSON.stringify(state.result)):null
 };
 renderSpirit();
})(window,document);
