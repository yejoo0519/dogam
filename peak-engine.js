/* Exact search over independent gear slots for one dragon; no spec/storage access. */
(function(w){
  'use strict';
  const D=w.PeakData,keys=['hp','atk','def'];
  const INT=x=>Math.floor(x+1e-9);
  function stat(B,G,P,AP,SP,PP,SL,SB,C,BU){return INT(INT(INT((B+G+P)*(1+AP))*(1+SP)+SL*(1+SP))*(1+PP))+SB+C+BU;}
  function buffs(n){const out=[];for(let h=0;h<=n;h++)for(let a=0;a<=n-h;a++){const d=n-h-a;out.push({h,a,d,label:[...Array(h).fill('체'),...Array(a).fill('공'),...Array(d).fill('방')].join('+')||'버프 없음'});}return out;}
  function pendants(){const out=[];for(let h=0;h<=3;h++)for(let a=0;a<=3-h;a++)out.push({type:'태양',options:[...Array(h).fill('hp'),...Array(a).fill('atk'),...Array(3-h-a).fill('def')].map(stat=>({stat,val:6}))});return out;}
  function allocations(gems){
    // For a fixed count of each stat, replacing a gem with a stronger same-stat
    // gem cannot reduce any final stat. Only the strongest five per stat matter.
    const tokens=Object.fromEntries(keys.map(s=>[s,Object.entries(D.GEM).sort((a,b)=>Number(b[0])-Number(a[0])).flatMap(([lv,g])=>Array(Math.min(5,gems[s]?.[lv]||0)).fill({s,lv:Number(lv),v:g[s]})).slice(0,5)]));
    const slots=Math.min(5,keys.reduce((n,s)=>n+tokens[s].length,0)),out=[];
    for(let h=0;h<=Math.min(slots,tokens.hp.length);h++)for(let a=0;a<=Math.min(slots-h,tokens.atk.length);a++){
      const d=slots-h-a;if(d>tokens.def.length)continue;
      const chosen=[...tokens.hp.slice(0,h),...tokens.atk.slice(0,a),...tokens.def.slice(0,d)];
      out.push({gems:chosen,h:chosen.filter(g=>g.s==='hp').reduce((s,g)=>s+g.v,0),a:chosen.filter(g=>g.s==='atk').reduce((s,g)=>s+g.v,0),d:chosen.filter(g=>g.s==='def').reduce((s,g)=>s+g.v,0)});
    }return out;
  }
  function validate(c){
    if(!D.BASE[c.grade]||c.mode!=='theory')throw Error('계산 모드와 등급을 확인해 주세요.');
    if(!Number.isInteger(c.buff)||c.buff<0||c.buff>2)throw Error('버프는 0~2단계로 선택해 주세요.');
    if(!Array.isArray(c.spirit?.opts)||c.spirit.opts.length!==4)throw Error('정령 옵션을 확인해 주세요.');
    for(const o of c.spirit.opts)if(o.stat&&!keys.includes(o.stat)||o.stat&&!['%','+'].includes(o.type))throw Error('정령 스탯과 옵션 종류를 선택해 주세요.');
    if(c.spirit.bonus&&!keys.includes(c.spirit.bonus))throw Error('부가옵을 확인해 주세요.');
  }

  async function calculate(input,onProgress=()=>{}){
    const c=JSON.parse(JSON.stringify(input));validate(c);
    const gems=Object.fromEntries(keys.map(s=>[s,{40:5}]));
    const accs=D.ACC_DB.map((a,index)=>({index,enc:'none'}));
    const pends=pendants(),allocs=allocations(gems),bs=buffs(c.buff),encs=keys;
    const plus={hp:0,atk:0,def:0},pct={hp:0,atk:0,def:0};
    c.spirit.opts.forEach((o,i)=>{if(o.stat){if(o.type==='+')plus[o.stat]+=D.SP_PLUS[o.stat][i+1];else pct[o.stat]+=D.SP_PCT[i+1];}});
    const total=D.DTYPES.length*bs.length*accs.length*(encs?3:1)*pends.length*allocs.length;
    let tested=0,last=performance.now();const rows=[];
    onProgress(0);await CalcProgress.yield();
    for(const type of D.DTYPES)for(const buff of bs){
      const top=[],base=D.BASE[c.grade][type];
      for(const ac of accs)for(const enc of encs||[ac.enc])for(const pend of pends){
        const acc=D.ACC_DB[ac.index],pp={hp:0,atk:0,def:0};for(const o of pend?.options||[])pp[o.stat]+=o.val/100;
        for(const alloc of allocs){
          const values=keys.map((s,i)=>stat(base[s],alloc[['h','a','d'][i]],[24,6,6][i],acc[s]+(enc===s?.21:0),pct[s],pp[s],plus[s],c.spirit.bonus===s?D.SP_BONUS[s]:0,[240,60,60][i],Math.floor(base[s]*buff[['h','a','d'][i]]*.2)));
          const bv=values[0]*values[1]*values[2];tested++;
          if(top.length<10||bv>top[top.length-1].bv){
            const row={type,buff,accIndex:ac.index,enc,pend,alloc,values,bv,tar:typeof tarPercent==='function'?tarPercent(bv,type,{hp:buff.h,atk:buff.a,def:buff.d}):null,order:tested};
            let i=0;while(i<top.length&&top[i].bv>=bv)i++;top.splice(i,0,row);if(top.length>10)top.pop();
          }
          if((tested&1023)===0&&performance.now()-last>=100){onProgress(Math.min(99,tested/total*100));await CalcProgress.yield();last=performance.now();}
        }
      }rows.push(...top);
    }
    onProgress(100);return {config:c,rows,tested};
  }
  w.PeakEngine={calculate,allocations,stat,buffs,pendants};
})(window);
