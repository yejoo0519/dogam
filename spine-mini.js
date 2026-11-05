/* 최소 Spine 런타임 (region attachment 전용) — aura-preview.html의 런타임을 분리한 것.
 추가: draworder(구버전 키) 지원, slot blend additive 지원 */
/* ---------- 아틀라스 파서 ---------- */
function parseAtlas(text){
 const lines = text.split(/\r?\n/);
 const regions = {};
 let i = 0, page = null, cur = null;

 while(i < lines.length){
 const line = lines[i];
 if(line.trim() === ''){ cur = null; i++; continue; }

 if(!page){ page = line.trim(); i++;
 // 페이지 헤더(size/format/filter/repeat) 건너뛰기
 while(i < lines.length && lines[i].indexOf(':') !== -1){ i++; }
 continue;
 }
 if(line.indexOf(':') === -1){
 cur = line.trim();
 regions[cur] = { name: cur, rotate:false, x:0,y:0,w:0,h:0,
 ow:0,oh:0, ox:0,oy:0 };
 i++; continue;
 }
 const idx = line.indexOf(':');
 const key = line.slice(0, idx).trim();
 const val = line.slice(idx+1).trim();
 const nums = val.split(',').map(s =>parseFloat(s));
 const r = regions[cur];
 if(r){
 if(key === 'rotate') r.rotate = (val === 'true');
 else if(key === 'xy') { r.x = nums[0]; r.y = nums[1]; }
 else if(key === 'size') { r.w = nums[0]; r.h = nums[1]; }
 else if(key === 'orig') { r.ow = nums[0]; r.oh = nums[1]; }
 else if(key === 'offset') { r.ox = nums[0]; r.oy = nums[1]; }
 }
 i++;
 }
 // 짧은 이름(마지막 경로 조각)으로도 찾을 수 있게 별칭 추가
 const alias = {};
 for(const k in regions){
 alias[k] = regions[k];
 const short = k.split('/').pop();
 if(!(short in alias)) alias[short] = regions[k];
 }
 return { page, regions: alias };
}

/* ---------- 커브 보간 ---------- */
function bezierAt(p1, p2, t){
 const u = 1 - t;
 return 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t;
}
function curvePercent(curve, percent){
 if(curve === undefined || curve === null) return percent; // 선형
 if(curve === 'stepped') return 0; // 계단
 const c1 = curve[0], c2 = curve[1], c3 = curve[2], c4 = curve[3];
 let lo = 0, hi = 1, t = percent;
 for(let i = 0; i < 14; i++){
 const x = bezierAt(c1, c3, t);
 if(x < percent) lo = t; else hi = t;
 t = (lo + hi) / 2;
 }
 return bezierAt(c2, c4, t);
}
/* 각도를 -180~180으로 감기 (최단 경로) */
function wrapDeg(a){
 a = a % 360;
 if(a >180) a -= 360;
 else if(a < -180) a += 360;
 return a;
}
const DEG = Math.PI / 180;

