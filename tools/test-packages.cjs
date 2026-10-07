'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../pkg-data.js');
const source = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/pkg-notices.json'),'utf8'));
const dragons = require('../dragons.js');
assert.equal(source.schemaVersion,1);
assert.ok(source.scannedCount >= 3000);
assert.equal(new Set(source.scannedIds).size,source.scannedCount);
assert.equal(new Set(source.notices.map(n=>n.id)).size,source.notices.length);
for(const notice of source.notices){
  assert.equal(notice.url,'https://www.dragonvillage.net/notice/'+notice.id);
  for(const e of notice.events){
    assert.equal(dragons.getById(e.dragonId)?.name.ko,e.name);
    assert.ok(Number.isFinite(H.day(e.start)));
    assert.ok(H.day(e.end)>=H.day(e.start));
    assert.ok(Math.abs(H.day(e.start)-H.day(notice.date))<=120);
  }
}
const records=H.build(source,'2026-10-07');
assert.ok(records.find(d=>d.name==='레오벡터').sales.some(s=>s.start==='2026-09-17'));
assert.ok(records.find(d=>d.name==='솔라').sales.some(s=>s.start==='2026-03-26'));
assert.equal(records.find(d=>d.name==='망태곤').sales.filter(s=>s.start==='2026-06-15').length,1,'Correction notices must not create another sale');
const fixture={notices:[
  {id:1,events:[{dragonId:1,name:'test',start:'2020-01-01',end:'2020-01-10'}]},
  {id:2,events:[{dragonId:1,name:'test',start:'2021-01-01',end:'2021-01-10'}]}
]};
assert.equal(H.build(fixture,'2022-08-01')[0].estimate,'2022-01-02','Overdue estimates must not roll forward automatically');
assert.equal(H.todayKST(new Date('2026-10-06T15:30:00Z')),'2026-10-07');
assert.equal(H.build({notices:[fixture.notices[0]]},'2020-10-01')[0].estimate,null,'A single sale must not imply a two-year cycle');
console.log(`Package history verified: ${source.scannedCount} notices scanned, ${records.length} dragons, ${records.reduce((n,d)=>n+d.count,0)} sale rounds.`);

assert.ok(!records.some(d=>['골드드래곤','헬드래곤'].includes(d.name.replace(/\s+/g,''))));
assert.equal(H.build(fixture,'2023-06-30')[0].estimate,'2022-01-02');
assert.equal(H.build(fixture,'2023-07-01')[0].estimate,null,'30-month boundary must disable estimates');
assert.equal(H.addMonths('2023-08-31',30),'2026-02-28');
