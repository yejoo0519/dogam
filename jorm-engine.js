/* Pure optimizer. No account, storage, or network access. */
(function(root){
  'use strict';
  const keys=['hp','atk','def'];
  // Standard hit reference, without user-configurable battle actions.
  function attack(atk,c,crit=1){return Math.floor(44*Math.floor(atk*crit*(c.dark?1.25:1)+1e-9)/322);}
  // Probability (on by default; pass enabled:false to turn off): tank evasion, dealer critical.
  // final% = base% (user input, estimate) + accessory% + potion%, clamped 0..100.
  function probability(c,data,acc,pot){
    const p=c.probability||{};if(p.enabled===false)return null;
    const rule=data.probability[c.role],gear=(acc[rule.kind]||0)+(pot[rule.kind]||0);
    const base=Number.isFinite(p.base)?p.base:rule.base;
    return {kind:rule.kind,base,gear,final:Math.min(100,Math.max(0,base+gear))};
  }
  // Tank: survival length / (1 - evasion). Dealer: expected hit with crit x2.
  function applyEvasion(score,prob){if(!prob)return score;const r=prob.final/100;return r>=1?Number.MAX_VALUE:score/(1-r);}
  function dealtWithCrit(atk,c,prob,mult){const n=attack(atk,c);if(!prob)return n;const r=prob.final/100;return n*(1-r)+attack(atk,c,mult)*r;}
  function potionCandidates(c,data){
    if(c.potion===true)return [{n:'물약',hp:24,atk:6,def:6,crit:0,eva:0}];
    if(!c.potion)return [{n:'물약 없음',hp:0,atk:0,def:0,crit:0,eva:0}];
    const list=data.potions[String(c.potion)];if(!list)throw Error('물약 단계를 확인해 주세요.');
    // potionKind ('crit'|'eva') fixes the potion type; otherwise all five types at that level are compared.
    if(c.potionKind){const only=list.filter(p=>p[c.potionKind]>0);if(!only.length)throw Error('물약 종류를 확인해 주세요.');return only;}
    return list;
  }
  // Fixed comparison scenario: front row, both rows full, every boss attack
  // hits, no guard/miss/heal/critical. Normal uses the larger single/spread hit;
  // special column attacks use 0.7. With these conditions the cycle is 5 hits.
  // light: false = non-light, true = 요르문간드 (x23/16), number = numerator over 16 (잠식 x5/4 = 20).
  const lightMul=light=>light===true?23:light?light:16;
  function endurance(hp,def,light=false){
    const denominator=def*lightMul(light)+352;
    const normal=Math.floor(44*5000*16/denominator);
    const special=Math.floor(44*3500*16/denominator);
    const cycle=normal*4+special;
    if(!cycle)return Infinity;
    const cycles=Math.max(0,Math.ceil(hp/cycle)-1),left=hp-cycles*cycle;
    if(normal&&left<=normal*4)return cycles*5+left/normal;
    return cycles*5+4+(left-normal*4)/special;
  }
  const reference=endurance(3000,500,false);
  // Upper bound used for pruning only: endurance(hp,def) <= 5*hp/C, C = 4N+S (holds in both branches).
  function cycleDamage(def,light){const den=def*lightMul(light)+352;return 4*Math.floor(44*5000*16/den)+Math.floor(44*3500*16/den);}
  function survivalUpper(hp,def,light){const C=cycleDamage(def,light);return C?100*5*hp/C/reference:Infinity;}
  function survivalScore(hp,def,light=false){return 100*endurance(hp,def,light)/reference;}
  // Penetration (관통): one hit at random 100%, no crit/evasion. bossAtk is back-calculated from a measured hit.
  function penetrationHit(def,bossAtk,light=false){return Math.floor(44*bossAtk*16/(def*lightMul(light)+352)+1e-9);}
  function penetrationHits(hp,def,bossAtk,light=false){const h=penetrationHit(def,bossAtk,light);return h>0?Math.floor((hp-1)/h):Infinity;}
  // Largest boss attack that still gives the measured damage (conservative: floor keeps the same hit).
  function penetrationAttack(damage,def,light=false){return (damage+1)*(def*lightMul(light)+352)/704-1e-6;}
  function stat(b,g,p,a,s,pend,plus,bonus,col){const x=Math.floor((b+g+p)*(1+a)+1e-9);const y=Math.floor((x+plus)*(1+s)+1e-9);return Math.floor(y*(1+pend)+1e-9)+bonus+col;}
  function spiritVariants(c,data){
    let rows=[[]];for(let i=0;i<4;i++){const opts=c.spirit[i];const stats=opts.stat==='auto'?keys:[opts.stat];const types=opts.type==='auto'?['%','+']:[opts.type];rows=rows.flatMap(r=>stats.flatMap(k=>types.map(type=>[...r,{stat:k,type}])));}
    return rows.flatMap(opts=>(c.bonus==='auto'?keys:[c.bonus]).map(bonus=>{
      const plus={hp:0,atk:0,def:0},pct={hp:0,atk:0,def:0};opts.forEach((o,i)=>{if(o.stat==='none')return;if(o.type==='+')plus[o.stat]+=data.plus[o.stat][i+1];else pct[o.stat]+=data.pct[i+1]});
      return {opts,bonus,plus,pct};
    }));
  }
  function validate(c){
    for(const k of keys)if(!Number.isFinite(c.collection[k])||c.collection[k]<0)throw Error('컬렉션 수치를 확인해 주세요.');
    if(!c.accessories.length||(c.pendantMode!=='auto'&&!c.pendants.length))throw Error('장신구와 펜던트 후보를 각각 하나 이상 선택해 주세요.');
  }
  function allPendants(){
    const result=[{name:'미착용',hp:0,atk:0,def:0}];
    const opts=keys.flatMap(stat=>Array.from({length:6},(_,i)=>({stat,val:i+1})));
    for(const [name,count] of [['별',1],['달',2],['태양',3]]){
      function build(start,slots,p){if(!slots){result.push(p);return}for(let i=start;i<opts.length;i++){const o=opts[i];build(i,slots-1,{...p,[o.stat]:p[o.stat]+o.val})}}
      build(0,count,{name,hp:0,atk:0,def:0});
    }
    return result;
  }
  // Keep 10 representatives for every attainable stat vector. A vector may be
  // removed only if at least 10 distinct candidates are no worse in every stat.
  // Hence the top-10 score multiset (including ties) is preserved, not only #1.
  function pendantFrontier(rows){
    const groups=new Map();for(const r of rows){const k=keys.map(x=>r[x]).join(',');const g=groups.get(k)||[];if(g.length<10)g.push(r);groups.set(k,g)}
    const gs=[...groups.values()];return gs.filter(g=>{let count=0;for(const other of gs){if(other===g)continue;if(keys.every(k=>other[0][k]>=g[0][k]))count+=other.length;if(count>=10)return false}return true}).flat();
  }
  function optimize(c,data,progress=()=>{}){
    validate(c);
    // boss: 'corrupted' = 잠식된 요르문간드 (light x5/4, 9.0 stats fixed); otherwise 요르문간드 (light x23/16).
    const corrupted=c.boss==='corrupted',lightArg=c.light?(corrupted?20:23):false,grade=corrupted?'9.0':c.grade;
    const spirits=spiritVariants(c,data),allocs=[];
    const allPend=c.pendantMode==='auto'?allPendants():c.pendants;
    const pends=c.pendantMode==='auto'?pendantFrontier(allPend):allPend;
    // c.gems = {hp,atk,def} (sum 5) fixes the gem split; otherwise all 21 splits are compared.
    if(c.gems){const g=Object.fromEntries(keys.map(k=>[k,Math.trunc(Number(c.gems[k]))]));if(keys.some(k=>!(g[k]>=0))||g.hp+g.atk+g.def!==5)throw Error('젬 배분은 체력·공격·방어 합계 5개로 입력해 주세요.');allocs.push(g);}
    else for(let h=0;h<=5;h++)for(let a=0;a<=5-h;a++)allocs.push({hp:h,atk:a,def:5-h-a});
    const types=c.type==='all'?data.types:[c.type],byType={};let tested=0,qualified=0;
    const potions=potionCandidates(c,data),critMult=data.probability.dealer.multiplier,tank=c.role==='tank';
    const enchants=c.enchant==='auto'?keys:[c.enchant];
    const total=types.length*c.accessories.length*potions.length*pends.length*spirits.length*allocs.length*enchants.length;
    // seq = original enumeration order; keeps tie order identical regardless of search order.
    const better=(a,b)=>(tank?(b.score-a.score||b.tankBV-a.tankBV||b.dealt-a.dealt):(b.dealt-a.dealt||b.tankBV-a.tankBV))||(a.seq??-1)-(b.seq??-1);
    let nextProgress=32768;
    // c.minHits = {hits, attack}: keep only rows that survive `hits` penetration hits (used by the placement calculator).
    const req=c.minHits&&c.minHits.attack>0?c.minHits:null;
    const maxPend=Object.fromEntries(keys.map(k=>[k,Math.max(...pends.map(p=>p[k]))]));
    // Pareto-maximal (hp,def) pendant pairs: exact upper bound of the tank score for one gem split.
    const pairs=[...new Map(pends.map(p=>[p.hp+','+p.def,p])).values()].filter(p=>!pends.some(q=>q.hp>=p.hp&&q.def>=p.def&&(q.hp>p.hp||q.def>p.def)));
    const pf=(v,p)=>Math.floor(v*(1+p/100)+1e-9);
    // Optimistic row from pre-pendant values; every stage is monotone, so this never undercuts a real row.
    function loose(h,a,d,add,prob){const hp=pf(h,maxPend.hp)+add.hp,df=pf(d,maxPend.def)+add.def,at=pf(a,maxPend.atk)+add.atk;const r={tankBV:hp*at*df,dealt:dealtWithCrit(at,c,tank?null:prob,critMult)};if(tank)r.score=applyEvasion(survivalScore(hp,df,lightArg),prob);return r;}
    function tight(h,a,d,add,prob){let score=-Infinity;for(const p of pairs){const v=survivalUpper(pf(h,p.hp)+add.hp,pf(d,p.def)+add.def,lightArg);if(v>score)score=v;}return {score:applyEvasion(score,prob),tankBV:(pf(h,maxPend.hp)+add.hp)*(pf(a,maxPend.atk)+add.atk)*(pf(d,maxPend.def)+add.def),dealt:attack(pf(a,maxPend.atk)+add.atk,c)};}
    const pass=(top,bound)=>top.length<10||better(bound,top[9])<=0;
    for(const type of types){const top=[];byType[type]=top;const base=data.base[grade][type];
      // Pruning. Every bound is >= any real row in the sort order, and blocks/spirit groups are visited
      // best-bound first, so the first one that fails the current 10th place ends that loop.
      // Tank group bounds use only hp/def for the score (tankBV/dealt bounds = Infinity); dealer bounds put 5 gems in every stat.
      const vals=(k,pot,accPct,sp)=>{const v=new Array(6);for(let g=0;g<6;g++)v[g]=stat(base[k],g*data.gems[c.gem][k],pot[k],accPct(k),sp.pct[k],0,sp.plus[k],0,0);return v;};
      const addOf=sp=>Object.fromEntries(keys.map(k=>[k,(sp.bonus===k?data.bonus[k]:0)+c.collection[k]]));
      function groupBound(pot,accPct,prob,sp){
        const add=addOf(sp);
        if(!tank){const g5=k=>stat(base[k],5*data.gems[c.gem][k],pot[k],accPct(k),sp.pct[k],0,sp.plus[k],0,0);return loose(g5('hp'),g5('atk'),g5('def'),add,prob);}
        const vh=vals('hp',pot,accPct,sp),vd=vals('def',pot,accPct,sp);let m=-Infinity;
        for(let g=0;g<6;g++)for(const p of pairs){const u=survivalUpper(pf(vh[g],p.hp)+add.hp,pf(vd[5-g],p.def)+add.def,lightArg);if(u>m)m=u;}
        return {score:applyEvasion(m,prob),tankBV:Infinity,dealt:Infinity};
      }
      // Tank: spirits with the same hp/def contribution share one bound.
      const groupMap=new Map();spirits.forEach((sp,si)=>{const k=tank?[sp.pct.hp,sp.pct.def,sp.plus.hp,sp.plus.def,sp.bonus==='atk'?'':sp.bonus].join():si;if(!groupMap.has(k))groupMap.set(k,[]);groupMap.get(k).push(si);});
      const groups=[...groupMap.values()];
      // For block bounds only the Pareto-maximal groups matter (bounds are monotone in these parts).
      const part=sp=>{const a=addOf(sp);return [sp.pct.hp,sp.pct.atk,sp.pct.def,sp.plus.hp,sp.plus.atk,sp.plus.def,a.hp,a.atk,a.def];};
      const parts=groups.map(g=>part(spirits[g[0]])),idx=tank?[0,2,3,5,6,8]:[1,4,7];
      const pareto=groups.filter((g,i)=>!parts.some((q,j)=>j!==i&&idx.every(t=>q[t]>=parts[i][t])&&idx.some(t=>q[t]>parts[i][t])));
      const blocks=[];
      c.accessories.forEach((ai,aPos)=>{const acc=data.accessories[ai];if(!acc)throw Error('장신구 번호가 올바르지 않습니다.');
        potions.forEach((pot,pPos)=>{const prob=probability(c,data,acc,pot);
          enchants.forEach((enchant,ePos)=>{const accPct=k=>acc[k]+(enchant===k?.21:0);
            let bound=null;for(const g of pareto){const b=groupBound(pot,accPct,prob,spirits[g[0]]);if(!bound||better(b,bound)<0)bound=b;}
            blocks.push({ai,pot,prob,enchant,accPct,seq:(aPos*potions.length+pPos)*enchants.length+ePos,bound});});});});
      blocks.sort((x,y)=>better(x.bound,y.bound));
      const perSpirit=allocs.length*pends.length;
      for(let bi=0;bi<blocks.length;bi++){const {ai,pot,prob,enchant,accPct,seq:bSeq,bound}=blocks[bi];
        if(!pass(top,bound)){tested+=(blocks.length-bi)*spirits.length*perSpirit;break;}
        const order=groups.map(g=>({g,bound:groupBound(pot,accPct,prob,spirits[g[0]])})).sort((x,y)=>better(x.bound,y.bound));
        for(let oi=0;oi<order.length;oi++){const {g,bound:gb}=order[oi];
          if(!pass(top,gb)){for(let r=oi;r<order.length;r++)tested+=order[r].g.length*perSpirit;break;}
          for(const si of g){const sp=spirits[si],adds=addOf(sp),values={};
            for(const k of keys)values[k]=vals(k,pot,accPct,sp);
            for(let gi=0;gi<allocs.length;gi++){const gems=allocs[gi];
              const h=values.hp[gems.hp],a=values.atk[gems.atk],d=values.def[gems.def];
              tested+=pends.length;
              if(!pass(top,loose(h,a,d,adds,prob))||(tank&&!pass(top,tight(h,a,d,adds,prob))))continue;
              if(req&&penetrationHits(pf(h,maxPend.hp)+adds.hp,pf(d,maxPend.def)+adds.def,req.attack,lightArg)<req.hits)continue;
              for(let pi=0;pi<pends.length;pi++){const pend=pends[pi];
                const stats={hp:pf(h,pend.hp)+adds.hp,atk:pf(a,pend.atk)+adds.atk,def:pf(d,pend.def)+adds.def};
                if(req&&penetrationHits(stats.hp,stats.def,req.attack,lightArg)<req.hits)continue;
                const tankBV=stats.hp*stats.atk*stats.def,dealt=dealtWithCrit(stats.atk,c,tank?null:prob,critMult);
                qualified++;const row={type,acc:ai,enchant,pend,spirit:{opts:sp.opts,bonus:sp.bonus},gems,potion:pot,probability:prob,stats,tankBV,dealt,score:tank?applyEvasion(survivalScore(stats.hp,stats.def,lightArg),prob):null,seq:((bSeq*spirits.length+si)*allocs.length+gi)*pends.length+pi};
                if(top.length<10||better(row,top[top.length-1])<0){top.push(row);top.sort(better);if(top.length>10)top.pop();}
              }
            }
            if(tested>=nextProgress){progress({tested,total});nextProgress=tested+100000;}
          }
        }
      }
    }
    for(const t in byType)for(const r of byType[t])delete r.seq;
    return {rows:Object.values(byType).flat().sort(better).slice(0,10),byType,tested,qualified,totalCandidates:total/pends.length*allPend.length};
  }
  const api={endurance,survivalScore,penetrationHit,penetrationHits,penetrationAttack,attack,probability,applyEvasion,dealtWithCrit,potionCandidates,stat,optimize,allPendants,pendantFrontier,spiritVariants};
  if(typeof module!=='undefined')module.exports=api;else root.JormEngine=api;
  if(typeof document==='undefined'&&typeof importScripts==='function'&&!root.JormEngineNoWorker){
    importScripts('./jorm-data.js');root.onmessage=e=>{try{root.postMessage({result:optimize(e.data,root.JormData,p=>root.postMessage({progress:p}))})}catch(err){root.postMessage({error:err.message})}};
  }
})(globalThis);
