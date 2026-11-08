/* 영문판(/en/) 저장 데이터 정규화.
 * 예전 영문 페이지는 장신구·드래곤 이름을 영어로 저장했다. 지금 영문판은 한글판과 같은 코드를 쓰고
 * (화면 표시만 en-locale.js가 번역) 한국어 이름을 기준으로 계산하므로, dv1simEN_ 키 안의 영어 이름을
 * 한국어 이름으로 바꾼다. 이미 바뀐 이름은 그대로라 매번 실행해도 안전하다(멱등).
 * 최초 1회는 변환 전 원본을 dv1simEN_bak_kr_<키>로 백업한다. */
(function(){
  'use strict';
  if(!/\/en\//.test(location.pathname))return;
  try{
    var MIG_ACC={'Horn of light +18 (Crit/HP)':'빛뿔 (크/체) 18','Horn of light +18 (Crit/ATK)':'빛뿔 (크/공) 18','Horn of light +18 (Crit/DEF)':'빛뿔 (크/방) 18','Horn of light +20 (Crit/HP)':'빛뿔 (크/체) 20','Horn of light +20 (Crit/ATK)':'빛뿔 (크/공) 20','Horn of light +20 (Crit/DEF)':'빛뿔 (크/방) 20','Nightmare Orb +16 (HP)':'악몽 수호자의 보주 (악보) 16','Dusk Orb +16 (ATK)':'황혼 수호자의 보주 (황보) 16','Dawn Orb +16 (DEF)':'여명 수호자의 보주 (여보) 16','Horn of water +16 (HP/ATK)':'물뿔 (체/공) 16','Horn of water +16 (HP/DEF)':'물뿔 (체/방) 16','Horn of fire +16 (ATK/HP)':'불뿔 (공/체) 16','Horn of fire +16 (ATK/DEF)':'불뿔 (공/방) 16','Horn of earth +16 (DEF/HP)':'대뿔 (방/체) 16','Horn of earth +16 (DEF/ATK)':'대뿔 (방/공) 16','Horn of wind +16 (HP/DEF)':'바뿔 (체/방) 16','Horn of wind +16 (ATK/HP)':'바뿔 (공/체) 16','Horn of wind +16 (ATK/DEF)':'바뿔 (공/방) 16','Nightmare Orb +17 (HP)':'악몽 수호자의 보주 (악보) 17','Dusk Orb +17 (ATK)':'황혼 수호자의 보주 (황보) 17','Dawn Orb +17 (DEF)':'여명 수호자의 보주 (여보) 17','Horn of water +17 (HP/ATK)':'물뿔 (체/공) 17','Horn of water +17 (HP/DEF)':'물뿔 (체/방) 17','Horn of fire +17 (ATK/HP)':'불뿔 (공/체) 17','Horn of fire +17 (ATK/DEF)':'불뿔 (공/방) 17','Horn of earth +17 (DEF/HP)':'대뿔 (방/체) 17','Horn of earth +17 (DEF/ATK)':'대뿔 (방/공) 17','Horn of wind +17 (HP/DEF)':'바뿔 (체/방) 17','Horn of wind +17 (ATK/HP)':'바뿔 (공/체) 17','Horn of wind +17 (ATK/DEF)':'바뿔 (공/방) 17','Nightmare Orb +18 (HP)':'악몽 수호자의 보주 (악보) 18','Dusk Orb +18 (ATK)':'황혼 수호자의 보주 (황보) 18','Dawn Orb +18 (DEF)':'여명 수호자의 보주 (여보) 18','Horn of water +18 (HP/ATK)':'물뿔 (체/공) 18','Horn of water +18 (HP/DEF)':'물뿔 (체/방) 18','Horn of fire +18 (ATK/HP)':'불뿔 (공/체) 18','Horn of fire +18 (ATK/DEF)':'불뿔 (공/방) 18','Horn of earth +18 (DEF/HP)':'대뿔 (방/체) 18','Horn of earth +18 (DEF/ATK)':'대뿔 (방/공) 18','Horn of wind +18 (HP/DEF)':'바뿔 (체/방) 18','Horn of wind +18 (ATK/HP)':'바뿔 (공/체) 18','Horn of wind +18 (ATK/DEF)':'바뿔 (공/방) 18','Nightmare Orb +19 (HP)':'악몽 수호자의 보주 (악보) 19','Dusk Orb +19 (ATK)':'황혼 수호자의 보주 (황보) 19','Dawn Orb +19 (DEF)':'여명 수호자의 보주 (여보) 19','Horn of water +19 (HP/ATK)':'물뿔 (체/공) 19','Horn of water +19 (HP/DEF)':'물뿔 (체/방) 19','Horn of fire +19 (ATK/HP)':'불뿔 (공/체) 19','Horn of fire +19 (ATK/DEF)':'불뿔 (공/방) 19','Horn of earth +19 (DEF/HP)':'대뿔 (방/체) 19','Horn of earth +19 (DEF/ATK)':'대뿔 (방/공) 19','Horn of wind +19 (HP/DEF)':'바뿔 (체/방) 19','Horn of wind +19 (ATK/HP)':'바뿔 (공/체) 19','Horn of wind +19 (ATK/DEF)':'바뿔 (공/방) 19','Nightmare Orb +20 (HP)':'악몽 수호자의 보주 (악보) 20','Dusk Orb +20 (ATK)':'황혼 수호자의 보주 (황보) 20','Dawn Orb +20 (DEF)':'여명 수호자의 보주 (여보) 20','Horn of water +20 (HP/ATK)':'물뿔 (체/공) 20','Horn of water +20 (HP/DEF)':'물뿔 (체/방) 20','Horn of fire +20 (ATK/HP)':'불뿔 (공/체) 20','Horn of fire +20 (ATK/DEF)':'불뿔 (공/방) 20','Horn of earth +20 (DEF/HP)':'대뿔 (방/체) 20','Horn of earth +20 (DEF/ATK)':'대뿔 (방/공) 20','Horn of wind +20 (HP/DEF)':'바뿔 (체/방) 20','Horn of wind +20 (ATK/HP)':'바뿔 (공/체) 20','Horn of wind +20 (ATK/DEF)':'바뿔 (공/방) 20'};
    var MIG_DRG={};
    var V=window.DV1_DRAGON_VIEWS;
    if(V&&V.savedNameMap)['calculator','pvp','noob'].forEach(function(pg){
      var m=V.savedNameMap(pg);for(var k in m)if(!(k in MIG_DRG))MIG_DRG[k]=m[k];
    });
    function mig(map,n){return (n&&map[n])?map[n]:n;}
    function fix(p){
      if(!p||typeof p!=='object')return false;
      var ch=false;
      if(Array.isArray(p.accCards))p.accCards.forEach(function(c){if(c&&c.name&&MIG_ACC[c.name]){c.name=MIG_ACC[c.name];ch=true;}});
      if(p.dragonCards&&typeof p.dragonCards==='object')Object.keys(p.dragonCards).forEach(function(cat){
        (p.dragonCards[cat]||[]).forEach(function(c){if(c&&c.name&&MIG_DRG[c.name]){c.name=MIG_DRG[c.name];ch=true;}});
      });
      return ch;
    }
    function run(key,fn){
      var raw=localStorage.getItem(key);if(!raw)return;
      var p;try{p=JSON.parse(raw);}catch(e){return;}
      if(!fn(p))return;
      var bak='dv1simEN_bak_kr_'+key.replace(/^dv1simEN_/,'');
      if(!localStorage.getItem(bak))localStorage.setItem(bak,raw);
      localStorage.setItem(key,JSON.stringify(p));
    }
    ['dv1simEN_spec','dv1simEN_pvp','dv1simEN_noob','dv1simEN_calculator'].forEach(function(k){run(k,fix);});
    run('dv1simEN_spec_presets',function(p){
      var ch=false;
      (p&&Array.isArray(p.presets)?p.presets:[]).forEach(function(x){if(x&&fix(x.data))ch=true;});
      return ch;
    });
  }catch(e){console.warn('en storage migrate skip:',e);}
})();