/* ---------- 스켈레톤 ---------- */
class Skeleton{
 constructor(json, atlas, image){
 this.json = json;
 this.atlas = atlas;
 this.image = image;

 // 본
 this.bones = [];
 this.boneMap = {};
 for(const bd of json.bones){
 const b = {
 name: bd.name,
 parent: bd.parent ? this.boneMap[bd.parent] : null,
 len: bd.length || 0,
 // 셋업 포즈
 sx: bd.x || 0, sy: bd.y || 0,
 srot: bd.rotation || 0,
 sscx: bd.scaleX === undefined ? 1 : bd.scaleX,
 sscy: bd.scaleY === undefined ? 1 : bd.scaleY,
 // 현재 포즈
 x:0, y:0, rot:0, scx:1, scy:1,
 // 월드 행렬
 a:1, b:0, c:0, d:1, wx:0, wy:0
 };
 this.bones.push(b);
 this.boneMap[b.name] = b;
 }

 // 슬롯
 this.slots = [];
 this.slotMap = {};
 json.slots.forEach((sd, i) =>{
 // 슬롯 color: RRGGBBAA. 알파뿐 아니라 RGB 틴트도 읽는다.
 let setupTint = null;
 if(sd.color){
 const rr = parseInt(sd.color.slice(0,2),16);
 const gg = parseInt(sd.color.slice(2,4),16);
 const bb = parseInt(sd.color.slice(4,6),16);
 // 흰색(ffffff)이 아니면 틴트로 취급 (곱셈 색상)
 if(rr !== 255 || gg !== 255 || bb !== 255){
 setupTint = 'rgb(' + rr + ',' + gg + ',' + bb + ')';
 }
 }
 const s = {
 name: sd.name,
 bone: this.boneMap[sd.bone],
 setupAttachment: sd.attachment || null,
 additive: sd.blend === 'additive',
 setupAlpha: sd.color ? parseInt(sd.color.slice(6,8),16)/255 : 1,
 setupTint: setupTint,
 tint: null,
 attachment: null,
 alpha: 1,
 order: i
 };
 this.slots.push(s);
 this.slotMap[s.name] = s;
 });
 this.drawOrder = this.slots.slice();

 // 스킨(어태치먼트) — region 전용
 this.skins = {};
 for(const skinName in json.skins){
 const skin = json.skins[skinName];
 const built = {};
 for(const slotName in skin){
 built[slotName] = {};
 for(const attName in skin[slotName]){
 const ad = skin[slotName][attName];
 const regionName = ad.name || attName;
 const reg = atlas.regions[regionName] ||
 atlas.regions[regionName.split('/').pop()];
 if(!reg){ console.warn('아틀라스 리전 없음:', regionName); continue; }
 built[slotName][attName] = this.buildAttachment(ad, reg);
 }
 }
 this.skins[skinName] = built;
 }
 // 'default'를 맨 앞에 두고 순서 고정
 this.skinNames = Object.keys(this.skins)
 .sort((a,b) =>(a==='default'?-1:0) - (b==='default'?-1:0));
 this.curSkin = this.skinNames[0];
 this.attachments = this.skins[this.curSkin];

 // 애니메이션 길이 계산
 this.animations = {};
 for(const name in json.animations){
 this.animations[name] = {
 data: json.animations[name],
 duration: animDuration(json.animations[name])
 };
 }
 }

 /* region attachment의 로컬 변환 행렬 미리 계산
 이미지 픽셀(u,v) → 본 로컬 좌표(y-up) 매핑을 2x3 행렬로 */
 buildAttachment(ad, reg){
 const w = ad.width, h = ad.height;
 const scX = ad.scaleX === undefined ? 1 : ad.scaleX;
 const scY = ad.scaleY === undefined ? 1 : ad.scaleY;
 const rot = ad.rotation || 0;
 const ax = ad.x || 0, ay = ad.y || 0;

 // 아틀라스에 90도 회전 저장된 리전은 그린 폭/높이가 뒤바뀜
 const rw = reg.rotate ? reg.h : reg.w;
 const rh = reg.rotate ? reg.w : reg.h;

 const rsx = (w / reg.ow) * scX;
 const rsy = (h / reg.oh) * scY;

 const localX = -w/2 * scX + reg.ox * rsx;
 const localY = -h/2 * scY + reg.oy * rsy;
 const localY2 = localY + rh * rsy;

 // P: 이미지픽셀 → 회전 전 로컬 (canvas 행렬 표기 [a,b,c,d,e,f])
 let P = [ rsx, 0, 0, -rsy, localX, localY2 ];

 // 아틀라스 회전 리전이면 이미지 좌표계를 한 번 더 돌려줌
 if(reg.rotate){
 // 소스에서는 (w,h)가 (rh,rw)로 저장돼 있으므로 -90도 회전 후 보정
 P = mul(P, [0, -1, 1, 0, 0, 0]);
 P = mul(P, [1, 0, 0, 1, 0, -reg.h]);
 }

 const cos = Math.cos(rot * DEG), sin = Math.sin(rot * DEG);
 const R = [ cos, sin, -sin, cos, 0, 0 ];
 const T = [ 1, 0, 0, 1, ax, ay ];

 return {
 region: reg,
 // srcW/srcH: drawImage로 잘라낼 원본 크기
 srcW: reg.w, srcH: reg.h,
 m: mul(mul(T, R), P)
 };
 }

