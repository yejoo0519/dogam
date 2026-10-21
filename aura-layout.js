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
  function fit(width,height,dragonWidth,dragonHeight,id,bounds,aura,worldScale=1,stage){
    const offset=placement(id,bounds,worldScale),s=scale(id,stage);
    let x0=-dragonWidth/2,x1=dragonWidth/2,y0=-dragonHeight/2,y1=dragonHeight/2;
    for(const side of ['back','front'])for(const f of aura?.[side]?.frames||[]){
      x0=Math.min(x0,offset.x+(-f.w/2+f.ox)*s);
      x1=Math.max(x1,offset.x+(f.w/2+f.ox)*s);
      y0=Math.min(y0,offset.y+(-f.h/2-f.oy)*s);
      y1=Math.max(y1,offset.y+(f.h/2-f.oy)*s);
    }
    const zoom=Math.max(.01,Math.min(1,width/820,(width-24)/Math.max(1,x1-x0),(height-24)/Math.max(1,y1-y0)));
    return{zoom,x:width/2-(x0+x1)/2*zoom,y:height/2-(y0+y1)/2*zoom,offset};
  }
  root.AuraLayout=Object.freeze({profiles,scale,placement,fit});
})(globalThis);
