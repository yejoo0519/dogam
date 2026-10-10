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
    const results=slots.map((sl,i)=>{const r=table[i][best.pick[i]],k=cols[best.pick[i]];return {pos:sl.pos,role:sl.role,dragon:sl.dragon,spirit:k===noSpirit.key?null:kinds.get(k),row:r};});
    const front=results.filter(r=>r.role==='front'&&r.row),pens=results.filter(r=>r.role==='pen');
    return {results,pen:pen?{bossAtk,hits,passed:pens.filter(r=>r.row&&r.row.pass).length,total:pens.length}:null,
      summary:{frontMin:front.length?Math.min(...front.map(r=>r.row.score)):null,dealt:results.filter(r=>r.row&&(r.role==='dealer'||(r.role==='pen'&&r.row.pass))).reduce((a,r)=>a+r.row.dealt,0),spiritsUsed:results.filter(r=>r.spirit).length,spiritsOwned:units.length},evaluated:total};
  }
  const api={plan,hungarian,roleOf,PEN_SLOTS,spiritKey};
  if(typeof module!=='undefined')module.exports=api;else root.JormPlace=api;
  if(typeof document==='undefined'&&typeof importScripts==='function'){
    root.JormEngineNoWorker=true;importScripts('./jorm-data.js','./jorm-engine.js');
    root.onmessage=e=>{try{root.postMessage({result:plan(e.data,root.JormEngine,root.JormData,p=>root.postMessage({progress:p}))})}catch(err){root.postMessage({error:err.message})}};
  }
})(globalThis);
