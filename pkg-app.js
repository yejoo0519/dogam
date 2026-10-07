(function(){
  'use strict';
  const $=id=>document.getElementById(id), H=window.PackageHistory;
  const state={tab:'history',filter:'all',query:'',sort:'recent',page:1};
  const PAGE_SIZE=20;
  let source,records=[],lastFocus;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pretty=value=>value?value.replaceAll('-','.'):'—';
  const clean=value=>value.replace(/\s+/g,'').toLowerCase();
  const official=id=>'https://www.dragonvillage.net/notice/'+Number(id);
  const link=(n,label)=>`<a class="pkg-link" href="${official(n.id)}" target="_blank" rel="noopener noreferrer">${escape(label||n.title)} ↗</a>`;
  function status(d){
    if(d.active) return '<span class="pkg-badge gold">판매 중</span>';
    if(d.next) return '<span class="pkg-badge gold">판매 예정</span>';
    if(d.elapsed>=1095) return '<span class="pkg-badge">장기 미판매</span>';
    if(d.count<2) return '<span class="pkg-badge">1회 확인</span>';
    return '<span class="pkg-badge">복각 기록</span>';
  }
  function estimate(d){
    if(d.next) return `<span class="pkg-mono">${pretty(d.next.start)}</span><div class="pkg-cell-sub">공식 판매 예정</div>`;
    if(!d.estimate) return '<span class="pkg-muted">산정 불가</span>';
    const label=d.daysLeft<0?`${Math.abs(d.daysLeft)}일 경과`:d.daysLeft===0?'오늘 · 추정':`D-${d.daysLeft} · 추정`;
    return `<span class="pkg-mono">${pretty(d.estimate)}</span><div class="pkg-cell-sub">${label}</div>`;
  }
  function avatar(d){
    const dragon=window.DV1_DRAGONS?.getById(d.id);
    const stage=dragon?.stages.advent?8:dragon?.stages.transcendence?7:4;
    return `<img class="pkg-avatar" src="./dragon/${d.id}/profile/${stage}.png" alt="" loading="lazy">`;
  }
  function renderStats(){
    const sales=records.reduce((sum,d)=>sum+d.count,0),repeated=records.filter(d=>d.count>=2).length;
    $('stats').innerHTML=[['확인한 드래곤',records.length,'종'],['판매 회차',sales,'회'],['복각 기록',repeated,'종'],['관련 공지',source.notices.length,'건']].map(([label,value,unit])=>`<div class="pkg-stat"><p class="pkg-stat-label">${label}</p><p class="pkg-stat-value">${value.toLocaleString('ko-KR')}<small>${unit}</small></p></div>`).join('');
    const today=H.todayKST();
    const current=source.notices.flatMap(n=>(n.periods||[]).filter(p=>p.end>=today && H.day(p.start)-H.day(today)<=30).map(p=>({notice:n,...p}))).slice(0,5);
    $('currentSales').hidden=!current.length;
    $('currentSales').innerHTML='<h2>공식 공지에 안내된 판매 일정</h2>'+current.map(p=>`<a href="${official(p.notice.id)}" target="_blank" rel="noopener noreferrer" title="${escape(p.notice.title)}"><div>${escape(p.label||p.notice.title)} ↗</div><span>${pretty(p.start)} — ${pretty(p.end)} · ${p.start>today?'판매 예정':'판매 중'}</span></a>`).join('');
  }
  function filteredRecords(){
    const q=clean(state.query);
    const result=records.filter(d=>(!q||clean(d.name).includes(q))&&(state.filter==='all'||(state.filter==='repeat'?d.count>=2:d.count<2)));
    const cmp={recent:(a,b)=>(b.recent||'').localeCompare(a.recent||''),name:(a,b)=>a.name.localeCompare(b.name,'ko'),count:(a,b)=>b.count-a.count,estimate:(a,b)=>(a.next?.start||a.estimate||'9999').localeCompare(b.next?.start||b.estimate||'9999')};
    return result.sort((a,b)=>cmp[state.sort](a,b)||a.name.localeCompare(b.name,'ko'));
  }
  function renderHistory(){
    const list=filteredRecords();
    $('resultCount').textContent=`${list.length}종`;
    if(!list.length){$('results').innerHTML='<div class="pkg-empty">검색 조건에 맞는 드래곤이 없습니다.</div>';return;}
    $('results').innerHTML=`<div class="pkg-table-scroll"><table class="pkg-table"><thead><tr><th scope="col">드래곤 / 상태</th><th scope="col">판매 회차</th><th scope="col" class="pkg-first">첫 판매</th><th scope="col">최근 판매</th><th scope="col">중앙값 간격</th><th scope="col">예상 복각일</th><th scope="col">근거</th></tr></thead><tbody>${list.map(d=>{
      const recent=d.sales.filter(s=>s.start<=H.todayKST()).at(-1)||d.sales[0];
      const dots=Math.min(d.count,8);
      return `<tr><td><button class="pkg-name" data-detail="${d.id}" aria-label="${escape(d.name)} 판매 이력 보기">${avatar(d)}<span>${escape(d.name)}<div class="pkg-cell-sub">${status(d)}</div></span></button></td><td><span class="pkg-mono">${d.count}회</span><div class="pkg-history-line" aria-hidden="true">${Array.from({length:dots},(_,i)=>(i?'<i></i>':'')+'<span></span>').join('')}</div></td><td class="pkg-first pkg-mono">${pretty(d.first)}</td><td class="pkg-mono">${pretty(d.recent)}</td><td><span class="pkg-mono">${d.cycle?Math.round(d.cycle)+'일':'—'}</span><div class="pkg-cell-sub">${d.lastInterval?'최근 간격 '+d.lastInterval+'일':'간격 자료 없음'}</div></td><td>${estimate(d)}</td><td>${link(recent.notices[0],'공지')}<br><button class="pkg-text-button" data-detail="${d.id}">이력 보기</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function renderNotices(){
    const q=clean(state.query),list=source.notices.filter(n=>!q||clean(n.title+' '+n.events.map(e=>e.name).join(' ')).includes(q));
    const totalPages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
    state.page=Math.min(state.page,totalPages);
    $('resultCount').textContent=`${list.length}건`;
    $('results').innerHTML=list.length?list.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE).map(n=>{
      const names=[...new Set(n.events.map(e=>e.name))];
      const meta=names.length?'판매 기록: '+names.join(' · '):n.periods?.length?'판매 기간 안내 · 구성은 원문에서 확인':'상품·이벤트·운영 관련 안내';
      return `<article class="pkg-notice"><time class="pkg-mono pkg-notice-date" datetime="${n.date}">${pretty(n.date)}</time><div><a class="pkg-notice-title" href="${official(n.id)}" target="_blank" rel="noopener noreferrer">${escape(n.title)}</a><p class="pkg-notice-meta">${escape(meta)}</p></div><a class="pkg-link" href="${official(n.id)}" target="_blank" rel="noopener noreferrer">원문 ↗</a></article>`;
    }).join(''):'<div class="pkg-empty">검색 조건에 맞는 공지가 없습니다.</div>';
    $('pagination').hidden=!list.length;
    $('pagination').innerHTML=`<button data-page="${state.page-1}" ${state.page===1?'disabled':''}>이전</button><span class="pkg-mono">${state.page} / ${totalPages}</span><button data-page="${state.page+1}" ${state.page===totalPages?'disabled':''}>다음</button>`;
  }
  function render(){
    if(!source)return;
    $('historyFilters').hidden=state.tab!=='history';$('sortLabel').hidden=state.tab!=='history';$('pagination').hidden=true;
    $('results').setAttribute('aria-labelledby',state.tab==='history'?'historyTab':'noticesTab');
    if(state.tab==='history')renderHistory();else renderNotices();
  }
  function openDetail(id){
    const d=records.find(d=>d.id===Number(id));if(!d)return;
    lastFocus=document.activeElement;
    const prediction=d.next?`공식 판매 시작 <strong>${pretty(d.next.start)}</strong>`:d.estimate?`예상 복각일 <strong>${pretty(d.estimate)}</strong> · ${d.daysLeft<0?'예상일 경과':'통계적 추정'}<br>최근 판매일 + 판매 간격 중앙값. 실제 일정은 공식 공지에서 확인해 주세요.`:'판매 간격을 산정할 자료가 부족하거나, 장기간 판매가 확인되지 않아 예상일을 표시하지 않습니다.';
    $('detailBody').innerHTML=`<header class="pkg-detail-head"><div><p class="pkg-eyebrow">PACKAGE HISTORY</p><h2 id="detailTitle">${escape(d.name)}</h2></div><button data-close>닫기</button></header><div class="pkg-detail-content"><dl class="pkg-detail-facts"><div><dt>확인한 회차</dt><dd>${d.count}회</dd></div><div><dt>중앙값 간격</dt><dd>${d.cycle?Math.round(d.cycle)+'일':'—'}</dd></div><div><dt>최근 간격</dt><dd>${d.lastInterval?d.lastInterval+'일':'—'}</dd></div></dl><div class="pkg-estimate-box">${prediction}</div><ol class="pkg-timeline">${d.sales.map((s,i)=>`<li><h3>${pretty(s.start)} <span class="pkg-badge">${i+1}회차${s.start>H.todayKST()?' · 예정':''}</span></h3><p>판매 기간 ${pretty(s.start)} — ${pretty(s.end)}${i?'<br>직전 판매와 '+(H.day(s.start)-H.day(d.sales[i-1].start))+'일 간격':''}${s.price!=null?'<br>확인된 가격 '+s.price.toLocaleString('ko-KR')+'원':''}${s.evidence?'<br>'+escape(s.evidence):''}</p>${s.notices.map(n=>link(n)).join('')}</li>`).join('')}</ol><a class="pkg-link pkg-detail-dex" href="./dex.html">드래곤 도감 보기 ↗</a></div>`;
    $('detail').showModal();
  }
  $('detail').addEventListener('click',e=>{
    if(e.target.closest('[data-close]'))$('detail').close();
    else if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}
  });
  $('detail').addEventListener('close',()=>lastFocus?.focus());
  document.addEventListener('click',e=>{
    const detail=e.target.closest('[data-detail]');if(detail)openDetail(detail.dataset.detail);
    const tab=e.target.closest('[data-tab]');
    if(tab){state.tab=tab.dataset.tab;state.page=1;document.querySelectorAll('[data-tab]').forEach(b=>{const selected=b===tab;b.classList.toggle('on',selected);b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1;});render();}
    const filter=e.target.closest('[data-filter]');
    if(filter){state.filter=filter.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('on',b===filter);b.setAttribute('aria-pressed',b===filter);});render();}
    const page=e.target.closest('[data-page]');if(page&&!page.disabled){state.page=Number(page.dataset.page);render();$('results').scrollIntoView({block:'start',behavior:'auto'});}
  });
  document.querySelector('.pkg-tabs').addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')];const other=tabs.find(b=>b!==document.activeElement);other?.click();other?.focus();}
  });
  $('query').addEventListener('input',e=>{state.query=e.target.value;state.page=1;render();});
  $('sort').addEventListener('change',e=>{state.sort=e.target.value;render();});
  document.addEventListener('error',e=>{if(e.target.matches?.('.pkg-avatar'))e.target.hidden=true;},true);
  async function init(){
    try{
      const response=await fetch('./data/pkg-notices.json',{cache:'no-cache'});
      if(!response.ok)throw Error('HTTP '+response.status);
      source=await response.json();
      if(source.schemaVersion!==1||!Array.isArray(source.notices)||!source.notices.every(n=>Number.isInteger(n.id)&&Array.isArray(n.events)))throw Error('지원하지 않는 데이터 형식');
      records=H.build(source);
      $('syncStatus').textContent=`공식 공지 ${source.scannedCount.toLocaleString('ko-KR')}건 확인 · 마지막 확인 ${pretty(source.checkedAt)} · 한국 시간 기준`;
      renderStats();render();
    }catch(error){
      source=null;$('syncStatus').classList.add('error');$('syncStatus').textContent='판매 기록을 불러오지 못했습니다. 새로고침하거나 공식 공지를 확인해 주세요.';
      $('results').innerHTML='<div class="pkg-empty">기록 로딩에 실패했습니다. <a class="pkg-link" href="https://www.dragonvillage.net/notice" target="_blank" rel="noopener noreferrer">공식 공지 보기 ↗</a></div>';
      console.error('Package history:',error);
    }
  }
  init();
})();