 setSkin(name){
 if(!this.skins[name]) return;
 this.curSkin = name;
 this.attachments = this.skins[name];
 }

 /* 현재 스킨 → 없으면 default 스킨에서 찾기 */
 findAttachment(slotName, attName){
 const a = this.attachments[slotName];
 if(a && a[attName]) return a[attName];
 const d = this.skins.default;
 if(d && d[slotName] && d[slotName][attName]) return d[slotName][attName];
 return null;
 }

 /* 셋업 포즈로 리셋 */
 setToSetupPose(){
 for(const b of this.bones){
 b.x = b.sx; b.y = b.sy; b.rot = b.srot;
 b.scx = b.sscx; b.scy = b.sscy;
 }
 for(const s of this.slots){
 s.attachment = s.setupAttachment;
 s.alpha = s.setupAlpha;
 s.tint = s.setupTint;
 }
 this.drawOrder = this.slots.slice();
 }

 /* 애니메이션 적용 */
 apply(animName, time){
 this.setToSetupPose();
 const anim = this.animations[animName];
 if(!anim) return;
 const A = anim.data;

 // 본 타임라인
 if(A.bones) for(const bn in A.bones){
 const bone = this.boneMap[bn];
 if(!bone) continue;
 const tl = A.bones[bn];

 if(tl.rotate){
 const f = tl.rotate;
 let angle;
 if(time <= f[0].time) angle = f[0].angle;
 else if(time >= f[f.length-1].time) angle = f[f.length-1].angle;
 else{
 const i = findFrame(f, time);
 const f0 = f[i], f1 = f[i+1];
 const p = curvePercent(f0.curve,
 (time - f0.time) / (f1.time - f0.time));
 // 최단 경로로 감아서 보간 (350도 회전 방지)
 angle = f0.angle + wrapDeg(f1.angle - f0.angle) * p;
 }
 bone.rot = bone.srot + angle;
 }
 if(tl.translate){
 const v = interp2(tl.translate, time, 'x', 'y');
 bone.x = bone.sx + v[0];
 bone.y = bone.sy + v[1];
 }
 if(tl.scale){
 const v = interp2(tl.scale, time, 'x', 'y', 1);
 bone.scx = bone.sscx * v[0];
 bone.scy = bone.sscy * v[1];
 }
 }

 // 슬롯 타임라인
 if(A.slots) for(const sn in A.slots){
 const slot = this.slotMap[sn];
 if(!slot) continue;
 const tl = A.slots[sn];

 if(tl.attachment){
 const f = tl.attachment;
 let name = f[0].name;
 for(let i = 0; i < f.length; i++){
 if(f[i].time <= time) name = f[i].name; else break;
 }
 slot.attachment = name;
 }
 if(tl.color){
 const f = tl.color;
 const av = c =>parseInt(c.slice(6,8),16)/255;
 const rv = c =>parseInt(c.slice(0,2),16);
 const gv = c =>parseInt(c.slice(2,4),16);
 const bv = c =>parseInt(c.slice(4,6),16);
 let alpha, R, G, B;
 if(time <= f[0].time){
 const c = f[0].color;
 alpha = av(c); R = rv(c); G = gv(c); B = bv(c);
 } else if(time >= f[f.length-1].time){
 const c = f[f.length-1].color;
 alpha = av(c); R = rv(c); G = gv(c); B = bv(c);
 } else {
 const i = findFrame(f, time);
 const f0 = f[i], f1 = f[i+1];
 const p = curvePercent(f0.curve,
 (time - f0.time) / (f1.time - f0.time));
 const c0 = f0.color, c1 = f1.color;
 alpha = av(c0) + (av(c1) - av(c0)) * p;
 R = Math.round(rv(c0) + (rv(c1) - rv(c0)) * p);
 G = Math.round(gv(c0) + (gv(c1) - gv(c0)) * p);
 B = Math.round(bv(c0) + (bv(c1) - bv(c0)) * p);
 }
 slot.alpha = alpha;
 // 흰색이 아니면 틴트 적용
 slot.tint = (R !== 255 || G !== 255 || B !== 255)
 ? 'rgb(' + R + ',' + G + ',' + B + ')' : null;
 }
 }

 // 드로우 오더 (구버전은 draworder)
 const DO = A.drawOrder || A.draworder;
 if(DO && DO.length){
 let key = null;
 for(const k of DO){ if(k.time <= time) key = k; else break; }
 const order = this.slots.slice();
 if(key && key.offsets){
 const unchanged = [];
 const result = new Array(this.slots.length).fill(null);
 const moved = {};
 for(const off of key.offsets){
 const s = this.slotMap[off.slot];
 if(s) moved[s.order] = off.offset;
 }
 // 원본 인덱스 + offset 위치로 이동
 for(let i = 0; i < this.slots.length; i++){
 if(!(i in moved)) unchanged.push(this.slots[i]);
 }
 for(const idxStr in moved){
 const i = parseInt(idxStr);
 result[i + moved[idxStr]] = this.slots[i];
 }
 let u = 0;
 for(let i = 0; i < result.length; i++){
 if(result[i] === null) result[i] = unchanged[u++];
 }
 this.drawOrder = result;
 } else {
 this.drawOrder = order;
 }
 }

 this.updateWorld();
 }

