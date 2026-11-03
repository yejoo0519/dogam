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
    const cards=results.map((r,i)=>{
      const acc=ACC_DB.find(a=>a.n===r.accN),tar=typeof tarPercent==='function'?tarPercent(r.bv,r.dragon.dtype,r.buff):null;
      const portrait=getDragonImgUrl(r.dragon.name);
      const identity=`<div class="sp-dragon-identity"><span class="sp-dragon-portrait">${portrait?`<img src="${esc(portrait)}" alt="${esc(r.dragon.name)}" onerror="this.hidden=true">`:''}</span><div class="sp-dragon-text"><strong>${esc(r.dragon.name)}</strong><span class="sp-dragon-attr">${r.dragon.attr?`<img src="${esc(elIcon(r.dragon.attr))}" alt="" onerror="this.hidden=true">${esc(r.dragon.attr)}`:'속성 미확인'}</span></div></div>`;
      return `<article class="sp-result-card"><header><div class="sp-card-label"><span class="sp-rank">${i+1}</span>${identity}<span class="sp-buff-tag">${esc(r.dragon.dtype)} · ${esc(r.dragon.growth)} ${esc(r.dragon.grade)}</span></div><div class="sp-metrics"><div class="${guildPriority==='bv'?'is-primary':''}"><small>비밸 · 백만</small><b>${(r.bv/1e6).toFixed(1)}</b></div><div title="이번 주 최대 비밸 ${wMax?(wMax/1e6).toFixed(1):'—'} 대비"><small>이번 주 최대 대비</small><b>${wMax?wPct(r.bv).toFixed(1)+'%':'—'}</b></div></div></header>
      <div class="sp-card-body"><div class="sp-equipment">${acc?.img?`<img src="${esc(acc.img)}" alt="">`:''}<div><small>장신구 / 인챈트</small><strong>${esc(r.accN)}</strong>${fmtAccEnc(r.enc)}</div></div><div><small>젬 배분</small><div class="gem-tags">${fmtGem(r.alloc)}</div></div><div><small>펜던트</small>${fmtPend(r.pend)}</div>${resultSpirit(r.dragon)}<div class="sp-final-stats">${[['체력',r.fH,'hp'],['공격',r.fA,'atk'],['방어',r.fD,'def']].map(([l,n,k])=>`<div class="stat-${k}"><small>${l}</small><strong>${n.toLocaleString('ko-KR')}</strong></div>`).join('')}</div></div>
      <div class="sp-guild-effects">${fmtWeeklyBuff(r.buff,r.debuff)}${fmtWeeklyStats(r)}${fmtWeeklyDetails(r)}</div></article>`;
    }).join('');
    document.getElementById('res-body-avg').innerHTML=`<div class="sp-guild-summary"><div><small>추천 조합</small><strong>${results.length}마리</strong></div><div><small>평균 비밸 · 백만</small><strong>${(avg/1e6).toFixed(1)}</strong></div><div title="이번 주 최대 비밸 ${wMax?(wMax/1e6).toFixed(1):'—'} 대비"><small>평균 · 이번 주 최대 대비</small><strong>${avgWeek===null?'—':avgWeek.toFixed(1)+'%'}</strong></div></div><p class="sp-help">${lastResults.dist==='focus'?(guildPriority==='tar'?'1등 드래곤의 TAR을 최대로 맞춘 뒤 2등·3등 순서로 맞춘 추천입니다.':'1등 드래곤의 비밸을 최대로 맞춘 뒤 2등·3등 순서로 맞춘 추천입니다.'):(guildPriority==='tar'?'세 마리의 TAR 합계를 우선한 추천입니다.':'세 마리의 비밸 합계를 우선한 추천입니다.')} ${excludedCount?'디버프 대상 '+excludedCount+'마리를 제외했습니다.':''} 장신구·펜던트·젬 중복 제한을 적용하며, 더 좋은 조합이 있을 수 있습니다.</p><div class="sp-guild-cards">${cards}</div>`;
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
