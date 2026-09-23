/* 실행: node verify-data.cjs — 네트워크/사용자 저장소에 접근하지 않습니다. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const context = vm.createContext({});
context.window = context;
for (const file of ['dragons.js', 'cham-rules.js', 'dragon-views.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context, { filename: file, timeout: 5000 });
}
const db = context.DV1_DRAGONS;
const view = context.DV1_DRAGON_VIEWS;
assert.equal(new Set(db.records.map(r => r.id)).size, db.records.length);
for (const page of ['sss', 'cham']) for (const grade of ['SS', 'SSS']) {
  for (const row of view.rankingRows(page, grade)) {
    assert(db.getById(row.did));
    assert.equal(row.eval, row.hp + 4 * row.atk + 4 * row.def);
  }
}
for (const r of db.records) {
  if (r.collection?.combo) for (const member of r.collection.combo) assert(db.getById(member.id), '교배 참조 ID: ' + member.id);
}
assert.equal(view.raidSavedRow('에버네일').n, '에버네일');
assert.equal(db.getById(630).name.ko, '애버네일');
console.log('검증 통과: 드래곤 ' + db.records.length + '개, 스탯·랭킹·기존 이름 연결 정상.');
