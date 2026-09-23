(function(){
  'use strict';
  if(!globalThis.DV1_DRAGON_VIEWS)return;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function counts(){
    const enc=document.getElementById('quick-acc-enc').value;
    document.querySelectorAll('[data-quick-acc]').forEach(b=>{
      const a=ACC_DB[Number(b.dataset.quickAcc)];
      b.querySelector('small').textContent='보유 '+S.accCards.filter(c=>c.name===a.n&&(c.enchant||'none')===enc).length+'개 · 누르면 +1';
    });
  }
  function render(){
    const target=document.getElementById('quick-acc-list');if(!target)return;
    const lv=Number(document.getElementById('quick-acc-level').value),q=document.getElementById('quick-acc-search').value.replace(/\s/g,'').toLowerCase();
    const statOnly=document.getElementById('chk-stat-only').checked;
    target.innerHTML=ACC_DB.map((a,i)=>({a,i})).filter(({a})=>getAccNum(a.n)===lv&&(!statOnly||!a.n.startsWith('빛뿔'))&&a.n.replace(/\s/g,'').toLowerCase().includes(q)).map(({a,i})=>`<button type="button" class="quick-acc-item" data-quick-acc="${i}">${a.img?`<img src="${esc(a.img)}" alt="" onerror="this.hidden=true">`:''}<span>${esc(a.n)}<small></small></span></button>`).join('')||'<p>일치하는 장신구가 없습니다.</p>';
    counts();
  }
  const originalRender=renderAcc;
  window.renderAcc=function(){originalRender();render();};
  let pendantChoices=[];
  const statColors={hp:'#fbbf24',atk:'#f87171',def:'#60a5fa'};
  function coloredPendant(p){
    const slots=p.type==='태양'?3:p.type==='달'?2:1;
    return p.options.slice(0,slots).map(o=>`<span style="color:${statColors[o.stat]||'inherit'};font-weight:700;white-space:nowrap">${esc(SK[o.stat]||'?')}${esc(o.val||0)}%</span>`).join('<span style="color:var(--dim)"> / </span>');
  }
  function pendantCounts(){
    S.pendants.forEach((p,i)=>{const el=document.getElementById('pend-summ-'+i);if(el)el.innerHTML='('+coloredPendant(p)+')';});
    const signature=p=>p.type+'|'+p.options.map(o=>o.stat+':'+o.val).sort().join('|');
    document.querySelectorAll('[data-quick-pend]').forEach(b=>{
      const p=pendantChoices[Number(b.dataset.quickPend)];
      b.querySelector('small').textContent='보유 '+S.pendants.filter(x=>signature(x)===signature(p)).length+'개 · 누르면 +1';
    });
  }
  function renderPendantChoices(){
    const target=document.getElementById('quick-pend-list');if(!target)return;
    const type=document.getElementById('quick-pend-type').value;
    const val=Number(document.getElementById('quick-pend-value').value),slots=type==='태양'?3:type==='달'?2:1;
    const keys=['hp','atk','def'];pendantChoices=[];
    function make(options,start){
      if(options.length===slots){pendantChoices.push({type,options});return;}
      for(let i=start;i<3;i++)make([...options,{stat:keys[i],val}],i);
    }
    make([],0);
    target.innerHTML=pendantChoices.map((p,i)=>`<button type="button" class="quick-acc-item" data-quick-pend="${i}"><img src="${esc(IMG_PEND[type])}" alt="" onerror="this.hidden=true"><span>${coloredPendant(p)}<small></small></span></button>`).join('');
    pendantCounts();
  }
  const originalPendants=renderPends,originalSummary=updatePendSummary;
  window.renderPends=function(){originalPendants();renderPendantChoices();};
  window.updatePendSummary=function(i){originalSummary(i);pendantCounts();};
  window.addSunPendantSet=function(){
    const keys=['hp','atk','def'],set=[];
    for(let a=0;a<3;a++)for(let b=a;b<3;b++)for(let c=b;c<3;c++)set.push({type:'태양',options:[a,b,c].map(i=>({stat:keys[i],val:6}))});
    S.pendants.unshift(...set);renderPends();qSave();
    document.getElementById('pend-add-status').textContent='태펜 세트 10종을 추가했습니다. 각 옵션은 6%입니다.';
  };
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('quick-acc-list').onclick=e=>{
      const button=e.target.closest('[data-quick-acc]');if(!button)return;
      const a=ACC_DB[Number(button.dataset.quickAcc)];if(!a)return;
      S.accCards.unshift({name:a.n,enchant:document.getElementById('quick-acc-enc').value});originalRender();counts();qSave();
      document.getElementById('quick-acc-status').textContent=a.n+' 1개 추가';
    };
    document.getElementById('quick-acc-level').onchange=render;
    document.getElementById('quick-acc-search').oninput=render;
    document.getElementById('quick-acc-enc').onchange=counts;
    document.getElementById('quick-pend-type').onchange=renderPendantChoices;
    document.getElementById('quick-pend-value').onchange=renderPendantChoices;
    document.getElementById('quick-pend-list').onclick=e=>{
      const button=e.target.closest('[data-quick-pend]');if(!button)return;
      const p=pendantChoices[Number(button.dataset.quickPend)];if(!p)return;
      S.pendants.unshift({type:p.type,options:p.options.map(o=>({...o}))});originalPendants();pendantCounts();qSave();
      document.getElementById('quick-pend-status').textContent=p.type+' 펜던트 '+getPendSummary(p)+' 1개 추가';
    };
    renderPendantChoices();
    render();
  });
})();
