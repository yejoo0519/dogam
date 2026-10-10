(function(){
 'use strict';
 const D=JormData,$=id=>document.getElementById(id),names={hp:'체력',atk:'공격',def:'방어',none:'없음'};
 const STORE='jorm-place-settings-v1',PEN=[13,14,15,16];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const v=id=>$(id).value,n=id=>Number($(id).value);
 const fmt=x=>x===Number.MAX_VALUE||!Number.isFinite(x)?'피해 없음':x.toLocaleString('ko-KR',{maximumFractionDigits:1});
 let slots=Array(20).fill(null),spirits=[],selected=0,worker=null,dirty=false,restoring=false,dragons=[],byId=new Map(),lastResult=null;
 const blankSpirit=()=>({opts:[{stat:'hp',type:'%'},{stat:'atk',type:'%'},{stat:'def',type:'%'},{stat:'hp',type:'+'}],bonus:'hp'});
 let editing=blankSpirit();

 /* ---------- basic fields ---------- */
 Object.keys(D.gems).sort((a,b)=>D.gemNames[b]-D.gemNames[a]).forEach(k=>$('gem').add(new Option(String(D.gemNames[k]),k)));
 const gemHelp=()=>{const g=D.gems[v('gem')];$('gemNote').textContent=`체력 +${g.hp} / 공격 +${g.atk} / 방어 +${g.def}`;};
 $('gem').addEventListener('change',gemHelp);
 Object.keys(D.potions).map(Number).sort((a,b)=>b-a).forEach(k=>$('potion').add(new Option(k+'단계',String(k)),1));
 $('potion').value=String(Math.max(...Object.keys(D.potions).map(Number)));
 let normalGrade=null;
 function bossView(){const c=v('boss')==='corrupted',g=$('grade');
  document.querySelectorAll('[data-boss]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.boss===v('boss'))));
  if(c&&!g.disabled){normalGrade=g.value;g.value='9.0';}else if(!c&&g.disabled&&normalGrade){g.value=normalGrade;}
  g.disabled=c;g.title=c?'잠식된 요르문간드는 9.0 스탯으로 고정됩니다.':'';}
 document.querySelectorAll('[data-boss]').forEach(b=>b.onclick=()=>{if(v('boss')===b.dataset.boss)return;$('boss').value=b.dataset.boss;bossView();changed()});
 document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{
  document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-input-panel]').forEach(p=>p.hidden=p.dataset.inputPanel!==button.dataset.panel);
 });
 function changed(){dirty=true;save();if(!$('results').hidden)$('status').textContent='설정이 변경되었습니다. 아래 결과는 이전 조건입니다. 다시 계산해 주세요.';}
 $('config').addEventListener('change',e=>{if(e.target.closest('#picker'))return;changed()});
 ['col-hp','col-atk','col-def','penDamage','penDef'].forEach(id=>$(id).addEventListener('input',changed));

 /* ---------- board ---------- */
 const roleOf=pos=>pos<10?'front':PEN.includes(pos)?'pen':'dealer';
 const posLabel=pos=>pos<10?`앞 ${pos+1}`:`뒤 ${pos-9}`;
 const roleLabel={front:'앞라인',pen:'관통',dealer:'딜러'};
 const icon=d=>`<img src="./dragon/${d.id}/profile/8.png" alt="" loading="lazy" onerror="this.onerror=null;this.src='./dragon/${d.id}/adult.png'">`;
 function slotCell(pos,inner,extra=''){return `<button type="button" class="jp-slot ${roleOf(pos)}${extra}" data-pos="${pos}" aria-label="${posLabel(pos)} ${roleLabel[roleOf(pos)]}">${inner}</button>`;}
 function boardHTML(cell){return ['앞라인','뒷라인'].map((label,row)=>`<div class="jp-row"><span class="jp-row-label">${label}</span><div class="jp-cells">${Array.from({length:10},(_,i)=>cell(row*10+i)).join('')}</div></div>`).join('');}
 function renderBoard(){
  $('board').innerHTML=boardHTML(pos=>{const d=byId.get(slots[pos]);return slotCell(pos,d?`${icon(d)}<span>${esc(d.name)}</span>`:`<em>${posLabel(pos)}</em>`,(pos===selected?' on':'')+(d?'':' empty'));});
  $('placeCount').textContent=`${slots.filter(Boolean).length}/20`;
  $('pickTitle').textContent=`${posLabel(selected)} · ${roleLabel[roleOf(selected)]}${byId.get(slots[selected])?' · '+byId.get(slots[selected]).name:''}`;
 }
 $('board').onclick=e=>{const b=e.target.closest('[data-pos]');if(!b)return;selected=Number(b.dataset.pos);renderBoard();renderDragons();};
 $('clearSlot').onclick=()=>{slots[selected]=null;renderBoard();renderDragons();changed()};
 $('clearAll').onclick=()=>{slots=Array(20).fill(null);renderBoard();renderDragons();changed()};

 /* ---------- dragon picker ---------- */
 function loadDragons(){
  const src=window.DV1_DRAGONS;if(!src){$('dragons').innerHTML='<p class="muted">드래곤 목록을 불러오지 못했습니다.</p>';return}
  dragons=src.records.filter(r=>r.stages&&r.stages.advent&&r.type&&r.type!=='중립'&&D.types.includes(r.type+'형')).map(r=>({id:r.id,name:r.name.ko,aliases:(r.aliases&&r.aliases.ko)||[],type:r.type+'형',element:r.element}));
  byId=new Map(dragons.map(d=>[d.id,d]));
  slots=slots.map(id=>byId.has(id)?id:null);
  D.types.forEach(t=>$('dragonType').add(new Option(t,t)));
  [...new Set(dragons.map(d=>d.element))].forEach(e=>$('dragonElement').add(new Option(e,e)));
 }
 function renderDragons(){
  if(!dragons.length)return;const q=v('dragonSearch').trim(),t=v('dragonType'),el=v('dragonElement');
  const list=dragons.filter(d=>(!q||d.name.includes(q)||d.aliases.some(a=>a.includes(q)))&&(!t||d.type===t)&&(!el||d.element===el));
  $('dragons').innerHTML=list.map(d=>`<button type="button" data-dragon="${d.id}" aria-pressed="${slots[selected]===d.id}">${icon(d)}<span>${esc(d.name)}<small>${esc(d.type)} · ${esc(d.element)}</small></span></button>`).join('')||'<p class="muted">조건에 맞는 드래곤이 없습니다.</p>';
 }
 $('dragons').onclick=e=>{const b=e.target.closest('[data-dragon]');if(!b)return;slots[selected]=Number(b.dataset.dragon);
  // Move to the next empty slot to speed up filling.
  const next=[...Array(20).keys()].map(i=>(selected+1+i)%20).find(i=>!slots[i]);if(next!==undefined)selected=next;
  renderBoard();renderDragons();changed();};
 $('dragonSearch').oninput=renderDragons;$('dragonType').onchange=e=>{e.stopPropagation();renderDragons()};$('dragonElement').onchange=e=>{e.stopPropagation();renderDragons()};

 /* ---------- spirits ---------- */
 const optText=(o,i)=>o.stat&&o.stat!=='none'?`${names[o.stat]} ${o.type==='%'?Math.round(D.pct[i+1]*100)+'%':'+'+D.plus[o.stat][i+1]}`:'—';
 function renderEditor(){$('spiritEditor').innerHTML=SpiritInput.options(editing,'jpSpOpt',[],(i,k,t)=>!k||!t?'—':t==='%'?Math.round(D.pct[i]*100)+'%':'+'+D.plus[k][i])+SpiritInput.bonus(editing,'jpSpBonus',[]);}
 window.jpSpOpt=(i,field,value)=>{editing.opts[i][field]=value;renderEditor()};
 window.jpSpBonus=value=>{editing.bonus=value;renderEditor()};
 $('spPresets').onclick=e=>{const k=e.target.dataset.preset;if(!k)return;const p={last:['%','%','%','+'],all:['%','%','%','%'],'14':['+','%','%','+'],'24':['%','+','%','+']}[k];editing.opts.forEach((o,i)=>o.type=p[i]);renderEditor()};
 const spKey=s=>s.opts.map(o=>(o.stat||'none')+o.type).join(',')+'|'+(s.bonus||'none');
 $('addSpirit').onclick=()=>{
  const qty=Math.max(1,Math.min(20,Math.trunc(n('spiritQty'))||1));
  const s={opts:editing.opts.map(o=>({stat:o.stat||'none',type:o.type||'%'})),bonus:editing.bonus||'none',count:qty};
  if(s.opts.every(o=>o.stat==='none')&&s.bonus==='none'){$('status').textContent='옵션이 없는 정령은 추가하지 않습니다.';return}
  const same=spirits.find(x=>spKey(x)===spKey(s));if(same)same.count=Math.min(20,same.count+qty);else spirits.push(s);
  renderSpirits();changed();$('status').textContent='정령을 추가했습니다.';
 };
 function renderSpirits(){
  const total=spirits.reduce((a,s)=>a+s.count,0);$('spiritCount').textContent=total?`${total}개`:'';
  $('spiritList').innerHTML=spirits.map((s,i)=>`<div class="jp-spirit"><div class="jp-spirit-opts">${s.opts.map((o,j)=>`<span class="${o.stat}"><small>${j+1}옵</small>${optText(o,j)}</span>`).join('')}<span class="${s.bonus}"><small>부가</small>${names[s.bonus]||'없음'}</span></div><div class="jp-qty"><button type="button" data-sp="${i}" data-d="-1" aria-label="수량 줄이기">−</button><b>${s.count}</b><button type="button" data-sp="${i}" data-d="1" aria-label="수량 늘리기">+</button><button type="button" data-del="${i}">삭제</button></div></div>`).join('')||'<p class="muted">추가한 정령이 없습니다. 정령 없이도 계산할 수 있습니다.</p>';
 }
 $('spiritList').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.del!==undefined)spirits.splice(Number(b.dataset.del),1);
  else{const s=spirits[Number(b.dataset.sp)];s.count+=Number(b.dataset.d);if(s.count<1)spirits.splice(Number(b.dataset.sp),1);else s.count=Math.min(20,s.count);}
  renderSpirits();changed();};

 /* ---------- save ---------- */
 const SAVED=['boss','grade','gem','enchant','potion','col-hp','col-atk','col-def','penDamage','penDef','penLight'];
 function save(){if(restoring)return;try{localStorage.setItem(STORE,JSON.stringify({v:1,fields:Object.fromEntries(SAVED.map(id=>[id,id==='grade'&&$('grade').disabled&&normalGrade?normalGrade:v(id)])),slots,spirits}))}catch(_){}}
 function restore(){
  let s=null;try{s=JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){}
  restoring=true;
  if(s&&s.v===1){
   for(const id of SAVED){const val=s.fields?.[id];if(val==null)continue;const el=$(id);if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===val))continue;el.value=val;}
   if(Array.isArray(s.slots)&&s.slots.length===20)slots=s.slots.map(x=>Number.isInteger(x)?x:null);
   if(Array.isArray(s.spirits))spirits=s.spirits.filter(x=>x&&Array.isArray(x.opts)&&x.opts.length===4).map(x=>({opts:x.opts.map(o=>({stat:['hp','atk','def'].includes(o.stat)?o.stat:'none',type:o.type==='+'?'+':'%'})),bonus:['hp','atk','def'].includes(x.bonus)?x.bonus:'none',count:Math.max(1,Math.min(20,x.count|0))}));
  }
  bossView();gemHelp();restoring=false;
 }
 $('resetSaved').onclick=()=>{try{localStorage.removeItem(STORE)}catch(_){}location.reload()};

 /* ---------- run ---------- */
 function config(){
  const dmg=n('penDamage'),def=n('penDef');
  return {boss:v('boss'),grade:v('boss')==='corrupted'?'9.0':v('grade'),gem:v('gem'),enchant:v('enchant'),potion:n('potion'),collection:Object.fromEntries(['hp','atk','def'].map(k=>[k,n('col-'+k)])),
   pen:v('penDamage')!==''&&dmg>0?{damage:dmg,def:v('penDef')===''?0:def,light:v('penLight')==='1'}:null,hits:4,
   slots:slots.map(id=>{const d=byId.get(id);return d?{id:d.id,type:d.type,light:d.element==='빛',dark:d.element==='어둠'}:null}),spirits};
 }
 function finish(){worker?.terminate();worker=null;$('run').disabled=false;$('cancel').hidden=true;}
 $('cancel').onclick=()=>{finish();$('status').textContent='계산을 중단했습니다. 기존 결과는 유지됩니다.';};
 $('config').onsubmit=e=>{
  e.preventDefault();if(worker)return;const c=config();
  if(!c.slots.some(Boolean)){$('status').textContent='배치할 드래곤을 한 마리 이상 넣어 주세요.';return}
  if(c.pen&&v('penDef')===''){$('status').textContent='관통 피해를 받은 드래곤의 방어력을 입력해 주세요.';return}
  if(['hp','atk','def'].some(k=>!(c.collection[k]>=0))){$('status').textContent='컬렉션 수치를 확인해 주세요.';return}
  dirty=false;$('run').disabled=true;$('cancel').hidden=false;$('status').textContent='자리별 셋팅 계산 중…';
  try{worker=new Worker('./jorm-place-engine.js');}catch(error){finish();$('status').textContent='계산기를 시작하지 못했습니다. 웹 서버에서 페이지를 열어 주세요.';return}
  worker.onerror=()=>{finish();$('status').textContent='계산 파일을 불러오지 못했습니다.'};
  worker.onmessage=({data})=>{
   if(data.progress){$('status').textContent=`계산 중 ${Math.floor(data.progress.done/data.progress.total*100)}%`;return}
   finish();if(data.error){$('status').textContent=data.error;return}
   lastResult={result:data.result,config:c};renderResults();$('results').hidden=false;
   $('status').textContent='배치 계산 완료.'+(dirty?' 계산 중 설정이 변경되어 결과는 실행 당시 조건입니다.':'');
   $('results').scrollIntoView({behavior:'smooth',block:'start'});
  };
  worker.postMessage(c);
 };

 /* ---------- results ---------- */
 function penState(r,hits){if(!r||r.penHits==null)return {cls:'',text:''};if(r.penHits>=hits+1)return {cls:'ok2',text:`${hits+1}회 OK`};if(r.penHits>=hits)return {cls:'ok',text:`${hits}회 OK`};return {cls:'bad',text:`부족 · ${r.penHits}회`};}
 function metricOf(x,hits){const r=x.row;if(!r)return '—';if(x.role==='front')return fmt(Math.round(r.score));if(x.role==='pen'){const p=penState(r,hits);return p.cls==='bad'?'부족':p.text.replace(' OK','');}return fmt(Math.round(r.dealt));}
 function spiritHTML(s){if(!s)return '<b>정령 없음</b>';return `<div class="j-spirit-result">${s.opts.map((o,j)=>`<span class="${o.stat}"><small>${j+1}옵</small>${optText(o,j)}</span>`).join('')}</div><div class="${s.bonus}">부가옵 · ${names[s.bonus]||'없음'}</div>`;}
 function renderResults(){
  const {result,config:c}=lastResult,hits=c.hits,by=new Map(result.results.map(x=>[x.pos,x]));
  const pen=result.pen,s=result.summary;
  $('resultConditions').textContent=`${c.boss==='corrupted'?'잠식된 요르문간드':'요르문간드'} / ${c.grade} / 젬 ${D.gemNames[c.gem]} / ${c.potion?'물약 '+c.potion+'단계':'물약 미사용'} / ${pen?`관통 1회 ${fmt(c.pen.damage)} (방어 ${fmt(c.pen.def)} · ${c.pen.light?'빛':'빛 아님'}) 기준 ${hits}회`:'관통 미입력 · 관통 자리도 딜러 셋팅'}`;
  $('resultSummary').innerHTML=[
   pen?`<div class="${pen.passed===pen.total?'ok':'bad'}"><small>관통 ${hits}회 통과</small><strong>${pen.passed}/${pen.total}</strong></div>`:'',
   s.frontMin!=null?`<div><small>앞라인 최저 생존 점수</small><strong>${fmt(s.frontMin)}</strong></div>`:'',
   `<div><small>딜러 기대 피해 합</small><strong>${fmt(s.dealt)}</strong></div>`,
   `<div><small>정령 사용</small><strong>${s.spiritsUsed}/${s.spiritsOwned}</strong></div>`].join('');
  $('resultBoard').innerHTML=boardHTML(pos=>{const x=by.get(pos),d=x&&byId.get(x.dragon.id);if(!x)return slotCell(pos,`<em>${posLabel(pos)}</em>`,' empty');const ps=x.role==='pen'?penState(x.row,hits):null;
   return slotCell(pos,`${d?icon(d):''}<span class="jp-metric ${ps?ps.cls:''}">${esc(metricOf(x,hits))}</span>${x.spirit?'<i class="jp-sp-dot" title="정령 배정"></i>':''}`,'');});
  $('resultList').innerHTML=result.results.map(x=>{const r=x.row,d=byId.get(x.dragon.id);if(!r)return '';const ps=x.role==='pen'?penState(r,hits):null;
   const roleText=x.role==='front'?'앞라인 · 생존 점수':x.role==='pen'?'관통 자리 · 기대 피해':'딜러 · 기대 피해';
   return `<article class="j-result jp-card ${x.role}" id="jp-card-${x.pos}"><header><div class="j-rank-head"><span class="j-rank-badge">${posLabel(x.pos)}</span>${d?icon(d):''}<div><h3>${esc(d?d.name:x.dragon.type)}</h3><small>${esc(x.dragon.type)}${d?' · '+esc(d.element):''} · ${roleLabel[x.role]}</small></div></div><div class="j-metrics"><div class="primary"><small>${roleText}</small><strong>${fmt(x.role==='front'?r.score:r.dealt)}</strong></div>${ps?`<div class="jp-pen ${ps.cls}"><small>관통 1회 ${fmt(r.penHit)}</small><strong>${ps.text}</strong></div>`:''}</div></header>
   <div class="j-final-stats">${['hp','atk','def'].map(k=>`<div class="${k}"><small>${names[k]}</small><b>${fmt(r.stats[k])}</b></div>`).join('')}</div>
   <div class="j-gear"><div><small>정령</small>${spiritHTML(x.spirit)}</div>
   <div><small>장신구</small><b>${esc(D.accessories[r.acc].n)}</b><div>인챈트 · ${names[r.enchant]}${r.enchant==='none'?'':' +21%'}</div></div>
   <div><small>젬 배분</small>${['hp','atk','def'].map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.gems[k]}개</span>`).join('')}</div>
   <div><small>펜던트 · ${esc(r.pend.name)}</small>${['hp','atk','def'].filter(k=>r.pend[k]).map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.pend[k]}%</span>`).join('')||'미착용'}</div>
   <div><small>물약</small>${esc(r.potion.n)}</div>
   <div><small>${r.probability?.kind==='eva'?'회피율':'크리 확률'}</small>${r.probability?`<b class="prob">${fmt(r.probability.final)}%</b><span class="sub">기본 ${fmt(r.probability.base)}% + 장비 ${fmt(r.probability.gear)}%</span>`:'미적용'}</div></div></article>`;}).join('');
 }
 $('resultBoard').onclick=e=>{const b=e.target.closest('[data-pos]');if(!b)return;$('jp-card-'+b.dataset.pos)?.scrollIntoView({behavior:'smooth',block:'start'});};

 restore();loadDragons();renderEditor();renderSpirits();renderBoard();renderDragons();
})();
