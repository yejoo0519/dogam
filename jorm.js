(function(){
 'use strict';
 const D=JormData,$=id=>document.getElementById(id),names={hp:'체력',atk:'공격',def:'방어',none:'없음'},chosen=new Set();
 const STORE='jorm-settings-v1';
 let pendants=[{name:'미착용',options:[]}],worker=null,dirty=false,restoring=false;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=id=>Number($(id).value),v=id=>$(id).value,fmt=n=>n===Number.MAX_VALUE||!Number.isFinite(n)?'피해 없음':n.toLocaleString('ko-KR',{maximumFractionDigits:1});
 function changed(){dirty=true;save();if(!$('results').hidden)$('status').textContent='설정이 변경되었습니다. 아래 결과는 이전 조건입니다. 다시 계산해 주세요.';}
 D.types.forEach(t=>$('type').add(new Option(t,t)));
 Object.keys(D.gems).sort((a,b)=>D.gemNames[b]-D.gemNames[a]).forEach(k=>$('gem').add(new Option(String(D.gemNames[k]),k)));
 const gemHelp=()=>{const g=D.gems[v('gem')];$('gemNote').textContent=`체력 +${g.hp} / 공격 +${g.atk} / 방어 +${g.def}`;};
 $('gem').addEventListener('change',gemHelp);
 Object.keys(D.potions).map(Number).sort((a,b)=>b-a).forEach(k=>$('potion').add(new Option(k+'단계',String(k)),1));
 $('potion').value=String(Math.max(...Object.keys(D.potions).map(Number)));
 const accLevel=a=>{const m=a.n.match(/\+\s?(\d+)/);return m?m[1]:'';};
 [...new Set(D.accessories.map(accLevel).filter(Boolean))].sort((a,b)=>b-a).forEach(l=>$('accLevel').add(new Option('+'+l,l)));
 const spirit={opts:[{stat:'hp',type:'%'},{stat:'atk',type:'%'},{stat:'def',type:'%'},{stat:'hp',type:'+'}],bonus:'hp'};
 function renderSpirit(){
  $('spirits').innerHTML=SpiritInput.options(spirit,'jormSpOpt',[],(i,k,t)=>!k||!t?'—':t==='%'?Math.round(D.pct[i]*100)+'%':'+'+D.plus[k][i])+SpiritInput.bonus(spirit,'jormSpBonus',[]);
 }
 window.jormSpOpt=(i,field,value)=>{spirit.opts[i][field]=value;renderSpirit();changed()};
 window.jormSpBonus=value=>{spirit.bonus=value;renderSpirit();changed()};
 $('spPresets').onclick=e=>{const k=e.target.dataset.preset;if(!k)return;const patterns={last:['%','%','%','+'],all:['%','%','%','%'],'14':['+','%','%','+'],'24':['%','+','%','+']};spirit.opts.forEach((o,i)=>o.type=patterns[k][i]);renderSpirit();changed()};
 function modeView(kind){const manual=v(kind+'Mode')==='manual';$(kind+'Manual').hidden=!manual;$(kind+'AutoNote').hidden=manual;}
 for(const kind of ['accessory','pendant','spirit'])$(kind+'Mode').onchange=()=>{modeView(kind);changed()};
 document.querySelectorAll('[data-panel]').forEach(button=>button.onclick=()=>{
  document.querySelectorAll('[data-panel]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-input-panel]').forEach(p=>p.hidden=p.dataset.inputPanel!==button.dataset.panel);
 });
 renderSpirit();
 const pctText=a=>[...['hp','atk','def'].filter(k=>a[k]).map(k=>`<span class="${k}">${names[k]} ${Math.round(a[k]*100)}%</span>`),...(a.crit?[`<span class="prob">크리 ${a.crit}%</span>`]:[]),...(a.eva?[`<span class="prob">회피 ${a.eva}%</span>`]:[])].join(' · ')||'—';
 function visible(){return D.accessories.map((a,i)=>({a,i})).filter(({a})=>a.n.includes(v('accSearch'))&&(!v('accLevel')||accLevel(a)===v('accLevel')));}
 function syncAcc(){
  $('accCount').textContent=`${chosen.size}개 선택`;
  $('accessories').querySelectorAll('[data-acc]').forEach(el=>{el.checked=chosen.has(Number(el.dataset.acc))});
  const chips=$('selectedAcc');
  chips.querySelectorAll('[data-remove]').forEach(el=>{if(!chosen.has(Number(el.dataset.remove)))el.remove()});
  for(const i of chosen){if(chips.querySelector(`[data-remove="${i}"]`))continue;const b=document.createElement('button');b.type='button';b.dataset.remove=i;b.textContent=D.accessories[i].n+' ×';b.setAttribute('aria-label',D.accessories[i].n+' 제거');chips.append(b);}
 }
 function renderAcc(){
  if(!$('accessories').children.length)$('accessories').innerHTML=D.accessories.map((a,i)=>`<label class="acc-item" data-item="${i}"><input type="checkbox" data-acc="${i}">${a.img?`<img src="${esc(a.img)}" alt="" loading="lazy">`:''}<span>${esc(a.n)}<small>${pctText(a)}</small></span></label>`).join('');
  const shown=new Set(visible().map(({i})=>i));
  $('accessories').querySelectorAll('[data-item]').forEach(el=>{el.hidden=!shown.has(Number(el.dataset.item))});syncAcc();
 }
 $('accessories').onchange=e=>{if(e.target.dataset.acc===undefined)return;e.stopPropagation();const id=Number(e.target.dataset.acc);e.target.checked?chosen.add(id):chosen.delete(id);syncAcc();changed()};
 $('selectedAcc').onclick=e=>{if(e.target.dataset.remove===undefined)return;chosen.delete(Number(e.target.dataset.remove));syncAcc();changed()};
 $('accSearch').oninput=e=>{e.stopPropagation();renderAcc()};$('accLevel').onchange=e=>{e.stopPropagation();renderAcc()};
 $('selectVisible').onclick=()=>{visible().forEach(({i})=>chosen.add(i));syncAcc();changed()};$('clearAcc').onclick=()=>{chosen.clear();syncAcc();changed()};
 function probView(){$('potionLabel').textContent=(v('role')==='tank'?'회피':'크리')+' 물약 단계';}
 function roleChanged(){
  const tank=v('role')==='tank',keep=v('element');$('element').replaceChildren(new Option(tank?'빛':'어둠',tank?'light':'dark'),new Option(tank?'비빛':'비어둠','other'));if(restoring&&keep)$('element').value=keep;
  $('roleNote').textContent=tank?'생존 점수가 높은 세팅을 비교합니다.':'기대 피해가 높은 세팅을 비교합니다.';probView();
 }
 $('role').onchange=()=>{roleChanged();changed()};
 // 잠식된 요르문간드: 9.0 stats fixed.
 let normalGrade=null;
 function bossView(){const c=v('boss')==='corrupted',g=$('grade');
  document.querySelectorAll('[data-boss]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.boss===v('boss'))));
  if(c&&!g.disabled){normalGrade=g.value;g.value='9.0';}else if(!c&&g.disabled&&normalGrade){g.value=normalGrade;}
  g.disabled=c;g.title=c?'잠식된 요르문간드는 9.0 스탯으로 고정됩니다.':'';}
 document.querySelectorAll('[data-boss]').forEach(b=>b.onclick=()=>{if(v('boss')===b.dataset.boss)return;$('boss').value=b.dataset.boss;bossView();roleChanged();changed()});
 function pendOptions(type,val){const slots=type==='태양'?3:type==='달'?2:1,choices=[];function build(opts,start){if(opts.length===slots){choices.push({name:type,options:opts});return}for(let i=start;i<3;i++)build([...opts,{stat:['hp','atk','def'][i],val}],i)}build([],0);return choices;}
 let pendChoices=[];
 const pendLabel=p=>p.options.map(o=>`<span class="${o.stat}">${names[o.stat]} ${o.val}%</span>`).join(' / ');
 function renderChoices(){pendChoices=pendOptions(v('pendType'),n('pendValue'));$('pendChoices').innerHTML=pendChoices.map((p,i)=>`<button type="button" data-choice="${i}">${pendLabel(p)}<small>눌러서 추가</small></button>`).join('');}
 function addPendants(items){for(const p of items)if(!pendants.some(x=>JSON.stringify(x)===JSON.stringify(p)))pendants.push(JSON.parse(JSON.stringify(p)));renderPends();changed()}
 function renderPends(){
  $('pendCount').textContent=pendants.length+'개';
  $('pendants').innerHTML=pendants.map((p,i)=>`<div class="j-pendant"><header><strong>${esc(p.name)}</strong><button type="button" data-pend="${i}" aria-label="${esc(p.name)} 제거">제거</button></header>${p.options.map((o,j)=>`<div class="fields"><label>${j+1}옵 스탯<select data-pi="${i}" data-oi="${j}" data-field="stat">${['hp','atk','def'].map(k=>`<option value="${k}" ${k===o.stat?'selected':''}>${names[k]}</option>`).join('')}</select></label><label>수치<select data-pi="${i}" data-oi="${j}" data-field="val">${[6,5,4,3,2,1].map(x=>`<option value="${x}" ${x===o.val?'selected':''}>${x}%</option>`).join('')}</select></label></div>`).join('')}</div>`).join('');
 }
 $('pendType').onchange=e=>{e.stopPropagation();renderChoices()};$('pendValue').onchange=e=>{e.stopPropagation();renderChoices()};
 $('pendChoices').onclick=e=>{const b=e.target.closest('[data-choice]');if(b)addPendants([pendChoices[Number(b.dataset.choice)]])};
 $('sunSet').onclick=()=>addPendants(pendOptions('태양',6));$('moonSet').onclick=()=>addPendants(pendOptions('달',6));
 $('pendants').onclick=e=>{if(e.target.dataset.pend===undefined)return;pendants.splice(Number(e.target.dataset.pend),1);renderPends();changed()};
 $('pendants').onchange=e=>{const el=e.target;if(el.dataset.pi===undefined)return;e.stopPropagation();pendants[Number(el.dataset.pi)].options[Number(el.dataset.oi)][el.dataset.field]=el.dataset.field==='val'?Number(el.value):el.value;changed()};
 renderChoices();

 /* Saved per browser: basic settings + accessory mode/selection (by name). Pendant/spirit reset on reload. */
 const SAVED=['boss','role','type','grade','element','gem','enchant','potion','col-hp','col-atk','col-def','accessoryMode'];
 function save(){if(restoring)return;try{localStorage.setItem(STORE,JSON.stringify({v:1,fields:Object.fromEntries(SAVED.map(id=>[id,id==='grade'&&$('grade').disabled&&normalGrade?normalGrade:v(id)])),accessories:[...chosen].map(i=>D.accessories[i].n)}))}catch(_){}}
 function restore(){
  let s=null;try{s=JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){}
  restoring=true;
  if(s&&s.v===1){
   for(const id of SAVED){const val=s.fields?.[id];if(val==null)continue;const el=$(id);if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===val))continue;el.value=val;if(id==='role')roleChanged();}
   const byName=new Map(D.accessories.map((a,i)=>[a.n,i]));(s.accessories||[]).forEach(name=>{if(byName.has(name))chosen.add(byName.get(name))});
  }
  bossView();roleChanged();modeView('accessory');gemHelp();restoring=false;
 }
 $('resetSaved').onclick=()=>{try{localStorage.removeItem(STORE)}catch(_){}location.reload()};

 function config(){return {boss:v('boss'),role:v('role'),type:v('type'),grade:v('boss')==='corrupted'?'9.0':v('grade'),light:v('element')==='light',dark:v('element')==='dark',gem:v('gem'),enchant:v('enchant'),potion:n('potion'),potionKind:v('role')==='tank'?'eva':'crit',collection:Object.fromEntries(['hp','atk','def'].map(k=>[k,n('col-'+k)])),spirit:spirit.opts.map(o=>({stat:v('spiritMode')==='auto'?'auto':(o.stat&&o.type?o.stat:'none'),type:v('spiritMode')==='auto'?'auto':(o.type||'%')})),bonus:v('spiritMode')==='auto'?'auto':(spirit.bonus||'none'),accessoryMode:v('accessoryMode'),pendantMode:v('pendantMode'),accessories:v('accessoryMode')==='auto'?D.accessories.map((_,i)=>i):[...chosen],pendants:pendants.map(p=>{const result={name:p.name,hp:0,atk:0,def:0};p.options.forEach(o=>result[o.stat]+=o.val);return result})};}
 function finish(){worker?.terminate();worker=null;$('run').disabled=false;$('cancel').hidden=true;}
 $('cancel').onclick=()=>{finish();$('status').textContent='계산을 중단했습니다. 기존 결과는 유지됩니다.';};
 $('config').addEventListener('change',changed);
 ['col-hp','col-atk','col-def'].forEach(id=>$(id).addEventListener('input',changed));

 let lastResult=null,resultType='all';
 const metricName=c=>c.role==='tank'?'생존 점수':'기대 피해';
 const metric=(c,r)=>c.role==='tank'?r.score:r.dealt;
 function renderResults(){
  if(!lastResult)return;const {result,config:c}=lastResult;
  // Types ordered by their best score (high → low); types without results go last.
  const typed=Object.entries(result.byType).sort(([,a],[,b])=>(b.length?metric(c,b[0]):-Infinity)-(a.length?metric(c,a[0]):-Infinity));
  const entries=[['all','전체',result.rows,''],...typed.map(([t,rows],i)=>[t,t,rows,rows.length?`${i+1}위`:''])];
  $('resultTypes').innerHTML=entries.map(([id,label,rows,rank])=>`<button type="button" data-result-type="${esc(id)}" aria-pressed="${resultType===id}"><span>${rank?`<em class="j-rank">${rank}</em>`:''}${esc(label)}</span><strong>${rows.length?fmt(metric(c,rows[0])):'—'}</strong><small>${metricName(c)} 최고</small></button>`).join('');
  const rows=resultType==='all'?result.rows:result.byType[resultType]||[];
  $('resultTitle').textContent=(resultType==='all'?'전체 타입':resultType)+' · TOP '+rows.length+' · '+metricName(c)+' 높은 순';
  $('resultList').innerHTML=rows.map((r,i)=>`<article class="j-result${i===0?' j-top':''}"><header><div class="j-rank-head"><span class="j-rank-badge">${i+1}위</span><h3>${esc(r.type)}</h3></div><div class="j-metrics"><div class="primary"><small>${metricName(c)}</small><strong>${fmt(metric(c,r))}</strong></div><div><small>탱킹 비밸</small><strong>${fmt(r.tankBV)}</strong></div></div></header>
  <div class="j-final-stats">${['hp','atk','def'].map(k=>`<div class="${k}"><small>${names[k]}</small><b>${fmt(r.stats[k])}</b></div>`).join('')}</div>
  <div class="j-gear"><div><small>장신구</small><b>${esc(D.accessories[r.acc].n)}</b><div>인챈트 · ${names[r.enchant]}${r.enchant==='none'?'':' +21%'}</div></div>
  <div><small>젬 배분</small>${['hp','atk','def'].map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.gems[k]}개</span>`).join('')}</div>
  <div><small>펜던트 · ${esc(r.pend.name)}</small>${['hp','atk','def'].filter(k=>r.pend[k]).map(k=>`<span class="j-stat-chip ${k}">${names[k]} ${r.pend[k]}%</span>`).join('')||'미착용'}</div>
  <div><small>정령</small><div class="j-spirit-result">${r.spirit.opts.map((o,j)=>`<span class="${o.stat}"><small>${j+1}옵</small>${names[o.stat]} ${o.stat==='none'?'':o.type==='%'?Math.round(D.pct[j+1]*100)+'%':'+'+D.plus[o.stat][j+1]}</span>`).join('')}</div><div class="${r.spirit.bonus}">부가옵 · ${names[r.spirit.bonus]}</div></div>
  <div><small>물약</small>${esc(r.potion.n)}</div>
  <div><small>${c.role==='tank'?'회피율':'크리 확률'}</small>${r.probability?`<b class="prob">${fmt(r.probability.final)}%</b><span class="sub">기본 ${fmt(r.probability.base)}% + 장비 ${fmt(r.probability.gear)}%</span>`:'미적용'}</div></div></article>`).join('')||'선택한 조건을 만족하는 조합이 없습니다. 장비 후보를 확인해 주세요.';
 }
 $('resultTypes').onclick=e=>{const button=e.target.closest('[data-result-type]');if(!button)return;resultType=button.dataset.resultType;renderResults()};

 $('config').onsubmit=e=>{
  e.preventDefault();if(worker)return;const c=config();if(!c.accessories.length||(c.pendantMode==='manual'&&!c.pendants.length)){$('status').textContent='장신구와 펜던트 후보를 각각 하나 이상 선택해 주세요.';return}
  dirty=false;$('run').disabled=true;$('cancel').hidden=false;$('status').textContent='장비 조합 계산 중…';
  try{worker=new Worker('./jorm-engine.js');}catch(error){finish();$('status').textContent='계산기를 시작하지 못했습니다. 웹 서버에서 페이지를 열어 주세요.';return}
  worker.onerror=()=>{finish();$('status').textContent='계산 파일을 불러오지 못했습니다. jorm-engine.js와 jorm-data.js 업로드를 확인해 주세요.'};
  worker.onmessage=({data})=>{
   if(data.progress){$('status').textContent=`계산 중 ${Math.floor(data.progress.tested/data.progress.total*100)}%`;return}
   finish();if(data.error){$('status').textContent=data.error;return}
   const result=data.result;$('results').hidden=false;
   $('resultConditions').textContent=`${c.boss==='corrupted'?'잠식된 요르문간드':'요르문간드'} / ${c.role==='tank'?'탱커 · 생존 점수':'딜러 · '+metricName(c)} 우선 / ${c.grade} / ${c.potion?(c.role==='tank'?'회피':'크리')+' 물약 '+c.potion+'단계':'물약 미사용'} / 젬 ${D.gemNames[c.gem]} / 장신구 ${c.accessoryMode==='auto'?'최적화':'직접 입력'} · 펜던트 ${c.pendantMode==='auto'?'최적화':'직접 입력'} · 정령 ${c.spirit[0].type==='auto'?'최적화':'직접 입력'} / ${c.role==='tank'?(c.light?'빛':'비빛'):(c.dark?'어둠':'비어둠')}`;
   lastResult={result,config:c};resultType='all';renderResults();
   $('status').textContent=`최적화 대상 ${fmt(result.totalCandidates)}개 조합 계산 완료.`+(dirty?' 계산 중 설정이 변경되어 결과는 실행 당시 조건입니다.':'');
  };
  worker.postMessage(c);
 };
 restore();renderAcc();renderPends();
})();
