(function(){
  'use strict';
  function resultSpirit(sp){
    const names={hp:'체력',atk:'공격',def:'방어'},colors={hp:'#fbbf24',atk:'#f87171',def:'#60a5fa'};
    const rows=Array.from({length:4},(_,i)=>{const o=sp?.opts?.[i];const valid=o&&names[o.stat]&&['%','+'].includes(o.type);return '<span style="color:'+(valid?colors[o.stat]:'var(--dim)')+'">'+(i+1)+'옵 · '+(valid?names[o.stat]+' '+fmtSpVal(i+1,o.stat,o.type):'없음')+'</span>';});
    rows.push('<span style="color:'+(colors[sp?.bonus]||'var(--dim)')+'">부가옵 · '+(names[sp?.bonus]?names[sp.bonus]+' +'+SP_BONUS[sp.bonus]:'없음')+'</span>');
    return '<div class="sp-result-spirit" style="grid-column:1/-1"><small>사용 정령</small><div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px">'+rows.join('')+'</div></div>';
  }

  if(!globalThis.DV1_GUILD_READY)return;
  let lastResults=null;
  window.guildPriority='bv';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.guildScore=(r,bv=r.bv)=>guildPriority==='tar'?tarPercent(bv,r.dragon.dtype,r.buff):bv;
  window.guildCompare=(a,b)=>guildScore(b)-guildScore(a)||b.bv-a.bv;
  window.renderResDeck=function(results,excludedCount){
    lastResults={results,excludedCount,priority:guildPriority,dist:document.getElementById('guild-dist')?.value||'even'};
    const avg=results.reduce((s,r)=>s+r.bv,0)/(results.length||1);
    const wcfg=S.settingBuffs?.buff,wMax=typeof weekMaxBV==='function'?weekMaxBV(wcfg):null;
    const wPct=bv=>wMax?100*bv/wMax:null;
    const avgWeek=wMax?wPct(avg):null;
    const cards=results.map((r,i)=>cardHtml(r,i,wMax,wPct)).join('');
    document.getElementById('res-body-avg').innerHTML=`<div class="sp-guild-summary"><div><small>추천 조합</small><strong>${results.length}마리</strong></div><div><small>평균 비밸 · 백만</small><strong>${(avg/1e6).toFixed(1)}</strong></div><div title="이번 주 최대 비밸 ${wMax?(wMax/1e6).toFixed(1):'—'} 대비"><small>평균 · 이번 주 최대 대비</small><strong>${avgWeek===null?'—':avgWeek.toFixed(1)+'%'}</strong></div></div><p class="sp-help">${lastResults.dist==='focus'?(guildPriority==='tar'?'1등 드래곤의 TAR을 최대로 맞춘 뒤 2등·3등 순서로 맞춘 추천입니다.':'1등 드래곤의 비밸을 최대로 맞춘 뒤 2등·3등 순서로 맞춘 추천입니다.'):(guildPriority==='tar'?'세 마리의 TAR 합계를 우선한 추천입니다.':'세 마리의 비밸 합계를 우선한 추천입니다.')} ${excludedCount?'디버프 대상 '+excludedCount+'마리를 제외했습니다.':''} 장신구·펜던트·젬 중복 제한을 적용하며, 더 좋은 조합이 있을 수 있습니다.</p><div class="sp-guild-cards">${cards}</div>`;
  };
  function weekCtx(){
    const wcfg=S.settingBuffs?.buff,wMax=typeof weekMaxBV==='function'?weekMaxBV(wcfg):null;
    return {wMax,wPct:bv=>wMax?100*bv/wMax:null};
  }
  // 예비 정령 카드: 이 정령이 원래 가장 잘 나오는 곳과 이번 주 이 용에 달았을 때 비교
  function rsvOrigin(r,origin){
    const list=r.dragon._rsv&&origin?origin[r.dragon._rsv]:null;
    if(!list||!list.length)return '';
    const max=Math.max(...list.map(o=>o.bv));
    const cells=list.map(o=>`<span class="rsv-type${o.dtype===r.dragon.dtype?' is-cur':''}${o.bv===max?' is-max':''}"><small>${esc(o.dtype)} · ${esc(o.label)}</small><b>${(o.bv/1e6).toFixed(1)}</b></span>`).join('');
    return `<div class="sp-rsv-origin"><div class="rsv-origin-hd"><strong>예비 정령 · ${esc(r.dragon._rsvName)}</strong><span>이번 주 ${esc(dragonDispName(r.dragon))} <b>${(r.bv/1e6).toFixed(1)}</b></span></div><div class="rsv-types">${cells}</div></div>`;
  }
  function cardHtml(r,i,wMax,wPct,origin){
      const acc=ACC_DB.find(a=>a.n===r.accN),tar=typeof tarPercent==='function'?tarPercent(r.bv,r.dragon.dtype,r.buff):null;
      const portrait=getDragonImgUrl(r.dragon.name);
      const identity=`<div class="sp-dragon-identity"><span class="sp-dragon-portrait">${portrait?`<img src="${esc(portrait)}" alt="${esc(dragonDispName(r.dragon))}" onerror="this.hidden=true">`:''}</span><div class="sp-dragon-text"><strong>${esc(dragonDispName(r.dragon))}</strong><span class="sp-dragon-attr">${r.dragon.attr?`<img src="${esc(elIcon(r.dragon.attr))}" alt="" onerror="this.hidden=true">${esc(r.dragon.attr)}`:'속성 미확인'}</span></div></div>`;
      return `<article class="sp-result-card"><header><div class="sp-card-label"><span class="sp-rank">${i+1}</span>${identity}<span class="sp-buff-tag">${esc(r.dragon.dtype)} · ${esc(r.dragon.growth)} ${esc(r.dragon.grade)}</span>${r.dragon._rsv?`<span class="sp-rsv-tag">예비 정령 ${r.dragon._hadSpirit?'교체':'추가'} · ${esc(r.dragon._rsvName)}</span>`:''}</div><div class="sp-metrics"><div class="${guildPriority==='bv'?'is-primary':''}"><small>비밸 · 백만</small><b>${(r.bv/1e6).toFixed(1)}</b></div><div title="이번 주 최대 비밸 ${wMax?(wMax/1e6).toFixed(1):'—'} 대비"><small>이번 주 최대 대비</small><b>${wMax?wPct(r.bv).toFixed(1)+'%':'—'}</b></div></div></header>
      <div class="sp-card-body"><div class="sp-equipment">${acc?.img?`<img src="${esc(acc.img)}" alt="">`:''}<div><small>장신구 / 인챈트</small><strong>${esc(r.accN)}</strong>${fmtAccEnc(r.enc)}</div></div><div><small>젬 배분</small><div class="gem-tags">${fmtGem(r.alloc)}</div></div><div><small>펜던트</small>${fmtPend(r.pend)}</div>${resultSpirit(r.dragon)}<div class="sp-final-stats">${[['체력',r.fH,'hp'],['공격',r.fA,'atk'],['방어',r.fD,'def']].map(([l,n,k])=>`<div class="stat-${k}"><small>${l}</small><strong>${n.toLocaleString('ko-KR')}</strong></div>`).join('')}</div></div>
      <div class="sp-guild-effects">${fmtWeeklyBuff(r.buff,r.debuff)}${fmtWeeklyStats(r)}${rsvOrigin(r,origin)}${origin&&r.dragon._rsv?`<div class="rsv-apply-row"><button type="button" class="btn-white" data-rsv-apply="${i}">이 정령 길드전 셋팅에 적용</button></div>`:''}</div></article>`;
  }
  // 예비 정령 결과를 길드전 셋팅(내 용 정보)에 적용: 그 용의 정령을 예비 정령으로 바꾸고,
  // 원래 달려 있던 정령은 예비 정령 목록으로 옮긴다 (잃어버리지 않게)
  let lastRsv=null;
  function applyReserve(list){
    normalizeDragonCards();normalizeReserves();
    const done=[];let moved=0;
    list.forEach(r=>{
      const d=r.dragon;if(!d._rsv)return;
      const rsvIdx=S.reserveSpirits.findIndex(x=>x.uid===d._rsv);if(rsvIdx<0)return;
      let card=null;
      DRAGON_CATS.some(c=>(S.dragonCards[c]||[]).some((x,i)=>{if(x&&((x.uid&&x.uid===d._dk)||`${c}#${i}`===d._dk)){card=x;return true;}return false;}));
      if(!card)return;
      const rsv=S.reserveSpirits[rsvIdx];
      const old=spiritHasOpt(card)?{uid:newReserveUid(),name:String((card.name||'')+' 기존 정령').slice(0,20),opts:(card.opts||[]).map(o=>({stat:o?.stat||'',type:o?.type||''})),bonus:card.bonus||''}:null;
      card.opts=rsv.opts.map(o=>({...o}));card.bonus=rsv.bonus||'';
      S.reserveSpirits.splice(rsvIdx,1);
      if(old){S.reserveSpirits.push(old);moved++;}
      done.push(dragonDispName(d));
    });
    if(!done.length)return 0;
    renderDragonInfo();if(typeof renderReserveSpirits==='function')renderReserveSpirits();
    doSave();
    try{const k=LS_PRE+'_spec',sp=JSON.parse(localStorage.getItem(k)||'{}');sp.dragonCards=S.dragonCards;localStorage.setItem(k,JSON.stringify(sp));localStorage.setItem(LS_PRE+'_dragon_pending','1');}catch(e){}
    const msg=`${done.join(', ')}에 예비 정령을 적용했어요.`+(moved?` 원래 정령 ${moved}개는 예비 정령으로 옮겼어요.`:'');
    const t=document.createElement('div');
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);max-width:90vw;background:var(--gold);color:#0a0c18;padding:10px 20px;border-radius:8px;font-weight:800;font-size:13px;z-index:9999;transition:opacity .3s;text-align:center';
    t.textContent=msg;document.body.appendChild(t);
    setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),300);},3200);
    return done.length;
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-rsv-apply]');if(!b||!lastRsv)return;
    const v=b.dataset.rsvApply,list=v==='all'?lastRsv:[lastRsv[+v]].filter(Boolean);
    if(!applyReserve(list)){alert('이미 적용했거나 셋팅이 바뀌어서 적용하지 못했어요. 시뮬레이션을 다시 실행해 주세요.');return;}
    const btns=v==='all'?document.querySelectorAll('#res-body-reserve [data-rsv-apply]'):[b];
    btns.forEach(x=>{x.disabled=true;x.textContent='적용됨 ✓';});
  });
  // 예비 정령 결과: 지금 추천(base)과 예비 정령까지 고려한 추천(info.deck)을 비교
  window.renderReserveDeck=function(base,info){
    const el=document.getElementById('res-body-reserve');if(!el)return;
    if(!info.deck){
      el.innerHTML=`<p class="sp-help rsv-none">예비 정령을 달아도 지금 추천보다 오르는 조합이 없어요. (3위 안에 들 수 있는 용 ${info.checked}/${info.total}마리 확인)</p>`;
      return;
    }
    const {wMax,wPct}=weekCtx();
    const avg=d=>d.reduce((s,r)=>s+r.bv,0)/(d.length||1);
    const a0=avg(base)/1e6,a1=avg(info.deck)/1e6,diff=a1-a0;
    const sign=v=>(v>=0?'+':'')+v.toFixed(1);
    const picks=info.deck.filter(r=>r.dragon._rsv).map(r=>`<b>${esc(dragonDispName(r.dragon))}</b> 정령 ${r.dragon._hadSpirit?'교체':'추가'} ← ${esc(r.dragon._rsvName)}`).join(', ');
    let tarLine='';
    if(guildPriority==='tar'&&typeof tarPercent==='function'){
      const t=d=>d.reduce((s,r)=>s+tarPercent(r.bv,r.dragon.dtype,r.buff),0)/(d.length||1);
      const t0=t(base),t1=t(info.deck);
      tarLine=`<div>평균 TAR ${t0.toFixed(1)} → ${t1.toFixed(1)} <b class="rsv-up">${sign(t1-t0)}</b></div>`;
    }
    lastRsv=info.deck;
    el.innerHTML=`<div class="rsv-summary"><div>추천: ${picks}</div><div>평균 비밸 ${a0.toFixed(1)} → ${a1.toFixed(1)} <b class="rsv-up">${sign(diff)} (${sign(a0?100*diff/a0:0)}%)</b></div>${tarLine}<div class="rsv-apply-row"><button type="button" class="btn-gold" data-rsv-apply="all">추천대로 길드전 셋팅에 전부 적용</button></div></div><div class="sp-guild-cards">${info.deck.map((r,i)=>cardHtml(r,i,wMax,wPct,info.origin)).join('')}</div>`;
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const select=document.getElementById('guild-priority');
    if(typeof tarPercent!=='function'){select.querySelector('[value="tar"]').disabled=true;}
    const dist=document.getElementById('guild-dist');
    if(dist){
      try{const v=localStorage.getItem('dv1_guild_dist');if(v==='focus'||v==='even')dist.value=v;}catch(e){}
      dist.onchange=()=>{try{localStorage.setItem('dv1_guild_dist',dist.value);}catch(e){}};
    }
    select.onchange=()=>{
      guildPriority=select.value;
      document.getElementById('guild-priority-note').textContent=lastResults?'추천 기준이 바뀌었습니다. 시뮬레이션을 다시 실행해 주세요.':'비밸은 합계 전투 수치, TAR은 타입별 최고 세팅 대비 완성도를 비교합니다.';
    };
  });
})();
