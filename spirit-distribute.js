/* 정령 계산/배분 — [정령 배분] 모드: 보유 정령을 하나씩 계산해 가장 잘 맞는 타입(버프+버프)에 귀속시킨다.
 * 등급·버프 설정·추천 기준은 [정령 계산] 모드의 설정 패널 값을 그대로 쓰고, 장비는 내 스펙 보유분 기준
 * (정령마다 따로 계산 — 정령 계산 모드에서 그 정령 하나를 돌린 결과와 같다).
 * 보유 정령 목록은 이 페이지 저장값(S)에만 들어간다. */
(function(){
  'use strict';
  if(!globalThis.DV1_DRAGON_VIEWS)return;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>Number(n).toLocaleString('ko-KR');
  const STAT_NAME={hp:'체력',atk:'공격',def:'방어'};
  const STAT_COL={hp:'var(--hpc)',atk:'var(--atc)',def:'var(--dfc)'};
  const newUid=()=>'spx-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  const mkSp=()=>({uid:newUid(),memo:'',opts:[0,1,2,3].map(k=>({stat:'',type:k===3?'+':'%'})),bonus:''});

  let busy=false,last=null;

  // ── 저장값 ──────────────────────────────────────────────
  function ensure(){
    if(!Array.isArray(S.spxList))S.spxList=[];
    S.spxList.forEach(x=>{
      x.uid=x.uid||newUid();x.memo=String(x.memo||'').slice(0,30);x.bonus=STAT_NAME[x.bonus]?x.bonus:'';
      x.opts=[0,1,2,3].map(i=>{const o=(x.opts||[])[i]||{};return {stat:STAT_NAME[o.stat]?o.stat:'',type:o.type==='+'?'+':'%'};});
    });
    if(!['calc','dist'].includes(S.calcMode))S.calcMode='calc';
    S.spxFold=!!S.spxFold;
  }
  function save(){if(typeof qSave==='function')qSave();}

  // ── 정령 ────────────────────────────────────────────────
  const spValid=x=>x.opts.some(o=>o.stat)||!!x.bonus;
  function spProc(x){
    const plus={hp:0,atk:0,def:0},pct={hp:0,atk:0,def:0},bonus={hp:0,atk:0,def:0};
    x.opts.forEach((o,i)=>{
      if(!o.stat)return;
      if(o.type==='+')plus[o.stat]+=SP_PLUS[o.stat][i+1];else pct[o.stat]+=SP_PCT[i+1];
    });
    if(x.bonus)bonus[x.bonus]=SP_BONUS[x.bonus];
    return {plus,pct,bonus};
  }
  function spOptVal(i,o){return o.type==='+'?'+'+SP_PLUS[o.stat][i+1]:'+'+Math.round(SP_PCT[i+1]*100)+'%';}

  // ── 보유 정령 입력 (내 스펙 탭) — 챔대 자동 계산기 [정령 배분] 입력과 같은 구성 ──
  const SPX_PATS=['%%%+','%%%%','+%%%','+%%+'];
  // 접었을 때·결과 등에서 쓰는 작은 옵션 칩
  function spChips(x){
    const out=x.opts.map(o=>o.stat?`<span class="sp-chip ${o.stat}">${SK[o.stat]}${o.type==='+'?'+':'%'}</span>`:'<span class="sp-chip none">·</span>');
    if(x.bonus)out.push(`<span class="sp-chip ${x.bonus} bn">부가</span>`);
    return `<span class="sp-chips">${out.join('')}</span>`;
  }
  function cardHtml(x,j){
    const presets=`<div class="preset-row">${SPX_PATS.map(p=>`<button type="button" class="chip pat${x.opts.every((o,k)=>o.type===p[k])?' on':''}" data-act="preset" data-j="${j}" data-p="${p}">${p}</button>`).join('')}</div>`;
    const rows=x.opts.map((o,k)=>`<div class="sp2-row"><span class="k">${k+1}옵</span>
        ${SKEYS.map(s=>`<button type="button" class="chip${o.stat===s?' on-'+s:''}" data-act="stat" data-j="${j}" data-i="${k}" data-s="${s}">${SK[s]}</button>`).join('')}
        <button type="button" class="chip on" data-act="type" data-j="${j}" data-i="${k}">${o.type==='+'?'+':'%'}</button>
        <span class="v">${o.stat?spOptVal(k,o):''}</span></div>`).join('');
    const bonus=`<div class="sp2-row sp2-bonus"><span class="k">부가</span>
        ${SKEYS.map(s=>`<button type="button" class="chip${x.bonus===s?' on-'+s:''}" data-act="bonus" data-j="${j}" data-s="${s}">${SK[s]}</button>`).join('')}
        <span class="v">${x.bonus?'+'+SP_BONUS[x.bonus]:''}</span></div>`;
    return `<div class="spx-card" data-spx="${esc(x.uid)}">
      <div class="spx-hd">
        <span class="spx-no">#${j+1}</span>
        <input type="text" class="spx-memo" maxlength="30" placeholder="메모 (구분용, 선택)" value="${esc(x.memo)}" data-act="memo" data-j="${j}">
        <button type="button" class="icon-btn" title="복제" data-act="dup" data-j="${j}">⧉</button>
        <button type="button" class="icon-btn red" title="삭제" data-act="del" data-j="${j}">✕</button>
      </div>
      ${presets}<div>${rows}${bonus}</div>
    </div>`;
  }
  // 접은 상태: 정령마다 번호·메모·옵션 칩만 한 줄로
  function foldHtml(list){
    return `<div class="spx-fold-grid">${list.map((x,j)=>`<div class="spx-fold-item${spValid(x)?'':' is-empty'}"><span class="spx-no">#${j+1}</span>${x.memo?`<span class="spx-fold-memo">${esc(x.memo)}</span>`:''}${spChips(x)}</div>`).join('')}</div>`;
  }
  function renderList(){
    const host=$('spx-wrap');if(!host)return;
    const list=S.spxList,ok=list.filter(spValid).length,fold=!!S.spxFold;
    const title='보유 정령 '+ok+'개'+(list.length>ok?' (미입력 '+(list.length-ok)+')':'');
    const body=!list.length
      ?'<div class="spx-empty">등록된 정령이 없어요. [＋ 정령 추가]로 보유 정령을 입력해주세요.</div>'
      :fold?foldHtml(list):`<div class="spx-grid">${list.map(cardHtml).join('')}</div>`;
    host.innerHTML=`<div class="sec">
      <div class="sec-hd" data-act="fold" style="cursor:pointer"><span>${esc(title)}</span><span style="display:flex;gap:6px;align-items:center"><button type="button" class="btn" data-act="fold">${fold?'▸ 펼치기':'▾ 접기'}</button><button type="button" class="btn" data-act="add">＋ 정령 추가</button></span></div>
      <div class="sec-bd">
        ${fold?'':'<div class="spx-note">가지고 있는 정령을 전부 입력하면 길드전 3마리에 어느 정령을 넣는 게 좋은지 장비와 함께 자동으로 배분해서 보여줘요. 결과는 미리보기라 길드전 계산기에는 저장되지 않아요. (입력한 정령 목록은 저장돼요)</div>'}
        ${body}
      </div>
    </div>`;
  }
  function onListEvent(e){
    const el=e.target.closest('[data-act]');if(!el||busy)return;
    const act=el.dataset.act,j=+el.dataset.j,x=S.spxList[j];
    if(e.type==='input'){
      if(act!=='memo'||!x)return;
      x.memo=el.value.slice(0,30);save();markDirty();return;
    }
    if(e.type!=='click'||act==='memo')return;
    if(act==='fold'){S.spxFold=!S.spxFold;}
    else if(act==='add'){S.spxFold=false;S.spxList.push(mkSp());}
    else if(act==='dup'&&x){const cp=JSON.parse(JSON.stringify(x));cp.uid=newUid();S.spxList.splice(j+1,0,cp);}
    else if(act==='del'&&x){S.spxList.splice(j,1);}
    else if(act==='preset'&&x){const p=el.dataset.p;if(!SPX_PATS.includes(p))return;x.opts.forEach((o,k)=>{o.type=p[k];});}
    else if(act==='stat'&&x){const o=x.opts[+el.dataset.i],s=el.dataset.s;o.stat=o.stat===s?'':s;}
    else if(act==='type'&&x){const o=x.opts[+el.dataset.i];o.type=o.type==='+'?'%':'+';}
    else if(act==='bonus'&&x){const s=el.dataset.s;x.bonus=x.bonus===s?'':s;}
    else return;
    renderList();renderCfg();save();
    if(act!=='fold')markDirty();
    if(act==='add'){const cards=document.querySelectorAll('#spx-wrap .spx-card');const lastCard=cards[cards.length-1];if(lastCard)lastCard.scrollIntoView({behavior:'smooth',block:'nearest'});}
  }

  // ── 설정 (정령 계산 모드 패널 값을 읽는다) ─────────────────
  function priority(){
    const b=document.querySelector('#setpane [data-spirit-priority="tar"]');
    return b&&b.getAttribute('aria-pressed')==='true'&&typeof tarPercent==='function'?'tar':'bv';
  }
  function buffCombos(){
    if($('spirit-buff-mode')?.value!=='manual')return getBufCombos(simBuf);
    const [h,a,d]=['hp','atk','def'].map(k=>Number($('spirit-manual-'+k)?.value||0));
    if(h+a+d>2)throw Error('직접 지정 버프는 합계 2단계(40%)까지 선택할 수 있어요.');
    return [{h,a,d,label:[...Array(h).fill('체'),...Array(a).fill('공'),...Array(d).fill('방')].join('+')||'버프 없음'}];
  }
  function renderCfg(){
    const host=$('spx-cfg');if(!host)return;
    const warns=[];
    if(!S.accCards.length)warns.push('내 스펙에 장신구가 없어요.');
    if(!S.spxList.some(spValid))warns.push('보유 정령을 하나 이상 입력해주세요. (내 스펙 탭)');
    host.innerHTML=`<p class="sp-help" style="margin:0">입력한 정령마다 아래 등급·버프 설정으로 6타입을 모두 계산해서, 추천 기준이 가장 높은 타입(버프+버프)에 귀속시켜요.</p>${warns.length?`<div class="spx-warn">${warns.map(esc).join('<br>')}</div>`:''}`;
  }

  // ── 모드 전환 ───────────────────────────────────────────
  function setMode(m){
    if(busy||!['calc','dist'].includes(m))return;
    S.calcMode=m;save();renderMode();
  }
  function renderMode(){
    const dist=S.calcMode==='dist';
    document.body.dataset.calcMode=S.calcMode;
    document.querySelectorAll('[data-calc-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.calcMode===S.calcMode)));
    const btn=$('sim-btn');
    if(btn&&!btn.disabled)btn.textContent=dist?'정령 배분 실행':'내 세팅 비교하기';
    const st=$('spirit-status');
    if(st&&!busy)st.textContent=dist?(last?'배분 결과가 있어요. 설정을 바꾸면 다시 실행해 주세요.':'보유 정령과 설정을 확인한 뒤 [정령 배분 실행]을 눌러주세요.'):'버프와 추천 기준을 선택한 뒤 내 세팅을 비교해 보세요.';
    if(dist){renderList();renderCfg();}
  }
  function markDirty(){
    if(!last||S.calcMode!=='dist'||busy)return;
    const st=$('spirit-status');if(st)st.textContent='설정이 변경되었습니다. 다시 실행하면 새 조건이 반영됩니다.';
  }

  // ── 계산 ────────────────────────────────────────────────
  function yieldNow(){
    if(globalThis.scheduler?.yield)return globalThis.scheduler.yield();
    return new Promise(r=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();r();};ch.port2.postMessage(null);});
  }
  const tarOf=(bv,dt,b)=>typeof tarPercent==='function'?tarPercent(bv,dt,{hp:b.h,atk:b.a,def:b.d}):null;

  async function run(){
    if(busy)return;
    ensure();
    const st=$('spirit-status'),btn=$('sim-btn');
    const say=m=>{if(st)st.textContent=m;};
    let buffs;try{buffs=buffCombos();}catch(e){say(e.message);return;}
    const encMode=document.querySelector('input[name="enc-mode"]:checked')?.value||'fixed';
    const seen=new Set();
    const accs=S.accCards.map(c=>{const a=ACC_DB.find(x=>x.n===c.name);return a?{...a,enc:c.enchant||'none'}:null;}).filter(a=>{
      if(!a)return false;const k=a.n+'|'+(encMode==='fixed'?a.enc:'any');if(seen.has(k))return false;seen.add(k);return true;
    });
    if(!accs.length){say('내 스펙에서 장신구를 1개 이상 등록해 주세요.');return;}
    const spirits=S.spxList.map((x,j)=>({j,x})).filter(o=>spValid(o.x));
    if(!spirits.length){say('보유 정령을 하나 이상 입력해 주세요. (내 스펙 탭)');return;}

    busy=true;
    const lock=[...document.querySelectorAll('[data-calc-mode],#sim-btn')];
    lock.forEach(el=>el.disabled=true);
    const prog=p=>{if(btn)btn.textContent='배분 중 '+Math.max(0,Math.min(99,Math.floor(p)))+'%';};
    say('정령마다 6타입을 계산하고 있어요.');prog(0);
    try{
      await yieldNow();
      // 정령 계산 모드와 같은 입력: 등급·젬 풀·펜던트·컬렉션·인챈트
      const grade=simGrade,pri=priority(),coll={...S.coll};
      const pool=buildPool();
      const seenA=new Map();
      genAllocs(pool,5).forEach(a=>{
        const h=a.reduce((s,k,i)=>s+k*pool[i].h,0),at=a.reduce((s,k,i)=>s+k*pool[i].a,0),d=a.reduce((s,k,i)=>s+k*pool[i].d,0);
        const key=h+'|'+at+'|'+d;if(!seenA.has(key))seenA.set(key,{h,a:at,d,alloc:a.map((k,i)=>({k,g:pool[i]})).filter(x=>x.k>0)});
      });
      const allocs=[...seenA.values()];
      const hVals=[...new Set(allocs.map(a=>a.h))],aVals=[...new Set(allocs.map(a=>a.a))],dVals=[...new Set(allocs.map(a=>a.d))];
      const pends=JSON.parse(JSON.stringify(getPends($('exc-sun-pend')?.checked??false)));
      const rows=[];
      const totalJobs=spirits.length*DTYPES.length;let job=0,lastY=performance.now();
      for(const s of spirits){
        const sp=spProc(s.x);
        const perType=[];
        for(const dt of DTYPES){
          const base=BASE[grade][dt];
          let bestT=null;
          for(const buf of buffs){
            const add={h:Math.floor(buf.h*base.hp*.2),a:Math.floor(buf.a*base.atk*.2),d:Math.floor(buf.d*base.def*.2)};
            let best=null;
            for(const acc of accs)for(const enc of encMode==='infinite'?['hp','atk','def']:[acc.enc])for(const pend of pends){
              const pp=calcPendPct(pend);
              const aH=acc.hp+(enc==='hp'?.21:0),aA=acc.atk+(enc==='atk'?.21:0),aD=acc.def+(enc==='def'?.21:0);
              const hs=new Map(hVals.map(v=>[v,calcStat(base.hp,v,24,aH,sp.pct.hp,pp.pH,sp.plus.hp,sp.bonus.hp,coll.hp,add.h)]));
              const as=new Map(aVals.map(v=>[v,calcStat(base.atk,v,6,aA,sp.pct.atk,pp.pA,sp.plus.atk,sp.bonus.atk,coll.atk,add.a)]));
              const ds=new Map(dVals.map(v=>[v,calcStat(base.def,v,6,aD,sp.pct.def,pp.pD,sp.plus.def,sp.bonus.def,coll.def,add.d)]));
              for(const al of allocs){
                const fH=hs.get(al.h),fA=as.get(al.a),fD=ds.get(al.d),bv=fH*fA*fD;
                if(!best||bv>best.bv)best={bv,fH,fA,fD,accN:acc.n,enc,pend,alloc:al.alloc};
              }
            }
            const r={...best,dt,buf,add,tar:tarOf(best.bv,dt,buf)};
            r.score=pri==='tar'?(r.tar??-Infinity):r.bv;
            if(!bestT||r.score>bestT.score||(r.score===bestT.score&&r.bv>bestT.bv))bestT=r;
          }
          perType.push(bestT);
          job++;
          if(performance.now()-lastY>=80){prog(100*job/totalJobs);await yieldNow();lastY=performance.now();}
        }
        perType.sort((a,b)=>b.score-a.score||b.bv-a.bv);
        rows.push({j:s.j,x:JSON.parse(JSON.stringify(s.x)),best:perType[0],perType});
      }
      last={rows,grade,pri,labels:buffs.map(b=>b.label)};
      renderResult();
      say('배분 완료. 정령마다 가장 잘 맞는 타입(버프+버프)을 보여줘요.');
    }catch(e){console.error(e);say('계산하지 못했어요: '+e.message);}
    finally{
      busy=false;lock.forEach(el=>el.disabled=false);
      if(btn)btn.textContent=S.calcMode==='dist'?'정령 배분 실행':'내 세팅 비교하기';
    }
  }

  // ── 결과: 타입별로 묶은 한 줄 목록, 줄을 누르면 장비·스탯이 펼쳐진다 ─────
  const PEND_SHORT={태양:'태양펜',달:'달펜',별:'별펜'};
  function pendText(p){
    if(!p)return '없음';
    const mo=p.type==='태양'?3:p.type==='달'?2:1;
    return (PEND_SHORT[p.type]||p.type)+' '+p.options.slice(0,mo).filter(o=>o&&o.stat).map(o=>`<span style="color:${STAT_COL[o.stat]}">${SK[o.stat]}${o.val||0}</span>`).join('/');
  }
  function encText(e){return e&&e!=='none'?` <span style="color:${STAT_COL[e]}">${SK[e]}+21%</span>`:'';}
  const fmtScore=(r,pri)=>pri==='tar'?(r.tar==null?'—':r.tar.toFixed(1)):(r.bv/1e6).toFixed(1);
  function rowHtml(row){
    const r=row.best,pri=last.pri;
    const others=row.perType.slice(1).map(o=>`<span><b style="color:${DCOLORS[o.dt]}">${esc(o.dt)}</b> ${esc(o.buf.label)} ${fmtScore(o,pri)}</span>`).join('');
    return `<details class="spx-row"><summary>
        <span class="spx-r-no">#${row.j+1}</span>
        <span class="spx-r-name">${row.x.memo?esc(row.x.memo):''}</span>
        ${spChips(row.x)}
        <span class="spx-r-buf">${esc(r.buf.label)}</span>
        <span class="spx-r-num${pri==='bv'?' on':''}">${(r.bv/1e6).toFixed(1)}</span>
        <span class="spx-r-num${pri==='tar'?' on':''}">${r.tar==null?'—':r.tar.toFixed(1)}</span>
      </summary>
      <div class="spx-r-detail">
        <div><small>장신구</small>${esc(r.accN)}${encText(r.enc)}</div>
        <div><small>펜던트</small>${pendText(r.pend)}</div>
        <div><small>젬</small><span class="gem-tags">${fmtGem(r.alloc)}</span></div>
        <div><small>최종 스탯</small><span style="color:var(--hpc)">${num(r.fH)}</span> / <span style="color:var(--atc)">${num(r.fA)}</span> / <span style="color:var(--dfc)">${num(r.fD)}</span></div>
        <div class="spx-r-others"><small>다른 타입 (${pri==='tar'?'TAR':'비밸'})</small>${others}</div>
      </div>
    </details>`;
  }
  function renderResult(){
    if(!last)return;
    const sec=$('spx-res'),empty=$('spx-res-empty');if(!sec)return;
    const blocks=DTYPES.map(dt=>{
      const rows=last.rows.filter(r=>r.best.dt===dt).sort((a,b)=>b.best.score-a.best.score||a.j-b.j);
      if(!rows.length)return '';
      return `<section class="spx-tblock" style="--tc:${DCOLORS[dt]}">
        <div class="spx-thead"><b>${dt}</b><span>${rows.length}개</span></div>
        ${rows.map(rowHtml).join('')}
      </section>`;
    }).join('');
    sec.innerHTML=`<header class="sp-workspace-head"><div><h2>정령 배분 결과</h2>
        <p>${esc(last.grade)} 등급 · ${last.pri==='tar'?'TAR':'비밸'} 기준 · 정령 ${last.rows.length}개 · 줄을 누르면 장비와 스탯이 보여요</p></div></header>
      <div class="spx-cols"><span>정령</span><span>옵션</span><span>버프</span><span>비밸(백만)</span><span>TAR</span></div>
      ${blocks}`;
    sec.hidden=false;if(empty)empty.hidden=true;
    if(typeof switchTab==='function')switchTab('sim');
    sec.scrollIntoView({behavior:'smooth',block:'start'});
  }

  // ── 연결 ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded',()=>{
    ensure();
    const calcRun=window.runSim;
    window.runSim=function(){return S.calcMode==='dist'?run():(typeof calcRun==='function'?calcRun():undefined);};
    document.querySelectorAll('[data-calc-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.calcMode)));
    const list=$('spx-wrap');
    if(list)['click','input'].forEach(t=>list.addEventListener(t,onListEvent));
    const pane=$('setpane');
    if(pane){pane.addEventListener('click',e=>{if(e.target.closest('button')&&e.target.id!=='sim-btn')markDirty();});pane.addEventListener('change',markDirty);}
    setTimeout(renderMode,0); // spirit-simulator.js 초기 상태 문구 이후에 적용
  });
})();
