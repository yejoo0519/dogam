(function(){
 'use strict';
 const D=JormData,$=id=>document.getElementById(id),names={hp:'체력',atk:'공격',def:'방어',none:'없음'};
 const STORE='jorm-place-settings-v1',PEN=[13,14,15,16];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const v=id=>$(id).value,n=id=>Number($(id).value);
 const fmt=x=>x===Number.MAX_VALUE||!Number.isFinite(x)?'피해 없음':x.toLocaleString('ko-KR',{maximumFractionDigits:1});
 let slots=Array(20).fill(null),spirits=[],units=[],selUnit=0,selected=0,worker=null,dirty=false,restoring=false,dragons=[],byId=new Map(),lastResult=null,resultPos=null;
 const blankSpirit=()=>({opts:[{stat:'hp',type:'%'},{stat:'atk',type:'%'},{stat:'def',type:'%'},{stat:'hp',type:'+'}],bonus:'hp'});
 let editing=blankSpirit();

 /* ---------- basic fields ---------- */
 Object.keys(D.gems).sort((a,b)=>D.gemNames[b]-D.gemNames[a]).forEach(k=>$('gem').add(new Option(String(D.gemNames[k]),k)));
 const gemHelp=()=>{const g=D.gems[v('gem')];$('gemNote').textContent=`체력 +${g.hp} / 공격 +${g.atk} / 방어 +${g.def}`;};
 $('gem').addEventListener('change',gemHelp);
 // 보유 젬: 스탯별 38·40·42·44젬 갯수 (저장 키는 jorm-data의 젬 키). 모자라면 36젬.
 const STOCK_KEYS=Object.keys(D.gems).filter(k=>D.gemNames[k]>36).sort((a,b)=>D.gemNames[b]-D.gemNames[a]),FALLBACK_GEM='36';
 let gemStock={hp:{},atk:{},def:{}};
 function renderGemGrid(){$('gemGrid').innerHTML=`<span></span>${['hp','atk','def'].map(k=>`<b class="${k}">${names[k]}</b>`).join('')}`+STOCK_KEYS.map(g=>`<span>${D.gemNames[g]}젬</span>${['hp','atk','def'].map(k=>`<input type="number" min="0" max="100" inputmode="numeric" data-gs="${k}" data-g="${g}" value="${gemStock[k][g]||0}" aria-label="${names[k]} ${D.gemNames[g]}젬 갯수">`).join('')}`).join('');}
 $('gemGrid').addEventListener('input',e=>{const el=e.target;if(!el.dataset.gs)return;gemStock[el.dataset.gs][el.dataset.g]=Math.max(0,Math.min(100,Math.trunc(Number(el.value))||0));changed();});
 function gemModeView(){const stock=v('gemMode')==='stock';$('gemStock').hidden=!stock;$('gemSame').hidden=stock;}
 $('gemMode').addEventListener('change',gemModeView);
 Object.keys(D.potions).map(Number).sort((a,b)=>a-b).forEach(k=>$('potion').add(new Option(k+'단계',String(k))));
 $('potion').value=String(Math.max(...Object.keys(D.potions).map(Number)));
 let normalGrade=null;
 function bossView(){const c=v('boss')==='corrupted',g=$('grade');
  document.querySelectorAll('[data-boss]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.boss===v('boss'))));
  if(c&&!g.disabled){normalGrade=g.value;g.value='9.0';}else if(!c&&g.disabled&&normalGrade){g.value=normalGrade;}
  g.disabled=c;g.title=c?'잠식된 요르문간드는 9.0 스탯으로 고정됩니다.':'';
  const tab=document.querySelector('[data-panel=pen]');tab.hidden=!c;document.querySelector('.jp-legend .pen').hidden=!c;
  if(!c&&tab.getAttribute('aria-pressed')==='true')document.querySelector('[data-panel=place]').click();
  if(document.getElementById('board').children.length)renderBoard();}
 document.querySelectorAll('[data-boss]').forEach(b=>b.onclick=()=>{if(v('boss')===b.dataset.boss)return;$('boss').value=b.dataset.boss;bossView();changed()});
 document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{
  document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-input-panel]').forEach(p=>p.hidden=p.dataset.inputPanel!==button.dataset.panel);
 });
 const equipMode=()=>v('mode')==='equip';
 const emptySpirit=()=>({opts:[{stat:'',type:'%'},{stat:'',type:'%'},{stat:'',type:'%'},{stat:'',type:'+'}],bonus:''});
 function modeView(){const eq=equipMode();
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===v('mode'))));
  $('freeBoard').hidden=eq;$('equipList').hidden=!eq;
  const tab=document.querySelector('[data-panel=spirit]');tab.hidden=eq;if(eq&&tab.getAttribute('aria-pressed')==='true')document.querySelector('[data-panel=place]').click();
  $('placeTitle').textContent=eq?'보유 드래곤 (정령 귀속)':'배치';
  $('placeHelp').textContent=eq?'아래 목록에서 드래곤을 눌러 추가하고, 추가한 드래곤을 눌러 귀속된 정령을 입력하세요. 자리는 계산기가 정합니다. (최대 20마리)':'칸을 누른 뒤 아래 목록에서 드래곤을 고르세요. 타입과 속성은 도감 정보를 따릅니다.';
  $('clearSlot').textContent=eq?'선택한 드래곤 빼기':'이 칸 비우기';
  if(dragons.length){renderBoard();renderUnits();renderDragons();}}
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(v('mode')===b.dataset.mode)return;$('mode').value=b.dataset.mode;modeView();changed()});
 function penModeView(){const on=v('penMode')==='input';$('penInputs').hidden=!on;$('penSampleNote').hidden=on;}
 $('penMode').addEventListener('change',penModeView);
 function changed(){dirty=true;save();if(!$('results').hidden)$('status').textContent='설정이 변경되었습니다. 아래 결과는 이전 조건입니다. 다시 계산해 주세요.';}
 $('config').addEventListener('change',e=>{if(e.target.closest('#picker'))return;changed()});
 ['col-hp','col-atk','col-def','penDamage','penDef'].forEach(id=>$(id).addEventListener('input',changed));

 /* ---------- board ---------- */
 // 관통 자리는 잠식된 요르문간드에서만 사용합니다.
 const penOn=()=>v('boss')==='corrupted';
 const roleOf=pos=>pos<10?'front':penOn()&&PEN.includes(pos)?'pen':'dealer';
 const posLabel=pos=>pos<10?`앞 ${pos+1}`:`뒤 ${pos-9}`;
 const roleLabel={front:'앞라인',pen:'관통',dealer:'딜러'};
 const icon=d=>`<img src="./dragon/${d.id}/profile/8.png" alt="" loading="lazy" onerror="this.onerror=null;this.src='./dragon/${d.id}/adult.png'">`;
 function slotCell(pos,inner,extra='',role=roleOf(pos)){return `<button type="button" class="jp-slot ${role}${extra}" data-pos="${pos}" aria-label="${posLabel(pos)} ${roleLabel[role]}">${inner}</button>`;}
 function boardHTML(cell){return ['앞라인','뒷라인'].map((label,row)=>`<div class="jp-row"><span class="jp-row-label">${label}</span><div class="jp-cells">${Array.from({length:10},(_,i)=>cell(row*10+i)).join('')}</div></div>`).join('');}
 function renderBoard(){
  $('board').innerHTML=boardHTML(pos=>{const d=byId.get(slots[pos]);return slotCell(pos,d?`${icon(d)}<span>${esc(d.name)}</span>`:`<em>${posLabel(pos)}</em>`,(pos===selected?' on':'')+(d?'':' empty'));});
  if(equipMode()){const u=units[selUnit],d=u&&byId.get(u.id);$('placeCount').textContent=`${units.length}/20`;$('pickTitle').textContent=d?`선택: ${d.name}`:'드래곤을 눌러 추가';return;}
  $('placeCount').textContent=`${slots.filter(Boolean).length}/20`;
  $('pickTitle').textContent=`${posLabel(selected)} · ${roleLabel[roleOf(selected)]}${byId.get(slots[selected])?' · '+byId.get(slots[selected]).name:''}`;
 }
 $('board').onclick=e=>{const b=e.target.closest('[data-pos]');if(!b)return;selected=Number(b.dataset.pos);renderBoard();renderDragons();};
 $('clearSlot').onclick=()=>{if(equipMode()){units.splice(selUnit,1);selUnit=Math.max(0,Math.min(selUnit,units.length-1));renderUnits();}else slots[selected]=null;renderBoard();renderDragons();changed()};
 $('clearAll').onclick=()=>{if(equipMode()){units=[];selUnit=0;renderUnits();}else slots=Array(20).fill(null);renderBoard();renderDragons();changed()};

 /* ---------- dragon picker ---------- */
 function loadDragons(){
  const src=window.DV1_DRAGONS;if(!src){$('dragons').innerHTML='<p class="muted">드래곤 목록을 불러오지 못했습니다.</p>';return}
  dragons=src.records.filter(r=>r.stages&&r.stages.advent&&r.type&&r.type!=='중립'&&D.types.includes(r.type+'형')).map(r=>({id:r.id,name:r.name.ko,aliases:(r.aliases&&r.aliases.ko)||[],type:r.type+'형',element:r.element}));
  byId=new Map(dragons.map(d=>[d.id,d]));
  slots=slots.map(id=>byId.has(id)?id:null);units=units.filter(u=>byId.has(u.id));
  D.types.forEach(t=>$('dragonType').add(new Option(t,t)));
  [...new Set(dragons.map(d=>d.element))].forEach(e=>$('dragonElement').add(new Option(e,e)));
 }
 function renderDragons(){
  if(!dragons.length)return;const q=v('dragonSearch').trim(),t=v('dragonType'),el=v('dragonElement');
  const list=dragons.filter(d=>(!q||d.name.includes(q)||d.aliases.some(a=>a.includes(q)))&&(!t||d.type===t)&&(!el||d.element===el));
  $('dragons').innerHTML=list.map(d=>`<button type="button" data-dragon="${d.id}" aria-pressed="${equipMode()?units.some(u=>u.id===d.id):slots[selected]===d.id}">${icon(d)}<span>${esc(d.name)}<small>${esc(d.type)} · ${esc(d.element)}</small></span></button>`).join('')||'<p class="muted">조건에 맞는 드래곤이 없습니다.</p>';
 }
 $('dragons').onclick=e=>{const b=e.target.closest('[data-dragon]');if(!b)return;
  if(equipMode()){if(units.length>=20){$('status').textContent='드래곤은 최대 20마리까지 넣을 수 있습니다.';return}
   units.push({id:Number(b.dataset.dragon),spirit:emptySpirit()});selUnit=units.length-1;renderUnits();renderBoard();renderDragons();changed();return;}
  slots[selected]=Number(b.dataset.dragon);
  // Move to the next empty slot to speed up filling.
  const next=[...Array(20).keys()].map(i=>(selected+1+i)%20).find(i=>!slots[i]);if(next!==undefined)selected=next;
  renderBoard();renderDragons();changed();};
 $('dragonSearch').oninput=renderDragons;$('dragonType').onchange=e=>{e.stopPropagation();renderDragons()};$('dragonElement').onchange=e=>{e.stopPropagation();renderDragons()};

 /* ---------- equipped units ---------- */
 const spSummary=s=>{const o=(s.opts||[]).filter(x=>x.stat&&x.stat!=='none');return o.length?o.map(x=>`<i class="sp-${x.stat}">${names[x.stat][0]}${x.type==='%'?'%':'+'}</i>`).join(' ')+(s.bonus&&s.bonus!=='none'?` · 부가 <i class="sp-${s.bonus}">${names[s.bonus][0]}</i>`:''):'정령 없음';};
 function renderUnits(){
  $('units').innerHTML=units.map((u,i)=>{const d=byId.get(u.id);return d?`<button type="button" class="jp-unit" data-unit="${i}" aria-pressed="${i===selUnit}">${icon(d)}<span><b>${esc(d.name)}</b><small>${esc(d.type)} · ${esc(d.element)}</small><small class="jp-unit-sp">${spSummary(u.spirit)}</small></span></button>`:'';}).join('')||'<p class="muted">아직 추가한 드래곤이 없습니다.</p>';
  const u=units[selUnit],d=u&&byId.get(u.id);
  $('unitEditor').innerHTML=d?`<h3>${esc(d.name)} · 귀속 정령</h3><div class="toolbar" id="unitPresets"><button type="button" data-up="last">막플</button><button type="button" data-up="all">올퍼</button><button type="button" data-up="14">14플</button><button type="button" data-up="24">24플</button><button type="button" data-up="none">정령 없음</button></div>`+SpiritInput.options(u.spirit,'jpUnitOpt',[],(i,k,t)=>!k||!t?'—':t==='%'?Math.round(D.pct[i]*100)+'%':'+'+D.plus[k][i])+SpiritInput.bonus(u.spirit,'jpUnitBonus',[]):'';
 }
 window.jpUnitOpt=(i,field,value)=>{const u=units[selUnit];if(!u)return;u.spirit.opts[i][field]=value;renderUnits();changed()};
 window.jpUnitBonus=value=>{const u=units[selUnit];if(!u)return;u.spirit.bonus=value;renderUnits();changed()};
 $('units').onclick=e=>{const b=e.target.closest('[data-unit]');if(!b)return;selUnit=Number(b.dataset.unit);renderUnits();renderBoard();};
 $('unitEditor').addEventListener('click',e=>{const k=e.target.dataset&&e.target.dataset.up;if(!k)return;const u=units[selUnit];if(!u)return;
  if(k==='none')u.spirit=emptySpirit();else{const p={last:['%','%','%','+'],all:['%','%','%','%'],'14':['+','%','%','+'],'24':['%','+','%','+']}[k];u.spirit.opts.forEach((o,i)=>o.type=p[i]);}
  renderUnits();changed();});

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

 /* ---------- pendants ---------- */
 let pendItems=[],editPend={name:'태양',options:[]};
 const PSLOTS={태양:3,달:2,별:1};
 function resetEditPend(){const n=PSLOTS[v('pendType')]||3;editPend={name:v('pendType'),options:Array.from({length:n},(_,i)=>editPend.options[i]||{stat:'hp',val:6})};}
 function renderPendEditor(){resetEditPend();$('pendOptEditor').innerHTML=editPend.options.map((o,i)=>`<label>${i+1}옵<select data-po="${i}" data-f="stat">${['hp','atk','def'].map(k=>`<option value="${k}"${o.stat===k?' selected':''}>${names[k]}</option>`).join('')}</select></label><label>수치<select data-po="${i}" data-f="val">${[6,5,4,3,2,1].map(x=>`<option value="${x}"${o.val===x?' selected':''}>${x}%</option>`).join('')}</select></label>`).join('');}
 $('pendType').addEventListener('change',e=>{e.stopPropagation();renderPendEditor();});
 $('pendOptEditor').addEventListener('change',e=>{e.stopPropagation();const el=e.target;if(el.dataset.po===undefined)return;const o=editPend.options[Number(el.dataset.po)];o[el.dataset.f]=el.dataset.f==='val'?Number(el.value):el.value;});
 const pendSum=p=>{const t={hp:0,atk:0,def:0};p.options.forEach(o=>t[o.stat]+=o.val);return t;};
 const pendKey=p=>{const t=pendSum(p);return p.name+':'+t.hp+','+t.atk+','+t.def;};
 const pendChips=p=>{const t=pendSum(p);return ['hp','atk','def'].filter(k=>t[k]).map(k=>`<span class="${k}">${names[k]} ${t[k]}%</span>`).join('');};
 $('addPend').onclick=()=>{const qty=Math.max(1,Math.min(99,Math.trunc(n('pendQty'))||1));const p={name:editPend.name,options:editPend.options.map(o=>({...o})),count:qty};
  const same=pendItems.find(x=>pendKey(x)===pendKey(p));if(same)same.count=Math.min(99,same.count+qty);else pendItems.push(p);renderPendList();changed();$('status').textContent='펜던트를 추가했습니다.';};
 function renderPendList(){$('pendList').innerHTML=pendItems.map((p,i)=>`<div class="jp-spirit"><div class="jp-spirit-opts"><span><small>종류</small>${esc(p.name)}</span>${pendChips(p)}</div><div class="jp-qty"><button type="button" data-pi="${i}" data-d="-1" aria-label="수량 줄이기">−</button><b>${p.count}</b><button type="button" data-pi="${i}" data-d="1" aria-label="수량 늘리기">+</button><button type="button" data-pdel="${i}">삭제</button></div></div>`).join('')||'<p class="muted">추가한 펜던트가 없습니다. 펜던트 없이도 계산할 수 있습니다.</p>';pendCountView();}
 $('pendList').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.pdel!==undefined)pendItems.splice(Number(b.dataset.pdel),1);
  else{const p=pendItems[Number(b.dataset.pi)];p.count+=Number(b.dataset.d);if(p.count<1)pendItems.splice(Number(b.dataset.pi),1);else p.count=Math.min(99,p.count);}
  renderPendList();changed();};
 function pendCountView(){const t=pendItems.reduce((a,p)=>a+p.count,0);$('pendCount').textContent=t?`${t}개`:'';}

 /* ---------- save ---------- */
 const SAVED=['boss','mode','penMode','grade','gemMode','gem','enchant','potion','col-hp','col-atk','col-def','penDamage','penDef','penLight'];
 function save(){if(restoring)return;try{localStorage.setItem(STORE,JSON.stringify({v:1,fields:Object.fromEntries(SAVED.map(id=>[id,id==='grade'&&$('grade').disabled&&normalGrade?normalGrade:v(id)])),slots,spirits,units,gemStock,pendItems}))}catch(_){}globalThis.CalcCloud?.push(STORE);}
 function restore(){
  let s=null;try{s=JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){}
  restoring=true;
  if(s&&s.v===1){
   for(const id of SAVED){const val=s.fields?.[id];if(val==null)continue;const el=$(id);if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===val))continue;el.value=val;}
   if(Array.isArray(s.slots)&&s.slots.length===20)slots=s.slots.map(x=>Number.isInteger(x)?x:null);
   if(Array.isArray(s.spirits))spirits=s.spirits.filter(x=>x&&Array.isArray(x.opts)&&x.opts.length===4).map(x=>({opts:x.opts.map(o=>({stat:['hp','atk','def'].includes(o.stat)?o.stat:'none',type:o.type==='+'?'+':'%'})),bonus:['hp','atk','def'].includes(x.bonus)?x.bonus:'none',count:Math.max(1,Math.min(20,x.count|0))}));
   const okSt=x=>['hp','atk','def'].includes(x)?x:'';
   if(Array.isArray(s.units))units=s.units.filter(u=>u&&Number.isInteger(u.id)).slice(0,20).map(u=>({id:u.id,spirit:{opts:[0,1,2,3].map(i=>({stat:okSt(u.spirit?.opts?.[i]?.stat),type:u.spirit?.opts?.[i]?.type==='+'?'+':'%'})),bonus:okSt(u.spirit?.bonus)}}));
   if(Array.isArray(s.pendItems))pendItems=s.pendItems.filter(p=>p&&PSLOTS[p.name]&&Array.isArray(p.options)&&p.options.length===PSLOTS[p.name]).map(p=>({name:p.name,options:p.options.map(o=>({stat:['hp','atk','def'].includes(o.stat)?o.stat:'hp',val:Math.max(1,Math.min(6,Math.trunc(Number(o.val))||6))})),count:Math.max(1,Math.min(99,p.count|0))}));
   if(s.gemStock)for(const k of ['hp','atk','def'])for(const g of STOCK_KEYS){const n=Math.trunc(Number(s.gemStock[k]?.[g]));if(n>0)gemStock[k][g]=Math.min(100,n);}
  }
  if(s&&s.v===1&&s.fields&&s.fields.penMode==null&&Number(s.fields.penDamage)>0)$('penMode').value='input';
  // 일반 요르문간드는 현재 선택할 수 없습니다(코드는 유지). 잠식된 요르문간드로 고정.
  $('boss').value='corrupted';
  bossView();gemHelp();gemModeView();renderGemGrid();penModeView();renderPendEditor();renderPendList();restoring=false;
 }
 $('resetSaved').onclick=async()=>{try{localStorage.removeItem(STORE)}catch(_){}await globalThis.CalcCloud?.clear(STORE);location.reload()};

 /* ---------- run ---------- */
 function config(){
  const dmg=n('penDamage'),def=n('penDef');
  return {boss:v('boss'),grade:v('boss')==='corrupted'?'9.0':v('grade'),gem:v('gemMode')==='stock'?FALLBACK_GEM:v('gem'),gemStock:v('gemMode')==='stock'?gemStock:null,enchant:v('enchant'),potion:n('potion'),collection:Object.fromEntries(['hp','atk','def'].map(k=>[k,n('col-'+k)])),
   pen:!penOn()?null:v('penMode')==='input'?{damage:dmg,def,light:v('penLight')==='1'}:{reference:true},hits:4,mode:v('mode'),
   units:units.map(u=>{const d=byId.get(u.id);return d?{dragon:{id:d.id,type:d.type,light:d.element==='빛',dark:d.element==='어둠'},spirit:u.spirit}:null}).filter(Boolean),
   slots:slots.map(id=>{const d=byId.get(id);return d?{id:d.id,type:d.type,light:d.element==='빛',dark:d.element==='어둠'}:null}),spirits,
   pendants:pendItems.length?{mode:'list',items:pendItems}:null};
 }
 function finish(){worker?.terminate();worker=null;$('run').disabled=false;$('cancel').hidden=true;}
 $('cancel').onclick=()=>{finish();$('status').textContent='계산을 중단했습니다. 기존 결과는 유지됩니다.';};
 $('config').onsubmit=e=>{
  e.preventDefault();if(worker)return;const c=config();
  if(c.mode==='equip'?!c.units.length:!c.slots.some(Boolean)){$('status').textContent='배치할 드래곤을 한 마리 이상 넣어 주세요.';return}
  if(c.pen&&!c.pen.reference){
   const bad=msg=>{document.querySelector('[data-panel=pen]').click();$('status').textContent=msg;};
   if(v('penDamage')===''||!(c.pen.damage>0)||!Number.isInteger(c.pen.damage))return bad('관통 1회 피해량을 1 이상의 정수로 입력해 주세요.');
   if(v('penDef')===''||!(c.pen.def>=0)||!Number.isInteger(c.pen.def))return bad('관통 피해를 받은 드래곤의 방어력을 0 이상의 정수로 입력해 주세요.');
   if(c.pen.def>5000||c.pen.damage>100000)return bad('관통 피해량·방어력 값을 확인해 주세요.');
  }
  if(['hp','atk','def'].some(k=>!(c.collection[k]>=0))){$('status').textContent='컬렉션 수치를 확인해 주세요.';return}
  dirty=false;$('run').disabled=true;$('cancel').hidden=false;$('status').textContent='자리별 셋팅 계산 중…';
  try{worker=new Worker('./jorm-place-engine.js');}catch(error){finish();$('status').textContent='계산기를 시작하지 못했습니다. 웹 서버에서 페이지를 열어 주세요.';return}
  worker.onerror=()=>{finish();$('status').textContent='계산 파일을 불러오지 못했습니다.'};
  worker.onmessage=({data})=>{
   if(data.progress){$('status').textContent=`계산 중 ${Math.min(99,Math.floor(data.progress.done/data.progress.total*100))}%`;return}
   finish();if(data.error){$('status').textContent=data.error;return}
   lastResult={result:data.result,config:c};resultPos=null;renderResults();$('results').hidden=false;
   $('status').textContent='배치 계산 완료.'+(dirty?' 계산 중 설정이 변경되어 결과는 실행 당시 조건입니다.':'');
   $('results').scrollIntoView({behavior:'smooth',block:'start'});
  };
  worker.postMessage(c);
 };

 /* ---------- results ---------- */
 function penState(r,hits,pen){if(!r||r.penHits==null)return {cls:'',text:'',short:''};
  if(r.penHits>=hits+1)return {cls:'ok2',text:`${hits+1}회 OK`,short:`${hits+1}회`};if(r.penHits>=hits)return {cls:'ok',text:`${hits}회 OK`,short:`${hits}회`};return {cls:'bad',text:`부족 · ${r.penHits}회`,short:'부족'};}
 function metricOf(x,hits,pen){const r=x.row;if(!r)return '—';if(x.role==='front')return fmt(Math.round(r.score));if(x.role==='pen')return penState(r,hits,pen).short;return fmt(Math.round(r.dealt));}
 function spiritHTML(s){if(!s)return '<b>정령 없음</b>';return `<div class="j-spirit-result">${s.opts.map((o,j)=>`<span class="${o.stat}"><small>${j+1}옵</small>${optText(o,j)}</span>`).join('')}</div><div class="${s.bonus}">부가옵 · ${names[s.bonus]||'없음'}</div>`;}
 const gemText=list=>{const m=new Map();list.forEach(g=>m.set(g,(m.get(g)||0)+1));return [...m].map(([g,n])=>`${D.gemNames[g]}×${n}`).join(' ');};
 function renderResults(){
  const {result,config:c}=lastResult,hits=c.hits,by=new Map(result.results.map(x=>[x.pos,x]));
  const pen=result.pen,s=result.summary;
  if(!by.has(resultPos))resultPos=result.results[0]?.pos;
  $('resultConditions').textContent=`${c.mode==='equip'?'정령 귀속 상태 · 자리 배치':'정령 해제 상태 (귀속X) · 정령 배분'} / ${c.boss==='corrupted'?'잠식된 요르문간드':'요르문간드'} / ${c.grade} / ${c.gemStock?'보유 젬 (부족분 36젬)':'젬 '+D.gemNames[c.gem]} / ${c.pendants?'보유 펜던트':'펜던트 제한 없음'} / 물약 ${c.potion}단계 / ${pen&&pen.reference?`관통 실측값 (1회 = 121000 ÷ (방어 × 방어계수 + 22)) 기준 ${hits}회`:pen?`관통 1회 ${fmt(c.pen.damage)} (방어 ${fmt(c.pen.def)} · ${c.pen.light?'빛':'빛 아님'}) 기준 ${hits}회`:c.boss==='corrupted'?'관통 미입력 · 관통 자리도 딜러 셋팅':'뒷라인 전체 딜러 셋팅'}`;
  $('resultSummary').innerHTML=[
   pen?`<div class="${pen.passed===pen.total?'ok':'bad'}"><small>관통 ${hits}회 통과</small><strong>${pen.passed}/${pen.total}</strong></div>`:'',
   result.mode==='equip'?`<div><small>배치한 드래곤</small><strong>${result.results.length}마리</strong></div>`:`<div><small>정령 사용</small><strong>${s.spiritsUsed}/${s.spiritsOwned}</strong></div>`,
   s.pendantsOwned!=null?`<div><small>펜던트 사용</small><strong>${s.pendantsUsed}/${s.pendantsOwned}</strong></div>`:''].join('');
  $('resultBoard').innerHTML=boardHTML(pos=>{const x=by.get(pos),d=x&&byId.get(x.dragon.id);if(!x)return slotCell(pos,`<em>${posLabel(pos)}</em>`,' empty',pos<10?'front':c.boss==='corrupted'&&PEN.includes(pos)?'pen':'dealer');const ps=x.role==='pen'?penState(x.row,hits,pen):null;
   return slotCell(pos,`${d?icon(d):''}<span class="jp-metric ${ps?ps.cls:''}">${esc(metricOf(x,hits,pen))}</span>${x.spirit?'<i class="jp-sp-dot" title="정령 배정"></i>':''}`,x.pos===resultPos?' on':'',x.role);});
  $('resultList').innerHTML=result.results.filter(x=>x.pos===resultPos).map(x=>{const r=x.row,d=byId.get(x.dragon.id);if(!r)return '';const ps=x.role==='pen'?penState(r,hits,pen):null;
   const roleText=x.role==='front'?'앞라인 · 생존 점수':x.role==='pen'?'관통 자리 · 기대 피해':'딜러 · 기대 피해';
   return `<article class="j-result jp-card ${x.role}" id="jp-card-${x.pos}"><header><div class="j-rank-head"><span class="j-rank-badge">${posLabel(x.pos)}</span>${d?icon(d):''}<div><h3>${esc(d?d.name:x.dragon.type)}</h3><small>${esc(x.dragon.type)}${d?' · '+esc(d.element):''} · ${roleLabel[x.role]}</small></div></div><div class="j-metrics"><div class="primary"><small>${roleText}</small><strong>${fmt(x.role==='front'?r.score:r.dealt)}</strong></div>${ps?`<div class="jp-pen ${ps.cls}"><small>관통 1회 ${fmt(r.penHit)}</small><strong>${ps.text}</strong></div>`:''}</div></header>
   <div class="j-final-stats">${['hp','atk','def'].map(k=>`<div class="${k}"><small>${names[k]}</small><b>${fmt(r.stats[k])}</b></div>`).join('')}</div>
   <div class="j-gear"><div><small>정령</small>${spiritHTML(x.spirit)}</div>
   <div><small>장신구</small><b>${esc(D.accessories[r.acc].n)}</b><div>인챈트 · ${names[r.enchant]}${r.enchant==='none'?'':' +21%'}</div></div>
   <div><small>젬 배분</small>${['hp','atk','def'].map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.gems[k]}개${r.gemLv&&r.gems[k]?' · '+gemText(r.gemLv[k]):''}</span>`).join('')}</div>
   <div><small>펜던트${r.pend.name==='미착용'?'':' · '+esc(r.pend.name)}</small>${['hp','atk','def'].filter(k=>r.pend[k]).map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.pend[k]}%</span>`).join('')||'미착용'}</div>
   <div><small>물약</small>${esc(r.potion.n)}</div>
   <div><small>${r.probability?.kind==='eva'?'회피율':'크리 확률'}</small>${r.probability?`<b class="prob">${fmt(r.probability.final)}%</b><span class="sub">기본 ${fmt(r.probability.base)}% + 장비 ${fmt(r.probability.gear)}%</span>`:'미적용'}</div></div></article>`;}).join('');
 }
 // 결과 배치판에서 누른 칸의 셋팅을 아래에 표시합니다.
 $('resultBoard').onclick=e=>{const b=e.target.closest('[data-pos]');if(!b||b.classList.contains('empty'))return;resultPos=Number(b.dataset.pos);renderResults();};

 restore();loadDragons();renderEditor();renderSpirits();modeView();renderBoard();renderUnits();renderDragons();
 globalThis.CalcCloud?.start(STORE);
})();