 /* 본 월드 변환 (부모 → 자식 순) */
 updateWorld(){
 for(const b of this.bones){
 const cos = Math.cos(b.rot * DEG), sin = Math.sin(b.rot * DEG);
 const la = cos * b.scx, lb = -sin * b.scy;
 const lc = sin * b.scx, ld = cos * b.scy;
 const p = b.parent;
 if(!p){
 b.a = la; b.b = lb; b.c = lc; b.d = ld;
 b.wx = b.x; b.wy = b.y;
 } else {
 b.wx = p.a * b.x + p.b * b.y + p.wx;
 b.wy = p.c * b.x + p.d * b.y + p.wy;
 b.a = p.a * la + p.b * lc;
 b.b = p.a * lb + p.b * ld;
 b.c = p.c * la + p.d * lc;
 b.d = p.c * lb + p.d * ld;
 }
 }
 }

 /* 그리기. base는 월드(y-up) → 화면(y-down) 변환 행렬 */
 draw(ctx, base){
 for(const slot of this.drawOrder){
 if(!slot.attachment) continue;
 const att = this.findAttachment(slot.name, slot.attachment);
 if(!att) continue;
 if(slot.alpha <= 0.002) continue;

 const bone = slot.bone;
 const B = [ bone.a, bone.c, bone.b, bone.d, bone.wx, bone.wy ];
 const M = mul(mul(base, B), att.m);

 ctx.globalAlpha = slot.alpha;
 ctx.globalCompositeOperation = slot.additive ? 'lighter' : 'source-over';
 ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
 const r = att.region;

 if(slot.tint){
 // RGB 틴트: 오프스크린에서 텍스처에 색을 곱한 뒤 그린다.
 const src = this._getTintedRegion(r, att.srcW, att.srcH, slot.tint);
 ctx.drawImage(src, 0, 0, att.srcW, att.srcH);
 } else {
 ctx.drawImage(this.image, r.x, r.y, r.w, r.h, 0, 0, att.srcW, att.srcH);
 }
 }
 ctx.setTransform(1,0,0,1,0,0);
 ctx.globalAlpha = 1;
 ctx.globalCompositeOperation = 'source-over';
 }

 /* 텍스처 조각에 tint 색을 곱해 만든 캔버스를 돌려준다. (캐시됨) */
 _getTintedRegion(r, sw, sh, tint){
 if(!this._tintCache) this._tintCache = {};
 const key = r.x + '_' + r.y + '_' + r.w + '_' + r.h + '_' + tint;
 if(this._tintCache[key]) return this._tintCache[key];

 const oc = document.createElement('canvas');
 oc.width = sw; oc.height = sh;
 const octx = oc.getContext('2d');

 // 1) 원본 텍스처 조각
 octx.drawImage(this.image, r.x, r.y, r.w, r.h, 0, 0, sw, sh);
 // 2) 색 곱하기 (흰 부분이 tint 색으로)
 octx.globalCompositeOperation = 'multiply';
 octx.fillStyle = tint;
 octx.fillRect(0, 0, sw, sh);
 // 3) 원본 알파(모양)로 되돌리기 — 곱셈으로 번진 배경 제거
 octx.globalCompositeOperation = 'destination-in';
 octx.drawImage(this.image, r.x, r.y, r.w, r.h, 0, 0, sw, sh);
 octx.globalCompositeOperation = 'source-over';

 this._tintCache[key] = oc;
 return oc;
 }

