/* dragons.js를 기존 한국어 페이지 형식으로 변환합니다. 저장소·통신 접근 없음. */
(function (root) {
  'use strict';
  const db = root.DV1_DRAGONS;
  if (!db || db.schemaVersion !== 2 || !Array.isArray(db.records) || db.records.length === 0) {
    throw new Error('드래곤 데이터가 없거나 지원하지 않는 형식입니다.');
  }
  const records = db.records;
  const idSet = new Set();
  function validStats(stats) {
    return stats === null || (stats && ['hp','atk','def'].every(k => Array.isArray(stats[k]) && stats[k].length === 2 && stats[k].every(Number.isFinite)));
  }
  for (const r of records) {
    if (!Number.isInteger(r.id) || idSet.has(r.id) || !r.name?.ko || !r.stages || !r.stats || !r.compatibility || !Array.isArray(r.aliases?.ko) || !Array.isArray(r.rankingProfiles)) {
      throw new Error('드래곤 데이터 항목을 확인하세요: ' + r.id);
    }
    if (!validStats(r.stats.regular) || (r.stats.grades !== null && !Object.values(r.stats.grades).every(validStats))) {
      throw new Error('드래곤 스탯 형식을 확인하세요: ' + r.id);
    }
    for (const p of r.rankingProfiles) {
      const stats = p.stats || p.statsRef?.split('.').reduce((v,k) => v?.[k],r.stats);
      if (!stats || !validStats(stats) || !Array.isArray(p.appearances)) throw new Error('랭킹 스탯을 확인하세요: '+r.id);
    }
    idSet.add(r.id);
  }
  const elements = ['땅','물','불','바람','빛','어둠','여명','황혼','악몽'];
  const iconElements = ['땅','물','불','바람','빛','어둠','황혼','여명','악몽'];
  const types = ['체력형','공격형','방어형','체공형','체방형','공방형'];
  const assetBase = 'https://raw.githubusercontent.com/yejoo0519/dogam/refs/heads/main/';
  const copy = v => JSON.parse(JSON.stringify(v));
  const compat = (r,key) => r.compatibility[key];
  const ordered = (rows,key) => rows.slice().sort((a,b) => (compat(a,key)?.order ?? (100000+a.id)) - (compat(b,key)?.order ?? (100000+b.id)));
  const nameMap = new Map(records.map(r => [r.name.ko,r]));
  for (const r of records) for (const name of r.aliases.ko) if (!nameMap.has(name)) nameMap.set(name,r);

  function imageNumbers() {
    return Object.fromEntries([...nameMap].map(([name,r]) => [name,r.id]));
  }
  function descriptionMap() {
    return Object.fromEntries([...nameMap].filter(([,r]) => r.description.ko).map(([name,r]) => [name,r.description.ko]));
  }
  function statMap() {
    return Object.fromEntries(records.filter(r => r.stats.regular).map(r => [r.id,copy(r.stats.regular)]));
  }
  function gradeStatMap() {
    return Object.fromEntries(records.filter(r => r.stats.grades).map(r => [r.id,Object.fromEntries(Object.entries(r.stats.grades).filter(([,v]) => v).map(([g,v]) => [g,copy(v)]))]));
  }
  function dexRows() {
    return records.map(r => ({n:r.name.ko,e:r.element,t:r.type,t_kr:r.type,
      aw:Number(r.stages.awakening),ad:Number(r.stages.advent),tr:Number(r.stages.transcendence),
      lv:Number(r.canLevelUp),tg:r.tier.value === null ? 'NI' : String(r.tier.value),cd:r.codeAvailability,id:r.id,desc:''}));
  }
  function tierRows() {
    return ordered(records.filter(r => r.tier.status === 'listed'),'tier').map(r => ({n:r.name.ko,e:r.element,t:r.type,
      lv:(compat(r,'tier')?.canLevelUp ?? r.canLevelUp)?'O':'X',g:r.tier.value,
      ['img'+(iconElements.indexOf(r.element)+1)]:assetBase+db.profilePath(r.id,7),ex:r.stages.advent}));
  }
  function rankingRows(page,tab) {
    return [45,21].flatMap(level => db.getRankingRows(page,tab,level).map(row => {
      const r = db.getById(row.id);
      const p = r.rankingProfiles.find(p => p.name === row.name && p.appearances.some(a => a.page === page && a.tab === tab && a.levels.includes(level)));
      const stats = p.stats || p.statsRef.split('.').reduce((v,k) => v[k],r.stats);
      return {rank:row.rank,did:row.id,kor:row.name,hp:row.hp,atk:row.atk,def:row.def,eval:row.evaluation,
        base:['hp','atk','def'].map(k => stats[k][0]).join('/'),grow:['hp','atk','def'].map(k => stats[k][1]).join('/'),
        elem:row.element,lv:level,...(row.skill?{skill:row.skill}:{})};
    }));
  }
  function rankingImages() {
    return Object.fromEntries(records.map(r => [r.id,assetBase+db.profilePath(r.id,4)]));
  }
  function typeLists() {
    return Object.fromEntries(types.map(type => [type,ordered(records.filter(r => r.type+'형' === type),'typeList').map(r => {
      const c = compat(r,'typeList');
      if(c) return c.aliases === null ? c.name : {name:c.name,aliases:copy(c.aliases)};
      return {name:r.name.ko,aliases:r.aliases.ko.slice()};
    })]));
  }
  function attributeLists() {
    return Object.fromEntries(elements.map(element => [element,ordered(records.filter(r => r.element === element && types.includes(r.type+'형')),'attributeList').map(r => compat(r,'attributeList')?.name || r.name.ko)]));
  }
  function allowed(page) {
    const flag = page === 'pvp' ? 'guildWarOriginal' : 'guildWarNewbie';
    return Object.fromEntries(elements.map(element => [element,ordered(records.filter(r => r.element === element && r.availability[flag]),page).map(r => compat(r,page)?.name || r.name.ko)]));
  }
  function savedNameMap(page) {
    return Object.fromEntries(records.flatMap(r => (compat(r,'savedNames')||[]).filter(x => x.pages.includes(page)).map(x => [x.from,x.to])));
  }
  function raidRows() {
    return records.map(r => ({n:r.name.ko,e:r.element,t:r.type,ad:r.stages.advent,tr:r.stages.transcendence}));
  }
  function raidSavedRow(name) {
    const r = nameMap.get(name);
    // 저장된 문자열은 유지하고 정적 속성만 조회한다. 저장 형식 마이그레이션 없음.
    return r ? {n:name,e:r.element,t:r.type,ad:r.stages.advent,tr:r.stages.transcendence} : null;
  }
  function assetMap(field) {
    return Object.fromEntries(records.filter(r => r.assets[field] !== null).map(r => [r.id,copy(r.assets[field])]));
  }
  function auraRows() {
    // 리소스 번호가 없는 드래곤을 임의의 게임 번호로 연결하지 않는다.
    return ordered(records.filter(r => compat(r,'aura') || r.assets.gameId !== null || r.assets.gradeFamilyId !== null),'aura').map(r => [r.id,r.name.ko,r.element,Number(r.stages.advent),compat(r,'aura')?.icon || (r.stages.advent?8:r.stages.transcendence?7:4)]);
  }
  function collectionEggs() {
    return Object.fromEntries(records.filter(r => r.collection).map(r => [r.id,{name:compat(r,'collectionName') || r.name.ko,...copy(r.collection),
      ...(r.collection.combo?{combo:r.collection.combo.map(c => ({n:c.name || db.getById(c.id).name.ko,id:c.id}))}:{})}]));
  }
  function championship() {
    const rules = root.DV1_CHAM_RULES;
    if (!rules) throw new Error('cham-rules.js를 불러오지 못했습니다.');
    const GANG = Object.fromEntries(elements.map(element => [element,ordered(records.filter(r => r.element === element && (compat(r,'chamGang') || r.availability.guildWarOriginal)),'chamGang').map(r => ({ko:compat(r,'chamGang')?.name || r.name.ko,en:compat(r,'chamGang')?.name || r.name.ko,img:r.id}))]));
    const gradeRows = records.flatMap(r => (compat(r,'chamGrade') || []).map(entry => {
      const p = r.rankingProfiles.find(p => p.name === entry.name && p.appearances.some(a => a.page === 'sss' && a.levels.includes(entry.level)));
      if (!p) throw new Error('챔대 프로필이 없습니다: '+r.id);
      const stats = p.stats || p.statsRef.split('.').reduce((v,k) => v[k],r.stats);
      const values = Object.fromEntries(['hp','atk','def'].map(k => [k,stats[k][0]+stats[k][1]*(entry.level-1)]));
      return {order:entry.order,row:{ko:entry.name,en:entry.name,did:r.id,lv:entry.level,...values,ev:values.hp+4*values.atk+4*values.def,elem:r.element,...(entry.showSkill?{sk:p.skill}:{})}};
    })).sort((a,b) => a.order-b.order).map(x => x.row);
    return {...copy(rules),GANG,GRADE:gradeRows};
  }
  const views = {imageNumbers,descriptionMap,statMap,gradeStatMap,dexRows,tierRows,rankingRows,rankingImages,typeLists,attributeLists,allowed,savedNameMap,raidRows,raidSavedRow,assetMap,auraRows,collectionEggs,championship};
  // 모두 구성 가능한지 먼저 확인한다. 실패 시 페이지 초기화/저장 코드가 실행되지 않는다.
  const typeDB = typeLists(), attrDB = attributeLists(), cham = championship();
  Object.defineProperty(root,'DV1_DRAGON_VIEWS',{value:Object.freeze(views),writable:false,configurable:false});
  root.DRAGON_TYPE_DB=typeDB;
  root.DRAGON_ATTR_DB=attrDB;
  root.CHAM_DATA=cham;
})(globalThis);
