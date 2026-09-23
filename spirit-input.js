/* Shared champion-style input. Uses the calculators' existing save handlers. */
window.SpiritInput={
  mode:'buttons',
  setMode(mode){
    this.mode=mode==='legacy'?'legacy':'buttons';
    document.documentElement.dataset.spiritInput=this.mode;
    try{localStorage.setItem('spirit-input-mode',this.mode);}catch(_){}
    document.querySelectorAll('[data-spirit-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spiritMode===this.mode)));
  },
  toggle(){return `<div class="spirit-mode" role="group" aria-label="정령 입력 방식">${[['legacy','기존 방식'],['buttons','버튼 방식']].map(([mode,label])=>`<button type="button" data-spirit-mode="${mode}" aria-pressed="${this.mode===mode}" onclick="SpiritInput.setMode('${mode}')">${label}</button>`).join('')}</div>`;},
  options(sp,handler,args,format){
    const prefix=args.length?args.map(x=>JSON.stringify(x)).join(',')+',':'';
    const buttons=sp.opts.map((o,i)=>{
      const type=o.type==='%'||o.type==='+'?o.type:(i===3?'+':'%');
      const call=(field,value)=>`${handler}(${prefix}${i},'${field}','${value}')`.replace(/"/g,'&quot;');
      return `<div class="champ-sp-row" data-stat="${o.stat}"><span>${i+1}옵</span>${['hp','atk','def'].map((s,j)=>`<button type="button" aria-pressed="${o.stat===s}" class="champ-chip ${o.stat===s?'on-'+s:''}" onclick="${!o.type?call('type',type)+';':''}${call('stat',o.stat===s?'':s)}">${['체','공','방'][j]}</button>`).join('')}<button type="button" class="champ-chip champ-type" aria-label="${i+1}옵 비율 또는 고정값 전환" onclick="${call('type',type==='%'?'+':'%')}">${type}</button><span class="champ-value">${format(i+1,o.stat,o.type)}</span></div>`;
    }).join('');
    const legacy=sp.opts.map((o,i)=>{
      const change=field=>`${handler}(${prefix}${i},'${field}',this.value)`.replace(/"/g,'&quot;');
      const select=(field,options)=>`<select aria-label="${i+1}옵 ${field==='stat'?'스탯':'종류'}" onchange="${change(field)}">${options.map(([value,label])=>`<option value="${value}" ${o[field]===value?'selected':''}>${label}</option>`).join('')}</select>`;
      return `<div class="legacy-sp-row" data-stat="${o.stat}"><span>${i+1}옵</span>${select('stat',[['','-'],['hp','체력'],['atk','공격'],['def','방어']])}${select('type',[['','-'],['+','+스탯'],['%','%스탯']])}<span class="champ-value">${format(i+1,o.stat,o.type)}</span></div>`;
    }).join('');
    return this.toggle()+`<div class="spirit-buttons spirit-option-grid">${buttons}</div><div class="spirit-legacy spirit-option-grid">${legacy}</div>`;
  },
  bonus(sp,handler,args){
    const prefix=args.length?args.map(x=>JSON.stringify(x)).join(',')+',':'';
    const change=`${handler}(${prefix}this.value)`.replace(/"/g,'&quot;');
    return `<div class="spirit-legacy legacy-sp-row spirit-bonus" data-stat="${sp.bonus}"><span>부가옵</span><select aria-label="부가옵" onchange="${change}">${[['','없음'],['hp','체력 (+40)'],['atk','공격 (+10)'],['def','방어 (+10)']].map(([v,l])=>`<option value="${v}" ${sp.bonus===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="spirit-buttons champ-sp-row spirit-bonus" data-stat="${sp.bonus}"><span>부가옵</span>${['hp','atk','def'].map((s,i)=>`<button type="button" aria-pressed="${sp.bonus===s}" class="champ-chip ${sp.bonus===s?'on-'+s:''}" onclick="${`${handler}(${prefix}'${sp.bonus===s?'':s}')`.replace(/"/g,'&quot;')}">${['체','공','방'][i]}</button>`).join('')}<span class="champ-value">${sp.bonus?'+'+(sp.bonus==='hp'?40:10):''}</span></div>`;
  }
};
try{SpiritInput.setMode(localStorage.getItem('spirit-input-mode'));}catch(_){SpiritInput.setMode('buttons');}
window.CalcProgress={
  // Yield only when a display update is due; avoid nested timer clamping.
  yield(){
    if(globalThis.scheduler?.yield)return globalThis.scheduler.yield();
    return new Promise(resolve=>{const ch=new MessageChannel();ch.port1.onmessage=()=>{ch.port1.close();ch.port2.close();resolve();};ch.port2.postMessage(null);});
  },
  start(){
    let box=document.getElementById('calc-progress');
    if(!box){box=document.createElement('div');box.id='calc-progress';box.innerHTML='<progress max="100" value="0" aria-label="계산 진행률"></progress><span role="status" aria-live="polite"></span>';document.getElementById('sim-btn').after(box);}
    box.hidden=false;this.update(0,'계산 준비');
    this.controls=Array.from(document.querySelectorAll('button,input,select,textarea')).map(el=>[el,el.disabled]);
    this.controls.forEach(([el])=>el.disabled=true);
  },
  update(percent,stage){
    const box=document.getElementById('calc-progress');if(!box)return;
    const p=Math.max(0,Math.min(100,Math.floor(percent)));
    box.querySelector('progress').value=p;box.querySelector('span').textContent=`${stage} · ${p}%`;
    document.getElementById('sim-btn').textContent=`계산 중 ${p}%`;
  },
  finish(ok){
    if(ok)this.update(100,'계산 완료');
    else{const box=document.getElementById('calc-progress');if(box)box.querySelector('span').textContent='계산 중단 — 입력값을 확인해 주세요.';}
    (this.controls||[]).forEach(([el,disabled])=>el.disabled=disabled);this.controls=[];
    const btn=document.getElementById('sim-btn');btn.disabled=false;btn.textContent='계산 실행';
  }
};
