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
  // 관통 피해 미입력 시: 실측으로 확정한 잠식 요르문간드 관통 공격 X = 2750 (난수 없음).
  // 관통 1회 = floor(44·X / (방어 × 방어계수 + 22)), 빛 방어계수 1.25. 측정 8건(일반·크리·가드·빛)과 일치.
  const PEN_ATK=2750;
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

  function plan(input,E,data,progress=()=>{}){return planOnce(input,E,data,progress);}
  function planOnce(input,E,data,progress=()=>{}){
    const measured=input.pen&&input.pen.damage>0&&input.pen.def>=0;
    const pen=measured?input.pen:(input.pen&&input.pen.reference?{reference:true}:null);
    const corrupted=input.boss==='corrupted',lightOf=l=>l?(corrupted?20:23):false;
    const hits=input.hits||4,guards=input.guards??1;
    const bossAtk=!pen?0:measured?E.penetrationAttack(pen.damage,pen.def,lightOf(pen.light)):PEN_ATK;
    const tough=(hp,def,light)=>hp*(def*(lightOf(light)||16)/16+22);
    const equip=input.mode==='equip';
    const normSp=s=>{const sp={opts:(s&&s.opts||[]).slice(0,4).map(o=>({stat:o.stat||'none',type:o.type||'%'})),bonus:(s&&s.bonus)||'none'};while(sp.opts.length<4)sp.opts.push({stat:'none',type:'%'});sp.key=spiritKey(sp);return sp.opts.every(o=>o.stat==='none')&&sp.bonus==='none'?noSpirit:sp;};
    // 정령 해제 모드: 칸에 놓인 드래곤에 보유 정령을 배분. 정령 장착 모드: 드래곤+정령 묶음을 자리에 배치.
    // 해제 모드 + 보유 드래곤 목록(input.units): 자리는 아래 규칙으로 계산기가 정합니다(20마리 초과 시 20마리 선택).
    const freeUnits=!equip&&Array.isArray(input.units)?input.units.filter(u=>u&&u.dragon).map(u=>u.dragon):null;
    const slots=equip||freeUnits?[]:(input.slots||[]).map((d,pos)=>d?{pos,dragon:d,role:roleOf(pos,pen)}:null).filter(Boolean);
    const unitsIn=equip?(input.units||[]).filter(u=>u&&u.dragon).slice(0,20).map(u=>({dragon:u.dragon,sp:normSp(u.spirit)})):[];
    if(equip?!unitsIn.length:freeUnits?!freeUnits.length:!slots.length)throw Error('배치할 드래곤을 한 마리 이상 넣어 주세요.');
    const kinds=new Map([[noSpirit.key,noSpirit]]),units=[];
    if(equip)for(const u of unitsIn){if(!kinds.has(u.sp.key))kinds.set(u.sp.key,u.sp);}
    else for(const s of input.spirits||[]){const sp=normSp(s);if(sp.key===noSpirit.key)continue;if(!kinds.has(sp.key))kinds.set(sp.key,sp);for(let i=0;i<Math.max(1,s.count|0);i++)units.push(sp.key);}
    // 보유 장신구(input.accessories=[{i,count}]): 없으면 장신구 제한 없이 최적화. 모자라는 칸은 '장신구 없음'.
    const NO_ACC=data.accessories.length,dataX={...data,accessories:[...data.accessories,{n:'장신구 없음',hp:0,atk:0,def:0,crit:0,eva:0}]};
    const ak=accessoryKinds(input.accessories,NO_ACC);
    const base={boss:input.boss,type:'',grade:corrupted?'9.0':input.grade,gem:input.gem,enchant:input.enchant,potion:input.potion,collection:input.collection,buffs:input.buffs||null,accessories:data.accessories.map((_,i)=>i),pendantMode:'auto',pendants:[]};
    // 보유 펜던트: 정령 배분은 펜던트 없이 정한 뒤, 보유 펜던트를 칸마다 나눠 줍니다(distributePendants).
    const pk=pendantKinds(input.pendants,E);
    const cache=new Map(),jobs=new Set();
    const jobKey=(sl,k,pid=pk?pk.def:'',aid=ak?ak.def:'')=>[sl.role,sl.dragon.type,sl.role==='dealer'?'':!!sl.dragon.light,sl.role==='front'?'':!!sl.dragon.dark,k,pid,aid].join('|');
    const positions=[...Array(20).keys()].map(pos=>({pos,role:roleOf(pos,pen)}));
    const rolesUsed=[...new Set(positions.map(x=>x.role))];
    if(equip){for(const u of unitsIn)for(const role of rolesUsed)jobs.add(jobKey({role,dragon:u.dragon},u.sp.key));}
    else for(const sl of slots)for(const k of kinds.keys())jobs.add(jobKey(sl,k));
    const total=jobs.size*(pk?pk.kinds.size:1)*(ak?ak.kinds.size:1);let done=0;
    function evaluate(sl,k,pid=pk?pk.def:'',aid=ak?ak.def:''){
      const key=jobKey(sl,k,pid,aid);if(cache.has(key))return cache.get(key);
      const sp=kinds.get(k),d=sl.dragon,c={...base,type:d.type,light:!!d.light,dark:!!d.dark,spirit:sp.opts,bonus:sp.bonus,...(pk?{pendantMode:'manual',pendants:pk.kinds.get(pid)}:{}),...(ak?{accessories:ak.kinds.get(aid)}:{})};
      let row,ok=true;
      if(sl.role==='front')row=E.optimize({...c,role:'tank',potionKind:'eva'},dataX).rows[0];
      else if(sl.role==='dealer')row=E.optimize({...c,role:'dealer',potionKind:'crit'},dataX).rows[0];
      else{
        row=E.optimize({...c,role:'dealer',potionKind:'crit',minHits:{hits,guards,attack:bossAtk}},dataX).rows[0];
        // No setting survives: fall back to the sturdiest (tank) setting and report the hit count.
        if(!row){ok=false;row=E.optimize({...c,role:'tank',potionKind:'crit'},dataX).rows[0];}
      }
      const r=row?{...row,pass:ok}:null;
      if(r&&sl.role==='pen'){r.penTough=tough(r.stats.hp,r.stats.def,d.light);r.penHit=E.penetrationHit(r.stats.def,bossAtk,lightOf(d.light));r.penHits=E.penetrationHits(r.stats.hp,r.stats.def,bossAtk,lightOf(d.light));r.penGuard=E.penetrationGuardHit(r.stats.def,bossAtk,lightOf(d.light));r.penLeft=r.stats.hp-hits*r.penHit-guards*r.penGuard;}
      if(r&&sl.role==='front'&&r.score==null)r.score=0;
      if(r)r.accName=dataX.accessories[r.acc].n;
      cache.set(key,r);done++;progress({done,total});return r;
    }
    // Lexicographic weights. Scores ~10^2-10^3, dealt sums < 10^6.
    // (장착 모드) 앞라인 채우기 > 관통 통과 > 앞라인 최저 점수 > 딜 합 + 앞라인 합
    const W_FILL=1e12,W_PASS=1e10,W_LOW=1e8;
    const valueOf=(role,r,T,x)=>{if(!r)return -1e13;if(equip&&x&&x.fixedRole&&x.fixedRole!==role)return -1e13;
      if(role==='front')return (equip?W_FILL:0)+(r.score<T?-W_LOW:0)+r.score*1e-3;
      if(role==='pen')return r.pass?W_PASS+r.dealt:r.penHits*1e-3;
      return r.dealt;};
    // rows = 칸(해제) 또는 드래곤(장착), cols = 정령(해제) 또는 자리(장착)
    // 역할 정하기(규칙): 탱커형(체력·방어·체방) 중 탱커 점수 상위 10 → 앞라인, 나머지 중 딜 상위 6 → 딜러,
    // 남은 드래곤 → 관통(정타 4 + 가드 1 셋팅). 관통 자리가 없으면(잠식 아님) 뒷라인 10마리 모두 딜러.
    const TANK_TYPES=['체력형','방어형','체방형'];let benched=[];
    const dealtOf=(d,k)=>{const r=evaluate({role:'dealer',dragon:d},k);return r?r.dealt:-Infinity;};
    const frontOf=(d,k)=>{const r=evaluate({role:'front',dragon:d},k);return r?r.score:-Infinity;};
    if(equip){
      const left=unitsIn.map((u,i)=>i),take=(list,n,score)=>list.sort((a,b)=>score(b)-score(a)).slice(0,n);
      const tanks=left.filter(i=>TANK_TYPES.includes(unitsIn[i].dragon.type));
      let front=take(tanks,10,i=>frontOf(unitsIn[i].dragon,unitsIn[i].sp.key));
      if(front.length<10)front=front.concat(take(left.filter(i=>!front.includes(i)),10-front.length,i=>frontOf(unitsIn[i].dragon,unitsIn[i].sp.key)));
      const rest=left.filter(i=>!front.includes(i));
      // 딜이 같으면 빛(방어 보정 → 관통에 유리)이 아닌 쪽을 딜러로.
      const dealers=pen?rest.slice().sort((a,b)=>dealtOf(unitsIn[b].dragon,unitsIn[b].sp.key)-dealtOf(unitsIn[a].dragon,unitsIn[a].sp.key)||!!unitsIn[a].dragon.light-!!unitsIn[b].dragon.light).slice(0,6):rest;
      unitsIn.forEach((u,i)=>{u.fixedRole=front.includes(i)?'front':dealers.includes(i)?'dealer':'pen';});
    }else if(freeUnits){
      // 해제 모드(보유 드래곤): 정령 없이 평가해 앞라인 10(탱커형 우선) → 딜러 6 → 관통 4(4+1 통과 > 딜). 남는 드래곤은 제외.
      const left=freeUnits.map((d,i)=>i),by=(score)=>(a,b)=>score(b)-score(a);
      const fr=i=>frontOf(freeUnits[i],noSpirit.key),dl=i=>dealtOf(freeUnits[i],noSpirit.key);
      let front=left.filter(i=>TANK_TYPES.includes(freeUnits[i].type)).sort(by(fr)).slice(0,10);
      if(front.length<10)front=front.concat(left.filter(i=>!front.includes(i)).sort(by(fr)).slice(0,10-front.length));
      let rest=left.filter(i=>!front.includes(i));
      const nDeal=pen?6:10;
      const dealers=rest.slice().sort((a,b)=>dl(b)-dl(a)||!!freeUnits[a].light-!!freeUnits[b].light).slice(0,nDeal);
      rest=rest.filter(i=>!dealers.includes(i));
      const penEval=i=>evaluate({role:'pen',dragon:freeUnits[i]},noSpirit.key);
      const pens=pen?rest.slice().sort((a,b)=>{const ra=penEval(a),rb=penEval(b);return (!!(rb&&rb.pass))-(!!(ra&&ra.pass))||((rb?rb.dealt:0)-(ra?ra.dealt:0));}).slice(0,4):[];
      const POS={front:[0,1,2,3,4,5,6,7,8,9],dealer:pen?[10,11,12,17,18,19]:[10,11,12,13,14,15,16,17,18,19],pen:[13,14,15,16]};
      front.forEach((i,j)=>slots.push({pos:POS.front[j],dragon:freeUnits[i],role:'front'}));
      dealers.forEach((i,j)=>slots.push({pos:POS.dealer[j],dragon:freeUnits[i],role:'dealer'}));
      pens.forEach((i,j)=>slots.push({pos:POS.pen[j],dragon:freeUnits[i],role:'pen'}));
      const used=new Set([...front,...dealers,...pens]);benched=left.filter(i=>!used.has(i)).map(i=>freeUnits[i]);
    }else if(pen){
      // 해제 모드: 앞라인은 놓은 그대로. 뒷라인 드래곤 중 정령 없이 딜이 높은 6마리를 딜러 칸에, 나머지를 관통 칸에.
      const back=slots.filter(sl=>sl.pos>=10),ds=back.map(sl=>sl.dragon).sort((a,b)=>dealtOf(b,noSpirit.key)-dealtOf(a,noSpirit.key)||!!a.light-!!b.light);
      const dealSlots=back.filter(sl=>sl.role==='dealer'),penSlots=back.filter(sl=>sl.role==='pen');
      const nDeal=Math.min(dealSlots.length,ds.length);
      dealSlots.slice(0,nDeal).forEach((sl,i)=>{sl.dragon=ds[i];});
      penSlots.forEach((sl,i)=>{if(ds[nDeal+i])sl.dragon=ds[nDeal+i];});
    }
    const rows=equip?unitsIn:slots;
    const cols=equip?positions:[...units,...slots.map(()=>noSpirit.key)];
    const roleAt=(i,j)=>equip?cols[j].role:rows[i].role;
    // rowPid[i] = i번째 칸(해제) 또는 드래곤(장착)에 낀 펜던트 종류. 펜던트를 입력하지 않으면 '' (제한 없이 최적화).
    function assign(rowPid,rowAid){
    const table=equip?unitsIn.map((u,i)=>{const byRole=new Map(rolesUsed.map(role=>[role,evaluate({role,dragon:u.dragon},u.sp.key,rowPid[i],rowAid[i])]));return positions.map(x=>byRole.get(x.role));})
      :slots.map((sl,i)=>{const byKind=new Map();for(const k of kinds.keys())byKind.set(k,evaluate(sl,k,rowPid[i],rowAid[i]));return cols.map(k=>byKind.get(k));});
    function solve(T){
      const cost=rows.map((x,i)=>table[i].map((r,j)=>-valueOf(roleAt(i,j),r,T,x)));
      const pick=hungarian(cost);
      let passes=0,low=0,fronts=0;rows.forEach((_,i)=>{const role=roleAt(i,pick[i]),r=table[i][pick[i]];if(role==='pen'&&r&&r.pass)passes++;if(role==='front'){fronts++;if(r&&r.score<T)low++;}});
      return {pick,passes,low,fronts};
    }
    let best=solve(-Infinity);const maxPass=best.passes,maxFront=best.fronts;
    // Largest T such that every front slot reaches T without losing a penetration pass (or a front slot).
    const cands=[...new Set(rows.flatMap((_,i)=>table[i].filter((r,j)=>r&&roleAt(i,j)==='front').map(r=>r.score)))].sort((a,b)=>a-b);
    if(maxFront){let lo=0,hi=cands.length-1;
      while(lo<=hi){const mid=(lo+hi)>>1,s=solve(cands[mid]);if(s.low===0&&s.passes===maxPass&&s.fronts===maxFront){best=s;lo=mid+1;}else hi=mid-1;}}
    return rows.map((x,i)=>{const j=best.pick[i],r=table[i][j];
      if(equip)return {ri:i,pos:cols[j].pos,role:cols[j].role,dragon:x.dragon,spirit:x.sp.key===noSpirit.key?null:x.sp,row:r&&{...r},pid:rowPid[i],aid:rowAid[i]};
      const k=cols[j];return {ri:i,pos:x.pos,role:x.role,dragon:x.dragon,spirit:k===noSpirit.key?null:kinds.get(k),row:r&&{...r},pid:rowPid[i],aid:rowAid[i]};});
    }
    // 펜던트 입력 시: 모든 칸에 기본 펜던트를 낀 상태로 정령(자리)을 배분 → 보유 펜던트 배분 →
    // 그 펜던트로 정령(자리) 배분을 다시 계산. 펜던트 배치가 더 바뀌지 않을 때까지 반복합니다(최대 5회).
    let rowPid=rows.map(()=>pk?pk.def:''),rowAid=rows.map(()=>ak?ak.def:''),results=assign(rowPid,rowAid);
    // 보유 펜던트·장신구: 칸마다 나눠 준 뒤 그 장비로 정령(자리) 배분을 다시 계산. 바뀌지 않을 때까지 반복(최대 5회).
    const spk=x=>x.spirit?x.spirit.key:noSpirit.key;
    if(pk||ak)for(let it=0;it<5;it++){
      if(pk)distributeItems(results,pk,'pid',(x,pid)=>evaluate({role:x.role,dragon:x.dragon},spk(x),pid,x.aid));
      if(ak)distributeItems(results,ak,'aid',(x,aid)=>evaluate({role:x.role,dragon:x.dragon},spk(x),x.pid,aid));
      const nextP=rows.map((_,i)=>results.find(x=>x.ri===i).pid),nextA=rows.map((_,i)=>results.find(x=>x.ri===i).aid);
      if(it&&nextP.every((p,i)=>p===rowPid[i])&&nextA.every((p,i)=>p===rowAid[i]))break;
      const prev=results,prevObj=objective(prev);rowPid=nextP;rowAid=nextA;results=assign(rowPid,rowAid);
      // 재배분 결과가 더 나쁘면 이전 결과를 유지합니다.
      if(cmpObj(objective(results),prevObj)<0){results=prev;break;}
    }
    if(equip)results.forEach(x=>slots.push({pos:x.pos}));
    if(input.gemStock)distributeGems(results,input,E,dataX,{bossAtk,hits,guards,lightOf,tough,grade:base.grade});
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
    return {results,benched:benched.map(d=>d.id),pen:pen?{reference:!measured,bossAtk,hits,guards,passed:pens.filter(r=>r.row&&r.row.pass).length,total:pens.length}:null,
      summary:{frontMin:front.length?Math.min(...front.map(r=>r.row.score)):null,dealt:results.filter(r=>r.row&&(r.role==='dealer'||(r.role==='pen'&&r.row.pass))).reduce((a,r)=>a+r.row.dealt,0),spiritsUsed:results.filter(r=>r.spirit).length,spiritsOwned:equip?results.filter(r=>r.spirit).length:units.length,pendantsUsed:pk?results.filter(r=>r.pid&&r.pid!=='none').length:null,pendantsOwned:pk?pk.owned:null,accessoriesUsed:ak?results.filter(r=>r.aid&&r.aid!=='none').length:null,accessoriesOwned:ak?ak.owned:null},mode:equip?'equip':'free',evaluated:total};
  }
  // 펜던트 종류: none = 미착용. count 모드는 태양/달 옵션을 칸마다 고르고(후보 전체), list 모드는 입력한 펜던트 그대로.
  function pendantKinds(p,E){
    if(!p)return null;
    const none={name:'미착용',hp:0,atk:0,def:0},kinds=new Map([['none',[none]]]),stock={};
    const cap=x=>Math.max(0,Math.min(20,Math.trunc(Number(x))||0));
    if(p.mode==='count'){
      const val=Math.max(1,Math.min(6,Math.trunc(Number(p.val))||6));
      const combos=(name,n)=>{const out=[];const ks=['hp','atk','def'];(function b(st,left,cur){if(!left){out.push(cur);return}for(let i=st;i<3;i++)b(i,left-1,{...cur,[ks[i]]:cur[ks[i]]+val});})(0,n,{name,hp:0,atk:0,def:0});return out;};
      if(cap(p.sun)){kinds.set('sun',combos('태양',3));stock.sun=cap(p.sun);}
      if(cap(p.moon)){kinds.set('moon',combos('달',2));stock.moon=cap(p.moon);}
    }else for(const it of p.items||[]){
      const row={name:String(it.name||'펜던트'),hp:0,atk:0,def:0};(it.options||[]).forEach(o=>{if(row[o.stat]!=null)row[o.stat]+=Math.max(0,Math.min(6,Math.trunc(Number(o.val))||0));});
      const id=row.name+':'+row.hp+','+row.atk+','+row.def;if(!kinds.has(id))kinds.set(id,[row]);stock[id]=(stock[id]||0)+cap(it.count);
    }
    // 처음 정령 배분에 쓸 기본 펜던트: 가장 많이 가진 종류 (태양 > 달 순으로 동률 처리).
    const def=Object.keys(stock).sort((a,b)=>stock[b]-stock[a]||(b==='sun')-(a==='sun'))[0]||'none';
    return {kinds,stock,def,owned:Object.values(stock).reduce((a,b)=>a+b,0)};
  }
  // 보유 장신구: [{i: 장신구 번호, count}] → 종류별 후보(번호 하나)와 수량. 'none' = 장신구 없음.
  function accessoryKinds(list,noIdx){
    if(!Array.isArray(list))return null;
    const kinds=new Map([['none',[noIdx]]]),stock={};
    for(const it of list){const i=Math.trunc(Number(it&&it.i)),n=Math.max(0,Math.min(20,Math.trunc(Number(it&&it.count))||0));if(!(i>=0&&i<noIdx)||!n)continue;const id='a'+i;kinds.set(id,[i]);stock[id]=Math.min(20,(stock[id]||0)+n);}
    if(!Object.keys(stock).length)return null;
    const def=Object.keys(stock).sort((a,b)=>stock[b]-stock[a])[0];
    return {kinds,stock,def,owned:Object.values(stock).reduce((a,b)=>a+b,0)};
  }
  // 4번째 항: 체·공·방 곱(tankBV)의 합. 앞의 목표가 같으면 스탯이 오르는 쪽을 골라, 이득이 없는 칸에도 남는 펜던트를 끼웁니다.
  const objective=list=>{let passes=0,min=Infinity,sum=0,bv=0;
    for(const x of list){const r=x.row;if(!r)continue;bv+=r.tankBV||0;
      if(x.role==='front'){min=Math.min(min,r.score);sum+=r.score*1e-3;}
      else if(x.role==='pen'){if(r.pass){passes++;sum+=r.dealt;}else sum+=(r.penLeft??r.penHits)*1e-6;}
      else sum+=r.dealt;}
    return [passes,min,sum,bv];};
  const cmpObj=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2]||a[3]-b[3];
  // 보유 펜던트 배분: 펜던트 하나를 어느 칸에 끼우거나 바꿔 끼울 때(뺀 것은 다시 보유로) 목표
  // (관통 통과 수 > 앞라인 최저 점수 > 딜 합 + 앞라인 합)가 가장 좋아지는 수를 반복합니다.
  // 목표가 매번 엄격히 좋아져야 하므로 반드시 끝납니다. 칸의 장신구·젬 등은 그 펜던트 기준으로 다시 고릅니다.
  // 펜던트(field 'pid')·장신구(field 'aid') 공통.
  function distributeItems(results,pk,field,evalRow){
    const stock={...pk.stock},items=results.filter(x=>x.row);
    items.forEach(x=>{x[field]='none';const r=evalRow(x,'none');if(r)x.row={...r};});
    for(let guard=0;guard<200;guard++){
      let best=null,bestObj=objective(items);
      for(const pid of Object.keys(stock)){if(stock[pid]<=0)continue;
        for(const x of items){if(x[field]===pid)continue;
          const r=evalRow(x,pid);if(!r)continue;
          const saved=x.row;x.row=r;const obj=objective(items);x.row=saved;
          if(cmpObj(obj,bestObj)>0){bestObj=obj;best={x,pid,r};}
        }}
      if(!best)break;
      if(best.x[field]!=='none')stock[best.x[field]]++;
      stock[best.pid]--;best.x[field]=best.pid;best.x.row={...best.r};
    }
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
        const v=pf(E.stat(b[k],gem,r.potion[k],acc[k]+(r.enchant===k?.21:0),pct,0,plus,0,0),r.pend[k])+add,bu=(input.buffs||{})[k]||0;
        out[k]=bu>0?Math.floor(v*(1+bu/100)+1e-9):v;
      }
      return out;
    }
    function measure(x,stats){
      const r=x.row,light=ctx.lightOf(x.dragon.light);
      if(x.role==='front'){const prob=r.probability&&r.probability.kind==='eva'?r.probability:null;return {score:E.applyEvasion(E.survivalScore(stats.hp,stats.def,light),prob)};}
      const c={dark:!!x.dragon.dark,boss:input.boss};
      const out={dealt:E.dealtWithCrit(stats.atk,c,r.probability&&r.probability.kind==='crit'?r.probability:null,mult)};
      if(x.role==='pen'){out.penTough=ctx.tough(stats.hp,stats.def,x.dragon.light);out.penHit=E.penetrationHit(stats.def,ctx.bossAtk,light);out.penHits=E.penetrationHits(stats.hp,stats.def,ctx.bossAtk,light);out.penGuard=E.penetrationGuardHit(stats.def,ctx.bossAtk,light);out.penLeft=stats.hp-ctx.hits*out.penHit-ctx.guards*out.penGuard;out.pass=out.penLeft>0;}
      return out;
    }
    function apply(x,lv){const stats=restat(x,lv);Object.assign(x.row,{stats,tankBV:stats.hp*stats.atk*stats.def},measure(x,stats));x.row.gemLv=lv;}
    items.forEach(x=>apply(x,x.row.gemLv));
    const cmp=cmpObj;
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
