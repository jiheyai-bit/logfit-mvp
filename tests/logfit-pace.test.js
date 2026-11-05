const assert = require('assert');
const { parsePaceSecPerKm } = require('../scripts/logfit-pace');
const { routeTelegramMessage } = require('../scripts/logfit-telegram-router');

const cases = [
  ["오늘 러닝 3km완료, 평균페이스 6'30 /km", 390],
  ['5km 달렸어 6’30”', 390],
  ['러닝 5km 했어 페이스 6:40', 400],
  ['5km 6:30/km로 달렸어', 390],
  ['5km 공복 유산소 완료, 평균 1km 6분 40초', 400],
  ['1km당 7분 페이스로 3km 뛰었어', 420],
  ['러닝 5km 30분 했어', null],
  ['오후 8시30분 러닝 5km 했어', null]
];
cases.forEach(([text, expected]) => assert.strictEqual(parsePaceSecPerKm(text), expected, text));

const routed = routeTelegramMessage("오늘 러닝 3km완료, 평균페이스 6'30 /km", new Date('2026-11-06T05:51:00+09:00'));
assert.strictEqual(routed.records[0].distance_km, 3);
assert.strictEqual(routed.records[0].pace_sec_per_km, 390);
assert.strictEqual(routed.records[0].duration_min, 19.5);
console.log('PASS pace formats and duration from distance x pace');
