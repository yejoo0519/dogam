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
    const pen=input.pen&&input.pen.damage>0&&input.pen.def>=0?input.pen:null;
    const corrupted=input.boss==='corrupted',lightOf=l=>l?(corrupted?20:23):false;
    const hits=input.hits||4;
    const bossAtk=pen?E.penetrationAttack(pen.damage,pen.def,lightOf(pen.light)):0;
    const slots=input.slots.map((d,pos)=>d?{pos,dragon:d,role:roleOf(pos,pen)}:null).filter(Boolean);
    if(!slots.length)throw Error('배치할 드래곤을 한 마리 이상 넣어 주세요.');
    // Spirit units (each owned spirit once) + a "no spirit" column per slot.
    const kinds=new Map([[noSpirit.key,noSpirit]]),units=[];
    for(const s of input.spirits||[]){const sp={opts:s.opts.map(o=>({stat:o.stat||'none',type:o.type||'%'})),bonus:s.bonus||'none'};sp.key=spiritKey(sp);if(sp.key===noSpirit.key)continue;if(!kinds.has(sp.key))kinds.set(sp.key,sp);for(let i=0;i<Math.max(1,s.count|0);i++)units.push(sp.key);}
    const base={boss:input.boss,type:'',grade:corrupted?'9.0':input.grade,gem:input.gem,enchant:input.enchant,potion:input.potion,collection:input.collection,accessories:data.accessories.map((_,i)=>i),pendantMode:'auto',pendants:[]};
    const cache=new Map(),jobs=new Set();
    const jobKey=(sl,k)=>[sl.role,sl.dragon.type,sl.role==='dealer'?'':!!sl.dragon.light,sl.role==='front'?'':!!sl.dragon.dark,k].join('|');
    for(const sl of slots)for(const k of kinds.keys())jobs.add(jobKey(sl,k));
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
      if(r&&sl.role==='pen'){r.penHit=E.penetrationHit(r.stats.def,bossAtk,lightOf(d.light));r.penHits=E.penetrationHits(r.stats.hp,r.stats.def,bossAtk,lightOf(d.light));}
      if(r&&sl.role==='front'&&r.score==null)r.score=0;
      cache.set(key,r);done++;progress({done,total});return r;
    }
    const cols=[...units,...slots.map(()=>noSpirit.key)];
    const table=slots.map(sl=>{const byKind=new Map();for(const k of kinds.keys())byKind.set(k,evaluate(sl,k));return cols.map(k=>byKind.get(k));});
    // Lexicographic weights. Scores ~10^2-10^3, dealt sums < 10^6.
    const W_PASS=1e10,W_LOW=1e8;
    const valueOf=(sl,r,T)=>{if(!r)return -1e12;
      if(sl.role==='front')return (r.score<T?-W_LOW:0)+r.score*1e-3;
      if(sl.role==='pen')return r.pass?W_PASS+r.dealt:r.penHits*1e-3;
      return r.dealt;};
    function solve(T){
      const cost=slots.map((sl,i)=>table[i].map(r=>-valueOf(sl,r,T)));
      const pick=hungarian(cost);
      let passes=0,low=0;slots.forEach((sl,i)=>{const r=table[i][pick[i]];if(sl.role==='pen'&&r&&r.pass)passes++;if(sl.role==='front'&&r&&r.score<T)low++;});
      return {pick,passes,low};
    }
    let best=solve(-Infinity);const maxPass=best.passes;
    // Largest T such that every front slot reaches T without losing a penetration pass.
    const fronts=slots.map((sl,i)=>sl.role==='front'?i:-1).filter(i=>i>=0);
    if(fronts.length){
      const cands=[...new Set(fronts.flatMap(i=>table[i].filter(Boolean).map(r=>r.score)))].sort((a,b)=>a-b);
      let lo=0,hi=cands.length-1;
      while(lo<=hi){const mid=(lo+hi)>>1,s=solve(cands[mid]);if(s.low===0&&s.passes===maxPass){best=s;lo=mid+1;}else hi=mid-1;}
    }
    const results=slots.map((sl,i)=>{const r=table[i][best.pick[i]],k=cols[best.pick[i]];return {pos:sl.pos,role:sl.role,dragon:sl.dragon,spirit:k===noSpirit.key?null:kinds.get(k),row:r&&{...r}};});
    if(input.gemStock)distributeGems(results,input,E,data,{bossAtk,hits,lightOf,grade:base.grade});
    const front=results.filter(r=>r.role==='front'&&r.row),pens=results.filter(r=>r.role==='pen');
    return {results,pen:pen?{bossAtk,hits,passed:pens.filter(r=>r.row&&r.row.pass).length,total:pens.length}:null,
      summary:{frontMin:front.length?Math.min(...front.map(r=>r.row.score)):null,dealt:results.filter(r=>r.row&&(r.role==='dealer'||(r.role==='pen'&&r.row.pass))).reduce((a,r)=>a+r.row.dealt,0),spiritsUsed:results.filter(r=>r.spirit).length,spiritsOwned:units.length},evaluated:total};
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
      if(x.role==='pen'){out.penHit=E.penetrationHit(stats.def,ctx.bossAtk,light);out.penHits=E.penetrationHits(stats.hp,stats.def,ctx.bossAtk,light);out.pass=out.penHits>=ctx.hits;}
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
