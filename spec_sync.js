/* =================================================================
 * spec_sync.js — 계산기 공통: 드래곤 자동저장 / 드래곤 셋팅 충돌 선택 / 스펙 새로고침
 * 사용 페이지: pvp.html, noob.html, calculator.html (+ en/)
 * 페이지 전역(S, doSave, init, renderDragonInfo 등)에 의존. 페이지 스크립트 뒤에 로드.
 * ================================================================= */
(function(){
  'use strict';
  var IS_EN=/\/en\//.test(location.pathname);
  var PRE=IS_EN?'dv1simEN':'dv1sim';
  var PAGE=(location.pathname.split('/').pop()||'').replace(/\.[^.]+$/,'');
  var HAS_DRAGONS=(PAGE==='pvp'||PAGE==='noob');
  if(!HAS_DRAGONS&&PAGE!=='calculator')return;

  var K={
    spec:PRE+'_spec', presets:PRE+'_spec_presets', pending:PRE+'_dragon_pending',
    pvp:PRE+'_pvp', noob:PRE+'_noob', calc:PRE+'_calculator',
    synced:PRE+'_dragon_sync_v1', backup:PRE+'_bak_dragons_v1'
  };
  var CATS=['땅','물','불','바람','빛','어둠','황혼','여명','악몽'];
  var PRESET_MAX=10;

  var TX=IS_EN?{
    auto_on:'Auto-save on', saving:'Saving…', saved:'✓ Auto-saved', fail:'⚠ Cloud save failed (saved on this device)',
    paused:'Auto-save paused', refresh:'🔄 Refresh spec', refreshed:'Spec refreshed from cloud!',
    refresh_fail:'Could not load spec from cloud.', refresh_confirm:'Unsaved changes are still uploading. Refresh anyway?',
    no_cloud:'No spec saved in the cloud yet.',
    m_title:'Dragon settings don\'t match', m_desc:'The dragons saved in each calculator are different. Pick the one to use — the others will be replaced.\nTo keep another one, save it as a new preset first.',
    src_spec:'My Spec', src_pvp:'Guild War', src_noob:'Newbie',
    use:'Use this setting', save_preset:'Save as new preset', later:'Later',
    count:function(n){return n+' dragons';}, saved_as:function(n){return '✓ Saved as "'+n+'"';},
    preset_name:'Preset name', preset_default:function(src){return src+' dragons';},
    preset_full:'Presets are full (max 10).', preset_done:'Saved as a new preset!',
    use_confirm:function(src){return 'Replace the dragon settings of all calculators with ['+src+']?';},
    used:'Dragon settings unified!', empty:'No dragons', grade:'Grade', growth:'Awakening', type:'Type', bonus:'Bonus',
    opt:function(i){return 'Opt '+i;}, bonus_lbl:{hp:'HP (+40)',atk:'ATK (+10)',def:'DEF (+10)'},
    fail_save:'Save failed: ', login_note:'Not logged in — saved on this device only.'
  }:{
    auto_on:'자동 저장 켜짐', saving:'저장 중…', saved:'✓ 자동 저장됨', fail:'⚠ 클라우드 저장 실패 (이 기기에는 저장됨)',
    paused:'자동 저장 대기 중', refresh:'🔄 스펙 새로고침', refreshed:'클라우드에서 스펙을 새로 불러왔어요!',
    refresh_fail:'클라우드에서 스펙을 불러오지 못했어요.', refresh_confirm:'아직 올라가는 중인 수정사항이 있어요. 그래도 새로고침할까요?',
    no_cloud:'클라우드에 저장된 스펙이 없어요.',
    m_title:'드래곤 셋팅이 서로 달라요', m_desc:'계산기마다 저장된 드래곤이 달라요. 사용할 셋팅을 고르면 나머지는 이걸로 바뀌어요.\n다른 셋팅도 남기고 싶으면 먼저 새 프리셋으로 저장해주세요.',
    src_spec:'내 스펙', src_pvp:'길드전', src_noob:'뉴비',
    use:'이 셋팅으로 사용', save_preset:'새 프리셋으로 저장', later:'나중에',
    count:function(n){return n+'마리';}, saved_as:function(n){return '✓ "'+n+'" 프리셋으로 저장됨';},
    preset_name:'프리셋 이름', preset_default:function(src){return src+' 드래곤';},
    preset_full:'프리셋이 가득 찼어요 (최대 10개).', preset_done:'새 프리셋으로 저장했어요!',
    use_confirm:function(src){return '모든 계산기의 드래곤 셋팅을 ['+src+'] 기준으로 바꿀까요?';},
    used:'드래곤 셋팅을 통일했어요!', empty:'드래곤 없음', grade:'등급', growth:'강림 단계', type:'타입', bonus:'부가옵',
    opt:function(i){return i+'옵';}, bonus_lbl:{hp:'체력 (+40)',atk:'공격 (+10)',def:'방어 (+10)'},
    fail_save:'저장 실패: ', login_note:'로그인하지 않아 이 기기에만 저장돼요.'
  };

  // ---------------------------------------------------------------- utils
  function rd(k){try{var r=localStorage.getItem(k);return r?JSON.parse(r):null;}catch(e){return null;}}
  function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function clone(o){return JSON.parse(JSON.stringify(o));}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function user(){try{return (typeof getUser==='function')?getUser():null;}catch(e){return null;}}
  function canCloud(){return !!user()&&typeof supabase==='function';}
  function emptyDragons(){var o={};CATS.forEach(function(c){o[c]=[];});return o;}
  function mkSpecData(dc){
    return {accCards:[],gems:{hp:{37:0,38:0,39:0,40:0},atk:{37:0,38:0,39:0,40:0},def:{37:0,38:0,39:0,40:0}},
      pendants:[],coll:{hp:0,atk:0,def:0},dragonCards:dc||emptyDragons()};
  }
  function catLabel(c){try{return (IS_EN&&typeof CAT_LBL!=='undefined'&&CAT_LBL[c])||c;}catch(e){return c;}}
  function toast(msg){
    var el=document.getElementById('_spec-sync-toast');
    if(!el){el=document.createElement('div');el.id='_spec-sync-toast';
      el.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--gold);color:#0a0c18;padding:10px 24px;border-radius:8px;font-weight:800;font-size:14px;z-index:10001;opacity:0;transition:opacity .3s;pointer-events:none;max-width:90vw;text-align:center';
      document.body.appendChild(el);}
    el.textContent=msg;el.style.opacity='1';
    clearTimeout(el._t);el._t=setTimeout(function(){el.style.opacity='0';},2500);
  }

  // 드래곤 비교용 정규화 (카드 순서·uid 무시, 강림/진각의 페이지별 등급 표기 차이 무시)
  function canonCard(c){
    var growth=c.growth||'강림(축복)';
    var grade=(growth==='강림'||growth==='진각')?growth:(c.grade||'9.0');
    var opts=(c.opts||[]).slice(0,4).map(function(o){return (o&&o.stat||'')+'/'+(o&&o.type||'');});
    while(opts.length<4)opts.push('/');
    return [c.name||'',c.dtype||'',growth,grade,opts.join(','),c.bonus||'',c.dupe?1:0].join('|');
  }
  function canon(dc){
    dc=dc||{};
    return CATS.map(function(cat){
      return cat+':'+(Array.isArray(dc[cat])?dc[cat]:[]).filter(function(c){return c&&c.name;}).map(canonCard).sort().join(';');
    }).join('#');
  }
  function countDr(dc){
    var n=0;dc=dc||{};
    CATS.forEach(function(c){(Array.isArray(dc[c])?dc[c]:[]).forEach(function(x){if(x&&x.name)n++;});});
    return n;
  }
  function hasDr(dc){return countDr(dc)>0;}
  function fullDragons(dc){var o=emptyDragons();dc=dc||{};CATS.forEach(function(c){if(Array.isArray(dc[c]))o[c]=dc[c];});return o;}

  // 프리셋 묶음
  function wrap(raw){
    if(raw&&raw.v===2&&Array.isArray(raw.presets)&&raw.presets.length){
      if(!raw.presets.some(function(x){return x.id===raw.activeId;}))raw.activeId=raw.presets[0].id;
      return raw;
    }
    return {v:2,activeId:'p1',presets:[{id:'p1',name:IS_EN?'Default':'기본',data:raw||mkSpecData()}]};
  }
  function activeOf(P){
    for(var i=0;i<P.presets.length;i++)if(P.presets[i].id===P.activeId)return P.presets[i];
    return P.presets[0];
  }
  async function fetchCloud(){
    var u=user();
    var rows=await supabase('GET','users',null,'?id=eq.'+u.id+'&select=spec_data');
    if(!rows||!rows[0]||!rows[0].spec_data)return null;
    var raw=rows[0].spec_data;
    return typeof raw==='string'?JSON.parse(raw):raw;
  }
  async function pushCloud(P){
    var u=user();
    await supabase('PATCH','users',{spec_data:JSON.stringify(P)},'?id=eq.'+u.id);
  }
  function localWrapper(){
    var P=wrap(rd(K.presets));
    var spec=rd(K.spec);
    if(!rd(K.presets)&&spec)activeOf(P).data=spec;
    return P;
  }

  // ---------------------------------------------------------------- 로컬 반영
  function writeLocalDragons(dc){
    dc=fullDragons(clone(dc));
    var spec=rd(K.spec)||{};spec.dragonCards=dc;wr(K.spec,spec);
    [K.pvp,K.noob].forEach(function(k){var o=rd(k);if(o||hasDr(dc)){o=o||{};o.dragonCards=dc;wr(k,o);}});
    var Pr=rd(K.presets);
    if(Pr){var P=wrap(Pr);var a=activeOf(P);a.data=a.data||mkSpecData();a.data.dragonCards=dc;wr(K.presets,P);}
  }
  function writeLocalSpec(data){
    data=data||{};
    var spec={accCards:data.accCards||[],gems:data.gems||{},pendants:data.pendants||[],coll:data.coll||{},dragonCards:fullDragons(data.dragonCards)};
    wr(K.spec,spec);
    var fields={accCards:spec.accCards,gems:spec.gems,pendants:spec.pendants,coll:spec.coll};
    [K.pvp,K.noob,K.calc].forEach(function(k){var o=rd(k)||{};for(var f in fields)o[f]=fields[f];wr(k,o);});
    [K.pvp,K.noob].forEach(function(k){var o=rd(k)||{};o.dragonCards=spec.dragonCards;wr(k,o);});
  }
  // 현재 페이지 화면 다시 로드 (doLoad가 로컬 키에서 다시 읽음)
  function reloadPage(){
    try{if(typeof init==='function')init();}catch(e){console.warn(e);}
    try{if(typeof renderSpecView==='function')renderSpecView();}catch(e){}
    try{var g=document.getElementById('dragon-gallery');if(g&&g.classList.contains('active')&&typeof renderDragonGallery==='function')renderDragonGallery();}catch(e){}
  }
  function pageDragons(){try{return S&&S.dragonCards;}catch(e){return null;}}

  // ---------------------------------------------------------------- 상태 표시
  var statusEl=null;
  function setStatus(txt,color){
    if(!statusEl)statusEl=document.getElementById('dragon-sync-msg');
    if(!statusEl)return;
    statusEl.textContent=txt;
    statusEl.style.color=color||'var(--dim)';
  }

  // ---------------------------------------------------------------- 자동저장
  var ready=false;        // 충돌 확인 끝나기 전엔 자동저장 안 함
  var lastSig=null;       // 마지막으로 동기화한 드래곤
  var clearIntent=false;  // 유저가 직접 삭제한 경우만 빈 드래곤 저장 허용
  var cloudT=null, cloudBusy=false, cloudAgain=false;

  function onPageSaved(){
    if(!HAS_DRAGONS||!ready)return;
    var dc=pageDragons();if(!dc)return;
    var sig=canon(dc);
    if(sig===lastSig){clearIntent=false;return;}
    var last=rd(K.spec);
    if(!hasDr(dc)&&!clearIntent&&last&&hasDr(last.dragonCards))return; // 빈 상태 덮어쓰기 차단
    clearIntent=false;
    lastSig=sig;
    writeLocalDragons(dc);
    try{localStorage.setItem(K.pending,'1');}catch(e){}
    if(canCloud()){setStatus(TX.saving);scheduleCloud();}
    else setStatus(TX.saved,'var(--green)');
  }
  function scheduleCloud(){
    clearTimeout(cloudT);
    cloudT=setTimeout(flushCloud,3000);
  }
  async function flushCloud(){
    cloudT=null;
    if(cloudBusy){cloudAgain=true;return;}
    cloudBusy=true;
    try{
      var spec=rd(K.spec)||{};
      var dc=fullDragons(spec.dragonCards);
      var raw=await fetchCloud();
      var P=wrap(raw);
      var localP=rd(K.presets);
      // 이 기기의 활성 프리셋과 클라우드 활성 프리셋이 다르면 다른 계정 데이터에 섞일 수 있어 올리지 않음
      if(localP&&wrap(localP).activeId!==P.activeId){
        console.warn('[spec_sync] active preset mismatch — skip upload');
        setStatus(TX.fail,'var(--red)');
      }else{
        var a=activeOf(P);
        if(!raw){a.data=mkSpecData();['accCards','gems','pendants','coll'].forEach(function(f){if(spec[f])a.data[f]=spec[f];});}
        a.data=a.data||mkSpecData();
        a.data.dragonCards=dc;
        await pushCloud(P);
        wr(K.presets,P);
        try{localStorage.removeItem(K.pending);}catch(e){}
        setStatus(TX.saved,'var(--green)');
      }
    }catch(e){
      console.warn('[spec_sync] cloud save failed',e);
      setStatus(TX.fail,'var(--red)');
    }
    cloudBusy=false;
    if(cloudAgain){cloudAgain=false;flushCloud();}
  }

  function hookPage(){
    if(typeof doSave==='function'){
      var orig=doSave;
      window.doSave=function(){var r=orig.apply(this,arguments);try{onPageSaved();}catch(e){console.warn(e);}return r;};
    }
    ['delDragonCard','clearDragonCat','resetAllDragonInfo','resetDragonCard'].forEach(function(fn){
      if(typeof window[fn]!=='function')return;
      var o=window[fn];
      window[fn]=function(){clearIntent=true;return o.apply(this,arguments);};
    });
  }

  // ---------------------------------------------------------------- 충돌 확인
  async function startDragons(){
    setStatus(TX.paused);
    var cloudP=null,cloudOk=false;
    if(canCloud()){
      try{var raw=await fetchCloud();if(raw){cloudP=wrap(raw);}cloudOk=true;}catch(e){console.warn('[spec_sync] cloud load failed',e);}
    }
    var localP=rd(K.presets);
    // 클라우드 활성 프리셋과 이 기기 활성 프리셋이 다르면 클라우드 기준으로 먼저 맞춤
    if(cloudP&&localP&&wrap(localP).activeId!==cloudP.activeId){
      wr(K.presets,cloudP);
      writeLocalSpec(activeOf(cloudP).data);
      try{localStorage.removeItem(K.pending);}catch(e){}
      reloadPage();
    }
    var pending=!!localStorage.getItem(K.pending);
    var specLocal=rd(K.spec)||{};
    var specDr=(cloudP&&!pending)?(activeOf(cloudP).data||{}).dragonCards:specLocal.dragonCards;
    var pvpDr=(rd(K.pvp)||{}).dragonCards;
    var noobDr=(rd(K.noob)||{}).dragonCards;
    var cur=pageDragons();
    if(PAGE==='pvp')pvpDr=cur;else noobDr=cur;

    // 한 번 정리된 뒤에는 조용히 최신값 기준으로 맞춤 (선택창은 첫 정리 때만)
    if(localStorage.getItem(K.synced)){
      var truth=pending?cur:((cloudOk&&cloudP)?(activeOf(cloudP).data||{}).dragonCards:specLocal.dragonCards);
      var tsig=canon(truth);
      if(canon(cur)!==tsig){writeLocalDragons(truth);reloadPage();}
      else if(canon(specLocal.dragonCards)!==tsig||canon((rd(K[PAGE==='pvp'?'noob':'pvp'])||{}).dragonCards)!==tsig){writeLocalDragons(truth);}
      if(pending&&canCloud())scheduleCloud();
    }else{
    var srcs=[
      {id:'spec',label:TX.src_spec,dc:specDr},
      {id:'pvp',label:TX.src_pvp,dc:pvpDr},
      {id:'noob',label:TX.src_noob,dc:noobDr}
    ].filter(function(s){return hasDr(s.dc);});
    // 같은 셋팅끼리 묶기
    var groups=[];
    srcs.forEach(function(s){
      var sig=canon(s.dc);
      var g=groups.filter(function(x){return x.sig===sig;})[0];
      if(g){g.labels.push(s.label);}else groups.push({sig:sig,labels:[s.label],dc:s.dc,id:s.id});
    });

    if(groups.length>1){
      if(!rd(K.backup))wr(K.backup,{at:Date.now(),spec:specLocal.dragonCards||null,pvp:(rd(K.pvp)||{}).dragonCards||null,noob:(rd(K.noob)||{}).dragonCards||null});
      openConflict(groups);
      return;
    }
    var dc=groups.length?groups[0].dc:null;
    if(dc){
      if(canon(cur)!==groups[0].sig){ // 현재 페이지만 비어 있음 → 채움
        writeLocalDragons(dc);reloadPage();
      }else if(canon(specLocal.dragonCards)!==groups[0].sig||canon((rd(K[PAGE==='pvp'?'noob':'pvp'])||{}).dragonCards)!==groups[0].sig){
        writeLocalDragons(dc);
      }
      // 클라우드가 비어 있으면 올림
      if(cloudOk&&(!cloudP||canon((activeOf(cloudP).data||{}).dragonCards)!==groups[0].sig)){
        try{localStorage.setItem(K.pending,'1');}catch(e){}
        scheduleCloud();
      }
    }
    }
    lastSig=canon(pageDragons());
    try{localStorage.setItem(K.synced,'1');}catch(e){}
    ready=true;
    setStatus(canCloud()?TX.auto_on:TX.login_note);
  }

  // ---------------------------------------------------------------- 선택창
  var M=null;
  function detailHtml(cat,c){
    var opts=(c.opts||[]).map(function(o,i){
      if(!o||!o.stat||o.stat==='없음')return '';
      var v='';try{v=(typeof fmtDragonSpVal==='function')?fmtDragonSpVal(i+1,o.stat,o.type):(o.type||'');}catch(e){}
      return '<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:12px"><span style="color:var(--dim)">'+TX.opt(i+1)+' '+esc(o.stat)+'</span><span style="color:var(--text);font-weight:700">'+esc(v)+'</span></div>';
    }).join('');
    if(c.bonus)opts+='<div style="display:flex;justify-content:space-between;gap:10px;padding:3px 0;font-size:12px"><span style="color:var(--dim)">'+TX.bonus+'</span><span style="color:var(--gold);font-weight:700">'+esc(TX.bonus_lbl[c.bonus]||c.bonus)+'</span></div>';
    var growth=c.growth||'-';
    var grade=(growth==='강림'||growth==='진각')?growth:(c.grade||'-');
    return '<div style="font-weight:800;color:var(--text);margin-bottom:6px">'+esc(c.name)+' <span style="font-size:11px;color:var(--dim);font-weight:400">'+esc(catLabel(cat))+'</span></div>'
      +'<div style="font-size:12px;color:var(--dim);margin-bottom:6px">'+TX.type+' '+esc(c.dtype||'-')+' · '+TX.growth+' '+esc(growth)+' · '+TX.grade+' '+esc(grade)+'</div>'
      +opts;
  }
  function galleryHtml(dc){
    var html='';
    CATS.forEach(function(cat){
      var named=(Array.isArray(dc[cat])?dc[cat]:[]).filter(function(c){return c&&c.name;});
      if(!named.length)return;
      html+='<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:var(--gold);margin-bottom:6px">'+esc(catLabel(cat))+' ('+named.length+')</div><div style="display:flex;flex-wrap:wrap;gap:8px">';
      named.forEach(function(c,i){
        var url=null;try{url=(typeof getDragonImgUrl==='function')?getDragonImgUrl(c.name):null;}catch(e){}
        var img=url?'<img src="'+esc(url)+'" onerror="this.style.visibility=\'hidden\'" style="width:44px;height:44px;object-fit:contain;border-radius:6px">':'<div style="width:44px;height:44px;background:var(--sf);border-radius:6px"></div>';
        html+='<div data-ss-cat="'+esc(cat)+'" data-ss-i="'+i+'" style="width:64px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px;border-radius:8px;border:1px solid var(--bd);background:var(--sf2)">'+img+'<span style="font-size:9px;color:var(--dim);text-align:center;word-break:keep-all;line-height:1.3">'+esc(c.name)+'</span></div>';
      });
      html+='</div></div>';
    });
    return html||'<div style="color:var(--dim);text-align:center;padding:30px">'+TX.empty+'</div>';
  }
  function openConflict(groups){
    closeModal();
    M={groups:groups,sel:0,savedName:{}};
    var ov=document.createElement('div');
    ov.id='_ss-modal';
    ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px';
    ov.innerHTML='<div style="background:var(--sf);border:1px solid var(--gold);border-radius:12px;width:100%;max-width:640px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;font-family:\'Malgun Gothic\',sans-serif">'
      +'<div style="padding:14px 16px;border-bottom:1px solid var(--bd)"><div style="font-size:15px;font-weight:800;color:var(--gold)">'+TX.m_title+'</div>'
      +'<div style="font-size:12px;color:var(--dim);margin-top:4px;white-space:pre-line;line-height:1.6">'+TX.m_desc+'</div></div>'
      +'<div id="_ss-tabs" style="display:flex;gap:6px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--bd)"></div>'
      +'<div id="_ss-body" style="padding:12px 16px;overflow:auto;flex:1;min-height:160px"></div>'
      +'<div id="_ss-detail" style="display:none;margin:0 16px 10px;padding:10px 12px;border:1px solid var(--bd);border-radius:8px;background:var(--sf2)"></div>'
      +'<div id="_ss-note" style="padding:0 16px;font-size:12px;color:var(--green);min-height:0"></div>'
      +'<div style="display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid var(--bd)">'
      +'<button id="_ss-use" class="btn-gold" style="flex:1;min-width:140px;padding:9px 12px;font-size:13px"></button>'
      +'<button id="_ss-save" class="btn-white" style="flex:1;min-width:140px;padding:9px 12px;font-size:13px"></button>'
      +'<button id="_ss-later" class="btn-reset" style="padding:9px 12px;font-size:13px">'+TX.later+'</button>'
      +'</div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#_ss-use').onclick=useSelected;
    ov.querySelector('#_ss-save').onclick=saveSelectedAsPreset;
    ov.querySelector('#_ss-later').onclick=function(){closeModal();setStatus(TX.paused);};
    ov.querySelector('#_ss-body').onclick=function(e){
      var card=e.target.closest('[data-ss-cat]');if(!card)return;
      var g=M.groups[M.sel];var c=(g.dc[card.getAttribute('data-ss-cat')]||[]).filter(function(x){return x&&x.name;})[+card.getAttribute('data-ss-i')];
      if(!c)return;
      var d=ov.querySelector('#_ss-detail');d.innerHTML=detailHtml(card.getAttribute('data-ss-cat'),c);d.style.display='block';
    };
    renderModal();
  }
  function renderModal(){
    if(!M)return;
    var ov=document.getElementById('_ss-modal');if(!ov)return;
    ov.querySelector('#_ss-tabs').innerHTML=M.groups.map(function(g,i){
      var on=i===M.sel;
      return '<button data-ss-tab="'+i+'" style="background:'+(on?'rgba(232,184,75,.15)':'var(--sf2)')+';border:1px solid '+(on?'var(--gold)':'var(--bd)')+';color:'+(on?'var(--gold)':'var(--text)')+';padding:7px 12px;border-radius:16px;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">'
        +esc(g.labels.join(' · '))+' <span style="font-weight:400;opacity:.8">'+TX.count(countDr(g.dc))+'</span></button>';
    }).join('');
    Array.prototype.forEach.call(ov.querySelectorAll('[data-ss-tab]'),function(b){
      b.onclick=function(){M.sel=+b.getAttribute('data-ss-tab');ov.querySelector('#_ss-detail').style.display='none';renderModal();};
    });
    var g=M.groups[M.sel];
    ov.querySelector('#_ss-body').innerHTML=galleryHtml(g.dc);
    ov.querySelector('#_ss-use').textContent=TX.use;
    var saveBtn=ov.querySelector('#_ss-save');
    saveBtn.textContent=TX.save_preset;
    var full=presetCount()>=PRESET_MAX;
    saveBtn.disabled=full;saveBtn.style.opacity=full?'.4':'';saveBtn.style.cursor=full?'not-allowed':'';
    saveBtn.title=full?TX.preset_full:'';
    ov.querySelector('#_ss-note').innerHTML=(M.savedName[M.sel]?esc(TX.saved_as(M.savedName[M.sel])):'')+(full?'<div style="color:var(--dim)">'+TX.preset_full+'</div>':'');
    ov.querySelector('#_ss-note').style.padding=ov.querySelector('#_ss-note').innerHTML?'0 16px 8px':'0 16px';
  }
  var _presetCount=null;
  function presetCount(){return _presetCount!=null?_presetCount:localWrapper().presets.length;}
  function closeModal(){var ov=document.getElementById('_ss-modal');if(ov)ov.remove();M=null;}
  function setBusy(b){
    var ov=document.getElementById('_ss-modal');if(!ov)return;
    ['#_ss-use','#_ss-save','#_ss-later'].forEach(function(s){var el=ov.querySelector(s);if(el){el.disabled=b;if(b)el.style.opacity='.5';else el.style.opacity='';}});
    if(!b)renderModal();
  }

  async function saveSelectedAsPreset(){
    if(!M)return;
    var g=M.groups[M.sel];
    if(presetCount()>=PRESET_MAX){alert(TX.preset_full);return;}
    var name=prompt(TX.preset_name,TX.preset_default(g.labels[0]));
    if(name===null)return;
    name=String(name).trim().slice(0,20)||TX.preset_default(g.labels[0]);
    setBusy(true);
    try{
      var P;
      if(canCloud()){
        var raw=await fetchCloud();
        P=raw?wrap(raw):localWrapper();
      }else P=localWrapper();
      if(P.presets.length>=PRESET_MAX){_presetCount=P.presets.length;alert(TX.preset_full);setBusy(false);return;}
      P.presets.push({id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:name,data:mkSpecData(fullDragons(clone(g.dc)))});
      if(canCloud())await pushCloud(P);
      wr(K.presets,P);
      _presetCount=P.presets.length;
      M.savedName[M.sel]=name;
      toast(TX.preset_done);
    }catch(e){alert(TX.fail_save+(e&&e.message||e));}
    setBusy(false);
  }

  async function useSelected(){
    if(!M)return;
    var g=M.groups[M.sel];
    if(!confirm(TX.use_confirm(g.labels.join(' · '))))return;
    setBusy(true);
    var dc=fullDragons(clone(g.dc));
    try{
      writeLocalDragons(dc);
      if(canCloud()){
        var raw=await fetchCloud();
        var P=wrap(raw);
        var localP=rd(K.presets);
        if(localP&&raw&&wrap(localP).activeId!==P.activeId){P=wrap(localP);} // 방금 로드에서 맞췄으므로 드묾
        var a=activeOf(P);
        if(!raw){var sp=rd(K.spec)||{};a.data=mkSpecData();['accCards','gems','pendants','coll'].forEach(function(f){if(sp[f])a.data[f]=sp[f];});}
        a.data=a.data||mkSpecData();
        a.data.dragonCards=dc;
        await pushCloud(P);
        wr(K.presets,P);
        try{localStorage.removeItem(K.pending);}catch(e){}
      }else{
        try{localStorage.setItem(K.pending,'1');}catch(e){}
      }
    }catch(e){
      console.warn('[spec_sync] cloud save failed',e);
      try{localStorage.setItem(K.pending,'1');}catch(_){}
      setStatus(TX.fail,'var(--red)');
    }
    closeModal();
    reloadPage();
    lastSig=canon(pageDragons());
    try{localStorage.setItem(K.synced,'1');}catch(e){}
    ready=true;
    setStatus(canCloud()?TX.saved:TX.login_note,canCloud()?'var(--green)':null);
    toast(TX.used);
  }

  // ---------------------------------------------------------------- 새로고침
  async function refreshSpec(btn){
    if(!canCloud())return;
    if(cloudT||cloudBusy){if(!confirm(TX.refresh_confirm))return;}
    if(btn){btn.disabled=true;btn.style.opacity='.5';}
    try{
      var raw=await fetchCloud();
      if(!raw){toast(TX.no_cloud);}
      else{
        clearTimeout(cloudT);cloudT=null;
        var P=wrap(raw);
        wr(K.presets,P);
        writeLocalSpec(activeOf(P).data);
        try{localStorage.removeItem(K.pending);}catch(e){}
        reloadPage();
        if(HAS_DRAGONS){lastSig=canon(pageDragons());if(!ready&&!M){ready=true;try{localStorage.setItem(K.synced,'1');}catch(e){}}setStatus(TX.auto_on);}
        toast(TX.refreshed);
      }
    }catch(e){console.warn(e);toast(TX.refresh_fail);}
    if(btn){btn.disabled=false;btn.style.opacity='';}
  }
  function addRefreshButton(){
    if(!canCloud())return;
    var hd=document.querySelector('.hd');if(!hd)return;
    var b=document.createElement('button');
    b.type='button';b.className='btn-white';b.id='spec-refresh-btn';
    b.innerHTML='🔄<span class="ss-t"> '+esc(TX.refresh.replace(/^🔄\s*/,''))+'</span>';
    b.title=TX.refresh.replace(/^🔄\s*/,'');
    if(!document.getElementById('_ss-style')){var st=document.createElement('style');st.id='_ss-style';st.textContent='@media(max-width:600px){#spec-refresh-btn .ss-t{display:none}#spec-refresh-btn{padding:5px 8px!important;margin-left:6px!important}}';document.head.appendChild(st);}
    b.style.cssText='font-size:12px;padding:5px 10px;margin-left:10px;flex-shrink:0;white-space:nowrap';
    b.onclick=function(){refreshSpec(b);};
    hd.appendChild(b);
  }

  // ---------------------------------------------------------------- 시작
  function start(){
    addRefreshButton();
    if(!HAS_DRAGONS)return;
    hookPage();
    startDragons().catch(function(e){console.warn('[spec_sync]',e);ready=true;lastSig=canon(pageDragons());});
  }
  window.specSyncRefresh=function(){return refreshSpec(document.getElementById('spec-refresh-btn'));};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,0);});
  else setTimeout(start,0);
})();
