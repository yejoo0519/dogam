/* Source: user-provided 초등계산기.html. No network or account storage. */
const TYPES={체력형:[557,82,82],공격형:[405,120,82],방어형:[405,82,120],체공형:[481,120,63],체방형:[481,63,120],공방형:[405,101,101]};
function calculate(type,stats){
  if(!TYPES[type])throw new RangeError('Unknown type');
  const s=['hp','atk','def'].map(k=>{const v=stats[k];if(!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite))throw new TypeError('Invalid stat');return v[0]+v[1]*19;});
  const lack=TYPES[type].map((v,i)=>Math.max(0,v-s[i]));
  const raw=Math.max(0,7-lack[0]*.025-lack[1]*.1-lack[2]*.1);
  return {level20:{hp:s[0],atk:s[1],def:s[2]},raw,grade:Math.round((raw+Number.EPSILON)*100)/100};
}
module.exports={TYPES,calculate};
