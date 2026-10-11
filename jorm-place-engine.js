/* 요르문간드 배치 계산기 — 정령 배분 최적화. No account, storage, or network access.
 * Slots 0-9 = 앞라인(탱), 10-19 = 뒷라인. 뒷라인 가운데 4칸(13-16) = 관통 자리.
 * Per slot and spirit the best gear comes from JormEngine.optimize; spirits are then
 * assigned to slots (each spirit once):
 *   1) 관통 자리가 관통 N회를 버티는 수 최대
 *   2) 앞라인 중 가장 낮은 생존 점수 최대
 *   3) 딜러(양끝 + 4회 통과한 관통 자리) 기대 피해 합 최대
 *   4) 앞라인 생존 점수 합 최대
 */
(function(root){
  'use strict';
  const PEN_SLOTS=[13,14,15,16];
  // 관통 피해 미입력 시 기준: 실제 운용 셋팅 표본(피올<·귕벼몽뭉·파괴전차·Misthios·시린, 12개)의 관통 내구 중간값(잠정, 476,008 → 476,000).
  // 관통 내구 = 체력 × (방어 × 빛보정 + 22). 난수가 없어 관통을 버티는 횟수에 정비례합니다.
  const PEN_REF=476000;
  const noSpirit={key:'none',opts:[0,1,2,3].map(()=>({stat:'none',type:'%'})),bonus:'none'};
  const spiritKey=s=>s.opts.map(o=>o.stat==='none'?'-':o.stat+o.type).join(',')+'|'+s.bonus;
  function roleOf(pos,pen){if(pos<10)return 'front';if(pen&&PEN_SLOTS.includes(pos))return 'pen';return 'dealer';}

  // Min-cost assignment, rows <= cols (Hungarian with potentials). cost[i][j]; returns col for each row.
  function hungarian(cost){
    const n=cost.length,m=cost[0].length,INF=Infinity;
    const u=new Float64Array(n+1),v=new Float64Array(m+1),p=new Int32Array(m+1),way=new Int32Array(m+1);
    for(let i=1;i<=n;i++){
      p[0]=i;let j0=0;const minv=new Float64Array(m+1).fill(INF),used=new Uint8Array(m+1);
      do{used[j0]=1;const i0=p[j0];let delta=INF,j1=0;
        for(let j=1;j<=m;j++)if(!used[j]){const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<minv[j]){minv[j]=cur;way[j]=j0;}if(minv[j]<delta){delta=minv[j];j1=j;}}
        for(let j=0;j<=m;j++){if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else minv[j]-=delta;}
        j0=j1;
      }while(p[j0]!==0);
      do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);
    }
    const res=new Array(n);for(let j=1;j<=m;j++)if(p[j])res[p[j]-1]=j-1;return res;
  }

  function plan(input,E,data,progress=()=>{}){
    const measured=input.pen&&input.pen.damage>0&&input.pen.def>=0;
    const pen=measured?input.pen:(input.pen&&input.pen.reference?{reference:true,ref:PEN_REF}:null);
    const corrupted=input.boss==='corrupted',lightOf=l=>l?(corrupted?20:23):false;
    const hits=input.hits||4;
    // 기준 모드: 관통 4회 = 관통 내구 PEN_REF가 되도록 보스 관통 공격력을 맞춥니다 (hp×(def×m+22) > 176×A).
    const bossAtk=!pen?0:measured?E.penetrationAttack(pen.damage,pen.def,lightOf(pen.light)):PEN_REF/176;
    const tough=(hp,def,light)=>hp*(def*(lightOf(light)||16)/16+22);
    const equip=input.mode==='equip';
    const normSp=s=>{const sp={opts:(s&&s.opts||[]).slice(0,4).map(o=>({stat:o.stat||'none',type:o.type||'%'})),bonus:(s&&s.bonus)||'none'};while(sp.opts.length<4)sp.opts.push({stat:'none',type:'%'});sp.key=spiritKey(sp);return sp.opts.every(o=>o.stat==='none')&&sp.bonus==='none'?noSpirit:sp;};
    // 정령 해제 모드: 칸에 놓인 드래곤에 보유 정령을 배분. 정령 장착 모드: 드래곤+정령 묶음을 자리에 배치.
    const slots=equip?[]:input.slots.map((d,pos)=>d?{pos,dragon:d,role:roleOf(pos,pen)}:null).filter(Boolean);
    const unitsIn=equip?(input.units||[]).filter(u=>u&&u.dragon).slice(0,20).map(u=>({dragon:u.dragon,sp:normSp(u.spirit)})):[];
    if(equip?!unitsIn.length:!slots.length)throw Error('배치할 드래곤을 한 마리 이상 넣어 주세요.');
    const kinds=new Map([[noSpirit.key,noSpirit]]),units=[];
    if(equip)for(const u of unitsIn){if(!kinds.has(u.sp.key))kinds.set(u.sp.key,u.sp);}
    else for(const s of input.spirits||[]){const sp=normSp(s);if(sp.key===noSpirit.key)continue;if(!kinds.has(sp.key))kinds.set(sp.key,sp);for(let i=0;i<Math.max(1,s.count|0);i++)units.push(sp.key);}
    const base={boss:input.boss,type:'',grade:corrupted?'9.0':input.grade,gem:input.gem,enchant:input.enchant,potion:input.potion,collection:input.collection,accessories:data.accessories.map((_,i)=>i),pendantMode:'auto',pendants:[]};
    const cache=new Map(),jobs=new Set();
    const jobKey=(sl,k)=>[sl.role,sl.dragon.type,sl.role==='dealer'?'':!!sl.dragon.light,sl.role==='front'?'':!!sl.dragon.dark,k].join('|');
    const positions=[...Array(20).keys()].map(pos=>({pos,role:roleOf(pos,pen)}));
    const rolesUsed=[...new Set(positions.map(x=>x.role))];
    if(equip){for(const u of unitsIn)for(const role of rolesUsed)jobs.add(jobKey({role,dragon:u.dragon},u.sp.key));}
    else for(const sl of slots)for(const k of kinds.keys())jobs.add(jobKey(sl,k));
    const total=jobs.size;let done=0;
    function evaluate(sl,k){
      const key=jobKey(sl,k);if(cache.has(key))return cache.get(key);
      const sp=kinds.get(k),d=sl.dragon,c={...base,type:d.type,light:!!d.light,dark:!!d.dark,spirit:sp.opts,bonus:sp.bonus};
      let row,ok=true;
      if(sl.role==='front')row=E.optimize({...c,role:'tank',potionKind:'eva'},data).rows[0];
      else if(sl.role==='dealer')row=E.optimize({...c,role:'dealer',potionKind:'crit'},data).rows[0];
      else{
        row=E.optimize({...c,role:'dealer',potionKind:'crit',minHits:{hits,attack:bossAtk}},data).rows[0];
        // No setting survives: fall back to the sturdiest (tank) setting and report the hit count.
        if(!row){ok=false;row=E.optimize({...c,role:'tank',potionKind:'crit'},data).rows[0];}
      }
      const r=row?{...row,pass:ok}:null;
      if(r&&sl.role==='pen'){r.penTough=tough(r.stats.hp,r.stats.def,d.light);r.penHit=E.penetrationHit(r.stats.def,bossAtk,lightOf(d.light));r.penHits=E.penetrationHits(r.stats.hp,r.stats.def,bossAtk,lightOf(d.light));}
      if(r&&sl.role==='front'&&r.score==null)r.score=0;
      cache.set(key,r);done++;progress({done,total});return r;
    }
    // Lexicographic weights. Scores ~10^2-10^3, dealt sums < 10^6.
    // (장착 모드) 앞라인 채우기 > 관통 통과 > 앞라인 최저 점수 > 딜 합 + 앞라인 합
    const W_FILL=1e12,W_PASS=1e10,W_LOW=1e8;
    const valueOf=(role,r,T)=>{if(!r)return -1e13;
      if(role==='front')return (equip?W_FILL:0)+(r.score<T?-W_LOW:0)+r.score*1e-3;
      if(role==='pen')return r.pass?W_PASS+r.dealt:r.penHits*1e-3;
      return r.dealt;};
    // rows = 칸(해제) 또는 드래곤(장착), cols = 정령(해제) 또는 자리(장착)
    const rows=equip?unitsIn:slots;
    const cols=equip?positions:[...units,...slots.map(()=>noSpirit.key)];
    const roleAt=(i,j)=>equip?cols[j].role:rows[i].role;
    const table=equip?unitsIn.map(u=>{const byRole=new Map(rolesUsed.map(role=>[role,evaluate({role,dragon:u.dragon},u.sp.key)]));return positions.map(x=>byRole.get(x.role));})
      :slots.map(sl=>{const byKind=new Map();for(const k of kinds.keys())byKind.set(k,evaluate(sl,k));return cols.map(k=>byKind.get(k));});
    function solve(T){
      const cost=rows.map((_,i)=>table[i].map((r,j)=>-valueOf(roleAt(i,j),r,T)));
      const pick=hungarian(cost);
      let passes=0,low=0,fronts=0;rows.forEach((_,i)=>{const role=roleAt(i,pick[i]),r=table[i][pick[i]];if(role==='pen'&&r&&r.pass)passes++;if(role==='front'){fronts++;if(r&&r.score<T)low++;}});
      return {pick,passes,low,fronts};
    }
    let best=solve(-Infinity);const maxPass=best.passes,maxFront=best.fronts;
    // Largest T such that every front slot reaches T without losing a penetration pass (or a front slot).
    const cands=[...new Set(rows.flatMap((_,i)=>table[i].filter((r,j)=>r&&roleAt(i,j)==='front').map(r=>r.score)))].sort((a,b)=>a-b);
    if(maxFront){let lo=0,hi=cands.length-1;
      while(lo<=hi){const mid=(lo+hi)>>1,s=solve(cands[mid]);if(s.low===0&&s.passes===maxPass&&s.fronts===maxFront){best=s;lo=mid+1;}else hi=mid-1;}}
    const results=rows.map((x,i)=>{const j=best.pick[i],r=table[i][j];
      if(equip)return {pos:cols[j].pos,role:cols[j].role,dragon:x.dragon,spirit:x.sp.key===noSpirit.key?null:x.sp,row:r&&{...r}};
      const k=cols[j];return {pos:x.pos,role:x.role,dragon:x.dragon,spirit:k===noSpirit.key?null:kinds.get(k),row:r&&{...r}};});
    if(equip)results.forEach(x=>slots.push({pos:x.pos}));
    if(input.gemStock)distributeGems(results,input,E,data,{bossAtk,hits,lightOf,tough,grade:base.grade});
    // 추천 배치: 앞라인은 생존 점수가 높은 순으로 가운데부터, 딜러는 기대 피해가 높은 순으로 가장자리부터.
    // (계산 모델에서 같은 줄 안의 칸 위치는 결과에 영향을 주지 않으므로 자리만 다시 정합니다.)
    const FRONT_ORDER=[4,5,3,6,2,7,1,8,0,9],BACK_ORDER=[10,19,11,18,12,17,13,16,14,15];
    function arrange(role,order,metric){
      const group=results.filter(x=>x.role===role).sort((a,b)=>metric(b)-metric(a));
      const free=order.filter(p=>results.some(x=>x.role===role&&x.pos===p)||!slots.some(sl=>sl.pos===p));
      const allowed=role==='dealer'?order.filter(p=>roleOf(p,pen)==='dealer'):order;
      const targets=allowed.filter(p=>free.includes(p));
      group.forEach((x,i)=>{x.from=x.pos;x.pos=targets[i];});
    }
    arrange('front',FRONT_ORDER,x=>x.row?x.row.score:-Infinity);
    arrange('dealer',BACK_ORDER,x=>x.row?x.row.dealt:-Infinity);
    results.sort((a,b)=>a.pos-b.pos);
    const front=results.filter(r=>r.role==='front'&&r.row),pens=results.filter(r=>r.role==='pen');
    return {results,pen:pen?{reference:!measured,ref:PEN_REF,bossAtk,hits,passed:pens.filter(r=>r.row&&r.row.pass).length,total:pens.length}:null,
      summary:{frontMin:front.length?Math.min(...front.map(r=>r.row.score)):null,dealt:results.filter(r=>r.row&&(r.role==='dealer'||(r.role==='pen'&&r.row.pass))).reduce((a,r)=>a+r.row.dealt,0),spiritsUsed:results.filter(r=>r.spirit).length,spiritsOwned:equip?results.filter(r=>r.spirit).length:units.length},mode:equip?'equip':'free',evaluated:total};
  }
  // 보유 젬 배분: 셋팅(장신구·펜던트·정령·젬 갯수)은 기준 젬(input.gem, 보통 36)으로 고른 그대로 두고,
  // 보유한 상위 젬을 한 개씩 넣어 볼 때마다 목표(관통 통과 수 > 앞라인 최저 점수 > 딜 합 + 앞라인 합)가
  // 가장 좋아지는 칸에 넣습니다. 남는 자리는 기준 젬으로 채웁니다.
  function distributeGems(results,input,E,data,ctx){
    const keys=['hp','atk','def'],baseGem=input.gem,mult=data.probability.dealer.multiplier;
    const items=results.filter(x=>x.row);
    const pf=(v,p)=>Math.floor(v*(1+p/100)+1e-9);
    for(const x of items){x.row.gemLv=Object.fromEntries(keys.map(k=>[k,Array(x.row.gems[k]).fill(baseGem)]));}
    function restat(x,lv){
      const r=x.row,d=x.dragon,b=data.base[ctx.grade][d.type],acc=data.accessories[r.acc],sp=x.spirit,out={};
      for(const k of keys){
        let plus=0,pct=0;if(sp)sp.opts.forEach((o,i)=>{if(o.stat!==k)return;if(o.type==='+')plus+=data.plus[k][i+1];else pct+=data.pct[i+1];});
        const gem=lv[k].reduce((a,g)=>a+data.gems[g][k],0);
        const add=(sp&&sp.bonus===k?data.bonus[k]:0)+input.collection[k];
        out[k]=pf(E.stat(b[k],gem,r.potion[k],acc[k]+(r.enchant===k?.21:0),pct,0,plus,0,0),r.pend[k])+add;
      }
      return out;
    }
    function measure(x,stats){
      const r=x.row,light=ctx.lightOf(x.dragon.light);
      if(x.role==='front'){const prob=r.probability&&r.probability.kind==='eva'?r.probability:null;return {score:E.applyEvasion(E.survivalScore(stats.hp,stats.def,light),prob)};}
      const c={dark:!!x.dragon.dark};
      const out={dealt:E.dealtWithCrit(stats.atk,c,r.probability&&r.probability.kind==='crit'?r.probability:null,mult)};
      if(x.role==='pen'){out.penTough=ctx.tough(stats.hp,stats.def,x.dragon.light);out.penHit=E.penetrationHit(stats.def,ctx.bossAtk,light);out.penHits=E.penetrationHits(stats.hp,stats.def,ctx.bossAtk,light);out.pass=out.penHits>=ctx.hits;}
      return out;
    }
    function apply(x,lv){const stats=restat(x,lv);Object.assign(x.row,{stats,tankBV:stats.hp*stats.atk*stats.def},measure(x,stats));x.row.gemLv=lv;}
    items.forEach(x=>apply(x,x.row.gemLv));
    function objective(list){
      let passes=0,min=Infinity,sum=0;
      for(const x of list){const r=x.row;
        if(x.role==='front'){min=Math.min(min,r.score);sum+=r.score*1e-3;}
        else if(x.role==='pen'){if(r.pass){passes++;sum+=r.dealt;}else sum+=r.penHits*1e-6;}
        else sum+=r.dealt;}
      return [passes,min,sum];
    }
    const cmp=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
    // 보유 젬: 스탯별 [단계, 남은 수], 높은 단계부터. 기준 젬보다 낮은 단계는 쓰지 않습니다.
    const stock=Object.fromEntries(keys.map(k=>[k,Object.entries(input.gemStock[k]||{}).filter(([g,n])=>data.gems[g]&&n>0&&data.gemNames[g]>data.gemNames[baseGem]).map(([g,n])=>[g,Math.floor(n)]).sort((a,b)=>data.gemNames[b[0]]-data.gemNames[a[0]])]));
    for(;;){
      let bestMove=null,bestObj=objective(items);
      for(const k of keys){const top=stock[k].find(e=>e[1]>0);if(!top)continue;const g=top[0];
        for(const x of items){const lv=x.row.gemLv,at=lv[k].findIndex(q=>data.gemNames[q]<data.gemNames[g]);if(at<0)continue;
          // 가장 낮은 젬 자리를 교체해 봅니다.
          let low=at;lv[k].forEach((q,i)=>{if(data.gemNames[q]<data.gemNames[lv[k][low]])low=i;});
          const saved={...x.row},next={...lv,[k]:lv[k].map((q,i)=>i===low?g:q)};
          apply(x,next);const obj=objective(items);Object.keys(x.row).forEach(f=>delete x.row[f]);Object.assign(x.row,saved);
          if(!bestMove||cmp(obj,bestObj)>0||(cmp(obj,bestObj)===0&&!bestMove)){bestObj=obj;bestMove={x,next,entry:top};}
        }
      }
      if(!bestMove)break;
      apply(bestMove.x,bestMove.next);bestMove.entry[1]--;
    }
    for(const x of items)x.row.gemLv=Object.fromEntries(keys.map(k=>[k,x.row.gemLv[k].slice().sort((a,b)=>data.gemNames[b]-data.gemNames[a])]));
  }
  const api={plan,hungarian,roleOf,PEN_SLOTS,spiritKey};
  if(typeof module!=='undefined')module.exports=api;else root.JormPlace=api;
  if(typeof document==='undefined'&&typeof importScripts==='function'){
    root.JormEngineNoWorker=true;importScripts('./jorm-data.js','./jorm-engine.js');
    root.onmessage=e=>{try{root.postMessage({result:plan(e.data,root.JormEngine,root.JormData,p=>root.postMessage({progress:p}))})}catch(err){root.postMessage({error:err.message})}};
  }
})(globalThis);
