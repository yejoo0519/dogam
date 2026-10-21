/* APK 6.35.0, arm64 Dragon::getDragonSpine / DragonSpine::setItemAura.
 * Item auras use the skeleton node origin, centre anchor and stage scale.
 * Do not align to the visible feet, tail or the animation bounding-box bottom.
 */
(function(root){
  'use strict';
  const profiles=Object.freeze({child1:1.1,child2:1.1,adult:1.6,capsule:1.2,capsule2:1.3,transcended:1.8,advent:1.8});
  function scale(id,stage){return /^item_aura[1-6]$/.test(id||'') ? (profiles[stage]||1.1) : 2;}
  function placement(id,bounds,worldScale=1){
    if(!/^item_aura[1-6]$/.test(id||'')||!bounds||![bounds.x0,bounds.x1,bounds.y0,bounds.y1].every(Number.isFinite))return{x:0,y:0};
    // Undo the preview's idle-bounds centring to recover skeleton (0, 0).
    const cx=(bounds.x0+bounds.x1)/2;
    const cy=(bounds.y0+bounds.y1)/2;
    return{x:-cx*worldScale,y:cy*worldScale};
  }
  // 게임 화면 800×480 기준 1배 고정 + 드래곤(기준 모션 중심)을 무대 정중앙에 고정.
  // 오라·모션이 화면보다 크면 인게임처럼 잘림.
  function fit(width,height,dragonWidth,dragonHeight,id,bounds,aura,worldScale=1,stage){
    const offset=placement(id,bounds,worldScale);
    return{zoom:Math.max(.01,width/800),x:width/2,y:height/2,offset};
  }
  root.AuraLayout=Object.freeze({profiles,scale,placement,fit});
})(globalThis);
