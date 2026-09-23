(function(){
  'use strict';
  if(!globalThis.DV1_DRAGON_VIEWS)return;
  document.addEventListener('DOMContentLoaded',()=>{
    const host=document.querySelector('main .ti'),grid=host.querySelector('.spec-grid');
    const columns=[...grid.children].filter(el=>el.classList.contains('spec-col'));
    if(columns.length!==3)return;
    const entries=[['base','기본 스펙'],['accessories','장신구'],['pendants','펜던트'],['dragons','드래곤'],['transfer','가져오기·내보내기']];
    const nav=document.createElement('div');nav.className='my-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','내 스펙 항목');
    const panels=new Map();
    for(const [id,label] of entries){
      const button=document.createElement('button');button.type='button';button.id='my-tab-'+id;button.dataset.panel=id;button.textContent=label;button.setAttribute('role','tab');button.setAttribute('aria-controls','my-panel-'+id);nav.append(button);
      const panel=document.createElement('section');panel.id='my-panel-'+id;panel.className='my-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);panel.hidden=true;panels.set(id,panel);
    }
    host.querySelector('.preset-bar').after(nav);
    for(const panel of panels.values())host.append(panel);
    panels.get('base').append(host.querySelector('.calc-shortcut'),columns[0]);
    panels.get('accessories').append(columns[1]);
    panels.get('pendants').append(columns[2]);
    panels.get('dragons').append(document.getElementById('dragon-section').closest('.toggle-sec'));
    panels.get('accessories').append(document.getElementById('acc-section').closest('.toggle-sec'));
    panels.get('transfer').append(host.querySelector('.io-wrap'));
    grid.remove();
    function select(id,update=true){
      if(!panels.has(id))id='base';
      for(const [key,panel] of panels)panel.hidden=key!==id;
      nav.querySelectorAll('button').forEach(b=>{const active=b.dataset.panel===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
      if(update)history.replaceState(null,'','#'+id);
    }
    nav.onclick=e=>{const b=e.target.closest('button');if(b)select(b.dataset.panel);};
    nav.onkeydown=e=>{
      const buttons=[...nav.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(index<0)return;
      const next=e.key==='ArrowRight'?(index+1)%buttons.length:e.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:e.key==='Home'?0:e.key==='End'?buttons.length-1:-1;
      if(next>=0){e.preventDefault();buttons[next].focus();select(buttons[next].dataset.panel);}
    };
    window.addEventListener('hashchange',()=>select(location.hash.slice(1),false));select(location.hash.slice(1),false);
  });
})();
