/* 정령 시뮬레이터: 저장 계층과 분리된 후보 탐색 및 결과 화면. */
(function(){
  'use strict';
  if(!globalThis.DV1_DRAGON_VIEWS)return;
  const ui={priority:'bv',selected:new Set(),stage:2,results:null,type:'all',buff:'all',busy:false};
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
  // ── 결과 화면: 타입 요약표 + 한 줄 목록 (줄을 누르면 장비·스탯이 펼쳐진다) ──
  const SCOL={hp:'var(--hpc)',atk:'var(--atc)',def:'var(--dfc)'};
  const PEND_SHORT={태양:'태양펜',달:'달펜',별:'별펜'};
  function pendText(p){
    if(!p)return '펜던트 없음';
    const mo=p.type==='태양'?3:p.type==='달'?2:1;
    return (PEND_SHORT[p.type]||p.type)+' '+p.options.slice(0,mo).filter(o=>o&&o.stat).map(o=>`<span style="color:${SCOL[o.stat]}">${SK[o.stat]}${o.val||0}</span>`).join('/');
  }
  const accShort=n=>String(n||'').replace(/^(악몽|황혼|여명) 수호자의 보주 \((..)\)/,'$2');
  // 목록용 작은 이미지 (장신구·펜던트)
  const accImgTag=(n,cls)=>{const a=ACC_DB.find(x=>x.n===n);return a&&a.img?`<img class="${cls}" src="${escape(a.img)}" alt="" onerror="this.hidden=true">`:'';};
  const pendImgTag=(p,cls)=>p&&IMG_PEND[p.type]?`<img class="${cls}" src="${escape(IMG_PEND[p.type])}" alt="" onerror="this.hidden=true">`:'';
  const encText=e=>e&&e!=='none'?` <span style="color:${SCOL[e]}">${SK[e]}+21%</span>`:'';
  function spiritChips(sp){
    const out=(sp?.opts||[]).map(o=>o&&o.stat&&o.type?`<span class="sp-chip ${o.stat}">${SK[o.stat]}${o.type}</span>`:'<span class="sp-chip none">·</span>');
    if(sp?.bonus)out.push(`<span class="sp-chip ${sp.bonus} bn">부가</span>`);
    return `<span class="sp-chips">${out.join('')}</span>`;
  }
  function row(r,i){
    return `<details class="spx-row sim-row"><summary>
        <span class="spx-r-no">${i+1}</span>
        <span class="sim-r-type"><b style="color:${DCOLORS[r.dt]}">${r.dt}</b> <span>${escape(r.buf.label)}</span></span>
        <span class="sim-r-gear">${accImgTag(r.accN,'sim-ico')}${escape(accShort(r.accN))}${encText(r.enc)}</span>
        <span class="sim-r-gear">${pendImgTag(r.pend,'sim-ico')}${pendText(r.pend)}</span>
        <span class="spx-r-num${ui.priority==='bv'?' on':''}">${(r.bv/1e6).toFixed(1)}</span>
        <span class="spx-r-num${ui.priority==='tar'?' on':''}">${r.tar===null?'—':r.tar.toFixed(1)}</span>
      </summary>
      <div class="spx-r-detail">
        <div><small>장신구</small><span class="sim-gear-line">${accImgTag(r.accN,'sim-img')}<span>${escape(r.accN)}${encText(r.enc)}</span></span></div>
        <div><small>펜던트</small><span class="sim-gear-line">${pendImgTag(r.pend,'sim-img')}<span>${pendText(r.pend)}</span></span></div>
        <div><small>젬</small><span class="gem-tags">${fmtGem(r.alloc)}</span></div>
        <div><small>최종 스탯 (버프 포함)</small><span style="color:var(--hpc)">${value(r.fH)}</span> / <span style="color:var(--atc)">${value(r.fA)}</span> / <span style="color:var(--dfc)">${value(r.fD)}</span></div>
        <div><small>버프 전 스탯</small>${value(r.fH-r.add.h)} / ${value(r.fA-r.add.a)} / ${value(r.fD-r.add.d)}</div>
      </div>
    </details>`;
  }
  // 가장 높은 세팅: 목록과 별개로 항상 보이는 카드 — 기존 사이트 결과 카드 디자인 그대로 (현재 타입·버프 필터 기준 1위)
  function spiritBlock(sp){
    const names={hp:'체력',atk:'공격',def:'방어'},colors={hp:'#fbbf24',atk:'#f87171',def:'#60a5fa'};
    const rows=Array.from({length:4},(_,i)=>{const o=sp?.opts?.[i];const valid=o&&names[o.stat]&&['%','+'].includes(o.type);return '<span style="color:'+(valid?colors[o.stat]:'var(--dim)')+'">'+(i+1)+'옵 · '+(valid?names[o.stat]+' '+fmtSpVal(i+1,o.stat,o.type):'없음')+'</span>';});
    rows.push('<span style="color:'+(colors[sp?.bonus]||'var(--dim)')+'">부가옵 · '+(names[sp?.bonus]?names[sp.bonus]+' +'+SP_BONUS[sp.bonus]:'없음')+'</span>');
    return '<div class="sp-result-spirit" style="grid-column:1/-1"><small>사용 정령</small><div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px">'+rows.join('')+'</div></div>';
  }
  function bestCard(r){
    if(!r)return '';
    const acc=ACC_DB.find(a=>a.n===r.accN);
    return `<article class="sp-result-card sim-best">
      <header><div class="sp-card-label"><span class="sp-rank">1</span><strong style="color:${DCOLORS[r.dt]}">${r.dt}</strong><span class="sp-buff-tag">${escape(r.buf.label)}</span><span class="sim-best-tag">가장 높은 세팅</span></div>
      <div class="sp-metrics"><div class="${ui.priority==='bv'?'is-primary':''}"><small>비밸 · 백만</small><b>${(r.bv/1e6).toFixed(1)}</b></div><div class="${ui.priority==='tar'?'is-primary':''}"><small>TAR</small><b>${r.tar===null?'—':r.tar.toFixed(1)}</b></div></div></header>
      <div class="sp-card-body"><div class="sp-equipment">${acc?.img?`<img src="${escape(acc.img)}" alt="">`:''}<div><small>장신구 / 인챈트</small><strong>${escape(r.accN)}</strong>${fmtAccEnc(r.enc)}</div></div>
      <div><small>젬 배분</small><div class="gem-tags">${fmtGem(r.alloc)}</div></div><div><small>펜던트</small>${fmtPend(r.pend)}</div>
      ${spiritBlock(ui.results.spirit)}<div class="sp-final-stats">${[['체력',r.fH,'hp'],['공격',r.fA,'atk'],['방어',r.fD,'def']].map(([label,n,k])=>`<div class="stat-${k}"><small>${label}</small><strong>${value(n)}</strong></div>`).join('')}</div></div>
      <details class="sp-breakdown"><summary>버프 적용 전후</summary><div>${[['체력',r.fH,r.add.h],['공격',r.fA,r.add.a],['방어',r.fD,r.add.d]].map(([label,n,add])=>`<span>${label} ${value(n-add)} <b>+${value(add)}</b> → ${value(n)}</span>`).join('')}</div></details>
    </article>`;
  }
  // 타입별: 버프마다 가능한 최고 비밸 기준 고점·저점·가중평균 (고정 장비의 평균이 아님)
  function summaries(){
    return DTYPES.map(dt=>{
      const best=new Map();
      ui.results.rows.filter(r=>r.dt===dt).forEach(r=>{
        const k=key(r.buf);if(!best.has(k)||compare(r,best.get(k),ui.priority)<0)best.set(k,r);
      });
      const buffs=[...best.values()].sort((a,b)=>compare(a,b,ui.priority));
      if(!buffs.length)return null;
      const weight=buffs.reduce((s,r)=>s+(r.buf.w??1),0);
      return {dt,peak:buffs[0],low:buffs[buffs.length-1],avg:buffs.reduce((s,r)=>s+r.bv*(r.buf.w??1),0)/weight};
    }).filter(Boolean);
  }
  function renderOverview(){
    const pri=ui.priority;
    const fmt=r=>pri==='tar'?(r.tar===null?'—':r.tar.toFixed(1)):(r.bv/1e6).toFixed(1);
    const stats=summaries().sort((a,b)=>compare(a.peak,b.peak,pri));
    const multi=ui.results.labels.length>1;
    byId('spirit-type-summary').innerHTML=`<div class="sim-ttbl">
      <div class="sim-thead"><span>타입</span><span>고점 버프</span><span>고점</span>${multi?'<span>저점</span><span>평균 비밸</span>':''}</div>
      <button type="button" class="sim-trow${ui.type==='all'?' on':''}" data-type="all"><span><b>전체 타입</b></span><span></span><span></span>${multi?'<span></span><span></span>':''}</button>
      ${stats.map(s=>`<button type="button" class="sim-trow${ui.type===s.dt?' on':''}" data-type="${s.dt}">
        <span><b style="color:${DCOLORS[s.dt]}">${s.dt}</b></span><span>${escape(s.peak.buf.label)}</span><span class="n on">${fmt(s.peak)}</span>
        ${multi?`<span class="n">${fmt(s.low)}</span><span class="n">${(s.avg/1e6).toFixed(1)}</span>`:''}</button>`).join('')}
    </div>
    <p class="sp-help">고점·저점은 버프 조합마다 나올 수 있는 최고 세팅끼리 비교한 값이에요 (${pri==='tar'?'TAR':'비밸 · 백만'}). 평균 비밸은 버프 가중치(2버프: 같은 스탯 1/9, 혼합 2/9)를 적용해요. 타입을 누르면 아래 목록이 그 타입으로 바뀌어요.</p>`;
    byId('spirit-type-summary').querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>{ui.type=b.dataset.type;render();});
    let filters=byId('spirit-result-buffs');
    if(!filters){filters=document.createElement('div');filters.id='spirit-result-buffs';filters.className='sp-result-buff-filters';byId('spirit-ranking-label').before(filters);}
    const buffs=[...new Map(ui.results.rows.map(r=>[key(r.buf),r.buf])).entries()];
    filters.hidden=buffs.length<2;
    filters.innerHTML=[['all','전체 버프'],...buffs.map(([k,b])=>[k,b.label])].map(([k,label])=>`<button type="button" data-buff="${k}" aria-pressed="${ui.buff===k}">${escape(label)}</button>`).join('');
    filters.querySelectorAll('button').forEach(b=>b.onclick=()=>{ui.buff=b.dataset.buff;render();});
  }
  function render(){
    if(!ui.results)return;
    renderOverview();
    const rows=ui.results.rows.slice().sort((a,b)=>compare(a,b,ui.priority)).filter(r=>(ui.type==='all'||r.dt===ui.type)&&(ui.buff==='all'||key(r.buf)===ui.buff)).slice(0,10);
    byId('spirit-result-list').innerHTML=bestCard(rows[0])+`<div class="spx-tblock sim-list" style="--tc:var(--gold)">
      <div class="spx-cols sim-cols"><span>#</span><span>타입 · 버프</span><span>장신구</span><span>펜던트</span><span>비밸(백만)</span><span>TAR</span></div>
      ${rows.map(row).join('')}</div>`;
    byId('spirit-run-caption').innerHTML=`${ui.results.grade} 등급 · ${value(ui.results.tested)}개 세팅 비교 · 사용 정령 ${spiritChips(ui.results.spirit)}`;
    byId('spirit-ranking-label').textContent=`${ui.type==='all'?'전체 타입':ui.type} · ${ui.priority==='tar'?'TAR':'비밸'} 우선 TOP ${rows.length} · 줄을 누르면 젬과 스탯이 보여요`;
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
      ui.results={grade,spirit:spiritSnapshot,labels:buffs.map(b=>b.label),rows,tested};ui.type='all';ui.buff='all';
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
