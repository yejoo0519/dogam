/* 정령 시뮬레이터: 저장 계층과 분리된 후보 탐색 및 결과 화면. */
(function(){
  'use strict';
  function resultSpirit(sp){
    const names={hp:'체력',atk:'공격',def:'방어'},colors={hp:'#fbbf24',atk:'#f87171',def:'#60a5fa'};
    const rows=Array.from({length:4},(_,i)=>{const o=sp?.opts?.[i];const valid=o&&names[o.stat]&&['%','+'].includes(o.type);return '<span style="color:'+(valid?colors[o.stat]:'var(--dim)')+'">'+(i+1)+'옵 · '+(valid?names[o.stat]+' '+fmtSpVal(i+1,o.stat,o.type):'없음')+'</span>';});
    rows.push('<span style="color:'+(colors[sp?.bonus]||'var(--dim)')+'">부가옵 · '+(names[sp?.bonus]?names[sp.bonus]+' +'+SP_BONUS[sp.bonus]:'없음')+'</span>');
    return '<div class="sp-result-spirit" style="grid-column:1/-1"><small>사용 정령</small><div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px">'+rows.join('')+'</div></div>';
  }

  if(!globalThis.DV1_DRAGON_VIEWS)return;
  const ui={priority:'bv',selected:new Set(),stage:2,results:null,type:'all',busy:false};
  const byId=id=>document.getElementById(id);
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key=b=>[b.h,b.a,b.d].join('');
  const value=n=>Number(n).toLocaleString('ko-KR');
  function compare(a,b,priority){
    if(priority==='tar'&&a.tar!==b.tar)return (b.tar??-Infinity)-(a.tar??-Infinity);
    return b.bv-a.bv||a.order-b.order;
  }
  function topInsert(list,row){
    let lo=0,hi=list.length;
    while(lo<hi){const m=(lo+hi)>>1;if(list[m].bv>=row.bv)lo=m+1;else hi=m;}
    if(lo>=10)return;
    list.splice(lo,0,row);if(list.length>10)list.pop();
  }
  function selectedBuffs(){
    if(byId('spirit-buff-mode').value==='auto')return getBufCombos(simBuf);
    const [h,a,d]=['hp','atk','def'].map(k=>Number(byId('spirit-manual-'+k).value));
    if(h+a+d>2)throw Error('직접 지정 버프는 합계 2단계(40%)까지 선택할 수 있습니다.');
    return [{h,a,d,w:1,label:[...Array(h).fill('체'),...Array(a).fill('공'),...Array(d).fill('방')].join('+')||'버프 없음'}];
  }
  function showBuffs(reset=false){
    const manual=byId('spirit-buff-mode').value==='manual';
    byId('spirit-manual-buffs').hidden=!manual;
    byId('spirit-auto-buffs').hidden=manual;
    byId('spirit-buff-help').textContent=manual?'HP·ATK·DEF를 직접 지정합니다. 합계 최대 40%.':'선택한 단계에서 가능한 모든 버프 조합을 비교합니다.';
  }
  function tarAvailable(){return typeof tarPercent==='function';}
  function refreshPriority(){
    const allowed=tarAvailable();
    if(!allowed)ui.priority='bv';
    document.querySelectorAll('[data-spirit-priority]').forEach(b=>{
      b.disabled=b.dataset.spiritPriority==='tar'&&!allowed;
      b.setAttribute('aria-pressed',String(b.dataset.spiritPriority===ui.priority));
    });
    byId('spirit-tar-note').textContent=allowed?'모든 등급의 TAR은 같은 타입·버프의 9.0 최고 세팅 대비 점수입니다.':'TAR 기준표를 불러오지 못했습니다. 비밸 비교를 이용해 주세요.';
  }
  function markDirty(){if(ui.results)byId('spirit-status').textContent='설정이 변경되었습니다. 다시 실행하면 새 조건이 반영됩니다.';}
  function priority(p){
    if(ui.busy||!['bv','tar'].includes(p)||p==='tar'&&!tarAvailable())return;
    ui.priority=p;refreshPriority();render();
  }
  function card(r,i){
    const acc=ACC_DB.find(a=>a.n===r.accN);
    return `<article class="sp-result-card">
      <header><div class="sp-card-label"><span class="sp-rank">${i+1}</span><strong style="color:${DCOLORS[r.dt]}">${r.dt}</strong><span class="sp-buff-tag">${escape(r.buf.label)}</span></div>
      <div class="sp-metrics"><div class="${ui.priority==='bv'?'is-primary':''}"><small>비밸 · 백만</small><b>${(r.bv/1e6).toFixed(1)}</b></div><div class="${ui.priority==='tar'?'is-primary':''}"><small>TAR</small><b>${r.tar===null?'—':r.tar.toFixed(1)}</b></div></div></header>
      <div class="sp-card-body"><div class="sp-equipment">${acc?.img?`<img src="${escape(acc.img)}" alt="">`:''}<div><small>장신구 / 인챈트</small><strong>${escape(r.accN)}</strong>${fmtAccEnc(r.enc)}</div></div>
      <div><small>젬 배분</small><div class="gem-tags">${fmtGem(r.alloc)}</div></div><div><small>펜던트</small>${fmtPend(r.pend)}</div>
      ${resultSpirit(ui.results.spirit)}<div class="sp-final-stats">${[['체력',r.fH,'hp'],['공격',r.fA,'atk'],['방어',r.fD,'def']].map(([label,n,k])=>`<div class="stat-${k}"><small>${label}</small><strong>${value(n)}</strong></div>`).join('')}</div></div>
      <details class="sp-breakdown"><summary>버프 적용 전후</summary><div>${[['체력',r.fH,r.add.h],['공격',r.fA,r.add.a],['방어',r.fD,r.add.d]].map(([label,n,add])=>`<span>${label} ${value(n-add)} <b>+${value(add)}</b> → ${value(n)}</span>`).join('')}</div></details>
    </article>`;
  }
  function render(){
    if(!ui.results)return;
    const all=ui.results.rows.slice().sort((a,b)=>compare(a,b,ui.priority));
    const best=DTYPES.map(dt=>all.find(r=>r.dt===dt)).filter(Boolean).sort((a,b)=>compare(a,b,ui.priority));
    byId('spirit-type-summary').innerHTML=`<button class="sp-type-card ${ui.type==='all'?'selected':''}" data-type="all"><small>전체 타입</small><strong>통합 TOP 10</strong><span>${ui.priority==='tar'?'TAR':'비밸'} 우선</span></button>`+best.map(r=>`<button class="sp-type-card ${ui.type===r.dt?'selected':''}" data-type="${r.dt}"><small>${r.dt}</small><strong>${ui.priority==='tar'?r.tar.toFixed(1):(r.bv/1e6).toFixed(1)}</strong><span>${escape(r.buf.label)} · ${ui.priority==='tar'?'TAR':'비밸(백만)'}</span></button>`).join('');
    byId('spirit-type-summary').querySelectorAll('button').forEach(b=>b.onclick=()=>{ui.type=b.dataset.type;render();});
    const rows=all.filter(r=>ui.type==='all'||r.dt===ui.type).slice(0,10);
    byId('spirit-result-list').innerHTML=rows.map(card).join('');
    byId('spirit-run-caption').textContent=`${ui.results.grade} 등급 · ${ui.results.labels.join(', ')} · ${value(ui.results.tested)}개 세팅 비교`;
    byId('spirit-ranking-label').textContent=`${ui.type==='all'?'전체 타입':ui.type} · ${ui.priority==='tar'?'TAR':'비밸'} 우선 TOP ${rows.length}`;
  }
  async function calculate(){
    if(ui.busy)return;
    const status=byId('spirit-status');
    let buffs;try{buffs=selectedBuffs();}catch(e){status.textContent=e.message;return;}
    if(!buffs.length){status.textContent='비교할 버프를 하나 이상 선택해 주세요.';return;}
    const encMode=document.querySelector('input[name="enc-mode"]:checked')?.value||'fixed';
    const seen=new Set();
    const accs=S.accCards.map(c=>{const a=ACC_DB.find(a=>a.n===c.name);return a?{...a,enc:c.enchant||'none'}:null;}).filter(a=>{
      if(!a)return false;const k=a.n+'|'+(encMode==='fixed'?a.enc:'any');if(seen.has(k))return false;seen.add(k);return true;
    });
    if(!accs.length){status.textContent='내 스펙에서 장신구를 1개 이상 등록해 주세요.';return;}
    ui.busy=true;const button=byId('sim-btn');button.disabled=true;button.textContent='세팅 비교 중…';
    status.textContent='보유 장비와 선택한 버프를 비교하고 있습니다.';
    try{
    // Snapshot all inputs before yielding. No storage/network writes occur here.
    const grade=simGrade,sp=procSpirit(),coll={...S.coll},spiritSnapshot=JSON.parse(JSON.stringify(S.spirit));
    const pool=buildPool(),allocs=genAllocs(pool,5).map(a=>({alloc:a.map((k,i)=>({k,g:pool[i]})).filter(x=>x.k>0),h:a.reduce((s,k,i)=>s+k*pool[i].h,0),a:a.reduce((s,k,i)=>s+k*pool[i].a,0),d:a.reduce((s,k,i)=>s+k*pool[i].d,0)}));
    const pends=JSON.parse(JSON.stringify(getPends(byId('exc-sun-pend')?.checked ?? false)));
    const rows=[];let tested=0,order=0;
    const total=DTYPES.length*buffs.length*accs.length*(encMode==='infinite'?3:1)*pends.length*allocs.length;
    let lastYield=performance.now();
    const contributions={h:[...new Set(allocs.map(a=>a.h))],a:[...new Set(allocs.map(a=>a.a))],d:[...new Set(allocs.map(a=>a.d))]};
      await new Promise(r=>setTimeout(r,0));
      for(const dt of DTYPES){
        const base=BASE[grade][dt];
        for(const buf of buffs){
          const group=[];const add={h:Math.floor(buf.h*base.hp*.2),a:Math.floor(buf.a*base.atk*.2),d:Math.floor(buf.d*base.def*.2)};
          for(const acc of accs)for(const enc of encMode==='infinite'?['hp','atk','def']:[acc.enc])for(const pend of pends){
            const pp=calcPendPct(pend);
            // Each stat depends only on its own gem total. Reuse identical calculations.
            const hs=new Map(contributions.h.map(h=>[h,calcStat(base.hp,h,24,acc.hp+(enc==='hp'?.21:0),sp.pct.hp,pp.pH,sp.plus.hp,sp.bonus.hp,coll.hp,add.h)]));
            const ats=new Map(contributions.a.map(a=>[a,calcStat(base.atk,a,6,acc.atk+(enc==='atk'?.21:0),sp.pct.atk,pp.pA,sp.plus.atk,sp.bonus.atk,coll.atk,add.a)]));
            const ds=new Map(contributions.d.map(d=>[d,calcStat(base.def,d,6,acc.def+(enc==='def'?.21:0),sp.pct.def,pp.pD,sp.plus.def,sp.bonus.def,coll.def,add.d)]));
            for(const a of allocs){
              const fH=hs.get(a.h),fA=ats.get(a.a),fD=ds.get(a.d);
              const bv=fH*fA*fD;tested++;order++;
              // Within a fixed type/buff, TAR is monotonic in BV. Keeping 10 per group preserves both global top tens.
              if(group.length<10||bv>group[group.length-1].bv)topInsert(group,{dt,buf,accN:acc.n,enc,pend,alloc:a.alloc,fH,fA,fD,bv,add,order,tar:typeof tarPercent==='function'?tarPercent(bv,dt,{hp:buf.h,atk:buf.a,def:buf.d}):null});
              if(tested%8192===0&&performance.now()-lastYield>=80){
                status.textContent='세팅 비교 중 '+Math.min(99,Math.floor(tested/total*100))+'% · '+tested.toLocaleString('ko-KR')+' / '+total.toLocaleString('ko-KR');
                await new Promise(r=>setTimeout(r,0));lastYield=performance.now();
              }
            }
          }
          rows.push(...group);
        }
      }
      ui.results={grade,spirit:spiritSnapshot,labels:buffs.map(b=>b.label),rows,tested};ui.type='all';
      byId('res-sec').style.display='';byId('res-sec-empty').style.display='none';render();status.textContent='계산 완료. 우선순위와 타입을 바꿔 결과를 비교해 보세요.';
    }catch(e){status.textContent='계산하지 못했습니다: '+e.message;console.error(e);}
    finally{ui.busy=false;button.disabled=false;button.textContent='내 세팅 비교하기';}
  }
  window.runSim=calculate;
  const oldGrade=setGrade,oldBuf=setBuf;
  window.setGrade=g=>{if(ui.busy)return;oldGrade(g);refreshPriority();markDirty();};
  window.setBuf=b=>{if(ui.busy)return;oldBuf(b);showBuffs(true);markDirty();};
  window.SpiritSimulator=Object.freeze({calculate,priority,getResults:()=>ui.results?JSON.parse(JSON.stringify(ui.results)):null});
  document.addEventListener('DOMContentLoaded',()=>{
    showBuffs(true);refreshPriority();byId('sim-btn').disabled=false;byId('spirit-status').textContent='버프와 추천 기준을 선택한 뒤 내 세팅을 비교해 보세요.';
    document.querySelectorAll('[data-spirit-priority]').forEach(b=>b.onclick=()=>priority(b.dataset.spiritPriority));
    document.querySelectorAll('input[name="enc-mode"],#exc-sun-pend').forEach(el=>el.addEventListener('change',markDirty));
    byId('spirit-buff-mode').onchange=()=>{showBuffs();markDirty();};
    document.querySelectorAll('#spirit-manual-buffs select').forEach(el=>el.onchange=markDirty);
  });
})();