 /* 본 뼈대 오버레이 (디버그) */
 drawBones(ctx, base){
 ctx.setTransform(1,0,0,1,0,0);
 ctx.lineWidth = 1.5;
 for(const b of this.bones){
 const p0 = applyM(base, b.wx, b.wy);
 const len = b.len || 12;
 const ex = b.wx + b.a * len, ey = b.wy + b.c * len;
 const p1 = applyM(base, ex, ey);
 ctx.strokeStyle = 'rgba(122,162,247,.8)';
 ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
 ctx.fillStyle = '#d9b45a';
 ctx.beginPath(); ctx.arc(p0[0], p0[1], 2.2, 0, 6.284); ctx.fill();
 }
 }

 /* 현재 포즈의 화면 바운딩 박스 (월드 y-up 기준) */
 bounds(){
 let x0=1e9, y0=1e9, x1=-1e9, y1=-1e9;
 const I = [1,0,0,1,0,0];
 for(const slot of this.drawOrder){
 if(!slot.attachment) continue;
 const att = this.findAttachment(slot.name, slot.attachment);
 if(!att) continue;
 const bone = slot.bone;
 const B = [ bone.a, bone.c, bone.b, bone.d, bone.wx, bone.wy ];
 const M = mul(B, att.m);
 const pts = [[0,0],[att.srcW,0],[0,att.srcH],[att.srcW,att.srcH]];
 for(const p of pts){
 const q = applyM(M, p[0], p[1]);
 if(q[0]<x0)x0=q[0]; if(q[0]>x1)x1=q[0];
 if(q[1]<y0)y0=q[1]; if(q[1]>y1)y1=q[1];
 }
 }
 return {x0,y0,x1,y1};
 }
}

/* ---------- 행렬 유틸 (canvas 표기 [a,b,c,d,e,f]) ---------- */
function mul(m, n){
 return [
 m[0]*n[0] + m[2]*n[1],
 m[1]*n[0] + m[3]*n[1],
 m[0]*n[2] + m[2]*n[3],
 m[1]*n[2] + m[3]*n[3],
 m[0]*n[4] + m[2]*n[5] + m[4],
 m[1]*n[4] + m[3]*n[5] + m[5]
 ];
}
function applyM(m, x, y){
 return [ m[0]*x + m[2]*y + m[4], m[1]*x + m[3]*y + m[5] ];
}

/* ---------- 타임라인 헬퍼 ---------- */
function findFrame(frames, time){
 for(let i = frames.length - 2; i >= 0; i--){
 if(frames[i].time <= time) return i;
 }
 return 0;
}
function interp2(frames, time, kx, ky, def){
 const d = def === undefined ? 0 : def;
 const gx = f =>f[kx] === undefined ? d : f[kx];
 const gy = f =>f[ky] === undefined ? d : f[ky];
 if(time <= frames[0].time) return [gx(frames[0]), gy(frames[0])];
 const last = frames[frames.length-1];
 if(time >= last.time) return [gx(last), gy(last)];
 const i = findFrame(frames, time);
 const f0 = frames[i], f1 = frames[i+1];
 const p = curvePercent(f0.curve, (time - f0.time) / (f1.time - f0.time));
 return [ gx(f0) + (gx(f1) - gx(f0)) * p,
 gy(f0) + (gy(f1) - gy(f0)) * p ];
}
function animDuration(A){
 let max = 0;
 const scan = tl =>{ for(const f of tl) if(f.time >max) max = f.time; };
 if(A.bones) for(const b in A.bones) for(const k in A.bones[b]) scan(A.bones[b][k]);
 if(A.slots) for(const s in A.slots) for(const k in A.slots[s]) scan(A.slots[s][k]);
 if(A.drawOrder) scan(A.drawOrder);
 if(A.draworder) scan(A.draworder);
 return max;
}
