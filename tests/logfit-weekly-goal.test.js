const assert = require('assert');
const { countAerobicJogging, renderWeeklyPush, getRollingWindow } = require('../scripts/logfit-weekly-goal');

const records = [
  { record_date: '2026-11-02', activity_name: '한강 5km 공복 유산소', completion: 'completed' },
  { record_date: '2026-11-04', activity_name: '조깅 5km', completion: 'completed' },
  { record_date: '2026-11-08', activity_name: '러닝 5km', completion: 'completed' },
  { record_date: '2026-11-08', activity_name: '휴식', completion: 'completed', type: 'rest' },
  { record_date: '2026-11-07', activity_name: '요가', completion: 'completed' },
  { record_date: '2026-11-03', activity_name: '조깅', completion: 'planned' }
];

const window = getRollingWindow('2026-11-09');
assert.deepStrictEqual(window, { start: '2026-11-02', end: '2026-11-08' });
assert.strictEqual(countAerobicJogging(records, window), 3);
assert.strictEqual(renderWeeklyPush(records, '2026-11-09'), '');

const underGoal = records.filter((record) => record.activity_name !== '러닝 5km');
assert.strictEqual(countAerobicJogging(underGoal, window), 2);
const message = renderWeeklyPush(underGoal, '2026-11-09');
assert.match(message, /2회/);
assert.match(message, /3회/);
assert.match(message, /1회 더/);
assert.match(message, /이번 주/);

console.log('PASS weekly aerobic goal pushes only when completed jogging is under 3');
