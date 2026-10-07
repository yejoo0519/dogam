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
    if(e.start){
      assert.ok(Number.isFinite(H.day(e.start)));
      assert.ok(H.day(e.end)>=H.day(e.start));
      assert.ok(Math.abs(H.day(e.start)-H.day(notice.date))<=120);
    }else{assert.equal(e.dateBasis,'notice');assert.equal(e.end,null);}
  }
}
const records=H.build(source,'2026-10-07');
assert.ok(records.find(d=>d.name==='레오벡터').sales.some(s=>s.start==='2026-09-17'));
assert.ok(records.find(d=>d.name==='솔라').sales.some(s=>s.start==='2026-03-26'));
assert.equal(records.find(d=>d.name==='망태곤').sales.filter(s=>s.start==='2026-06-15').length,1,'Correction notices must not create another sale');
const fixture={notices:[
  {id:1,date:'2020-01-01',events:[{dragonId:1,name:'test',start:'2020-01-01',end:'2020-01-10'}]},
  {id:2,date:'2021-01-01',events:[{dragonId:1,name:'test',start:'2021-01-01',end:'2021-01-10'}]}
]};
assert.equal(H.build(fixture,'2022-08-01')[0].estimate,'2022-01-02','Overdue estimates must not roll forward automatically');
assert.equal(H.todayKST(new Date('2026-10-06T15:30:00Z')),'2026-10-07');
assert.equal(H.build({notices:[fixture.notices[0]]},'2020-10-01')[0].estimate,null,'A single sale must not imply a two-year cycle');
console.log(`Package history verified: ${source.scannedCount} notices scanned, ${records.length} dragons, ${records.reduce((n,d)=>n+d.count,0)} sale rounds.`);

assert.ok(!records.some(d=>['골드드래곤','헬드래곤','수룡','히드라곤','청룡','백룡','흑룡'].includes(d.name.replace(/\s+/g,''))));
assert.equal(H.build(fixture,'2023-06-30')[0].estimate,'2022-01-02');
assert.equal(H.build(fixture,'2023-07-01')[0].estimate,null,'30-month boundary must disable estimates');
assert.equal(H.addMonths('2023-08-31',30),'2026-02-28');

const sale=(name,start)=>records.find(d=>d.name===name)?.sales.find(s=>s.start===start);
assert.ok(sale('유니버스','2023-03-21'));
assert.equal(sale('유니버스','2023-03-18'),undefined);
for(const name of ['므네이아','아실리','위드미']){
  assert.ok(sale(name,'2019-10-08'));assert.equal(sale(name,'2019-10-15'),undefined);
}
assert.equal(records.find(d=>d.name==='프로딘'),undefined);
assert.ok(sale('혼','2025-09-24'));
assert.ok(sale('혼','2023-12-09'));
assert.ok(sale('허리케인','2019-09-26'));
assert.equal(sale('허리케인','2019-09-26').notices.length,2,'Same sale announced twice stays one round');
for(const name of ['애플칙','트로페우스']) assert.ok(sale(name,'2020-07-15'));

const announcement=(id,date,start=null)=>({id,date,events:[{dragonId:999,name:'공지 테스트',start,end:start,noticeId:id,dateBasis:start?'sale':'notice'}]});
const joined=H.build({notices:[announcement(1,'2024-01-31'),announcement(2,'2024-02-01'),announcement(3,'2024-05-01')]},'2024-12-01')[0];
assert.equal(joined.count,2,'Three calendar months separates announcement rounds');
assert.equal(joined.sales[0].notices.length,2);
assert.equal(joined.sales[0].start,null,'Notice dates must not masquerade as actual sale starts');
assert.equal(joined.sales[0].dateBasis,'notice');
assert.equal(joined.usesNoticeDates,true);
assert.equal(H.build({notices:[announcement(1,'2024-01-01'),announcement(2,'2024-03-31')]},'2024-12-01')[0].count,1);
assert.equal(H.build({notices:[announcement(1,'2024-01-01'),announcement(2,'2024-04-01')]},'2024-12-01')[0].count,2);
const precise=H.build({notices:[announcement(1,'2024-01-01'),announcement(2,'2024-01-02','2024-01-05')]},'2024-12-01')[0];
assert.equal(precise.count,1);assert.equal(precise.sales[0].referenceDate,'2024-01-05');assert.equal(precise.usesNoticeDates,false);
