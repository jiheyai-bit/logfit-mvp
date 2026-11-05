const assert = require('assert');
const { classifyInput, buildRecordConfirmation } = require('../scripts/logfit-intent');

const record = classifyInput('11월 4일 하체 근력운동 1시간 했어');
assert.strictEqual(record.kind, 'record');
assert.strictEqual(record.reason, 'completion_language');

const schedule = classifyInput('내일 러닝할 거야');
assert.strictEqual(schedule.kind, 'schedule');
assert.strictEqual(schedule.reason, 'future_personal_plan');

const schedule2 = classifyInput('오늘 저녁에 요가할 예정이야');
assert.strictEqual(schedule2.kind, 'schedule');

const request = classifyInput('내일 운동 계획 세워줘');
assert.strictEqual(request.kind, 'request');
assert.strictEqual(request.reason, 'planning_request');

const mixed = classifyInput('어제 근력운동 했고 내일 운동 계획 세워줘');
assert.strictEqual(mixed.kind, 'mixed');
assert.deepStrictEqual(mixed.kinds, ['record', 'request']);

const other = classifyInput('오늘 날씨 좋네');
assert.strictEqual(other.kind, 'other');

const confirmation = buildRecordConfirmation([
  { type: 'exercise', exercise_type: '하체 근력운동', duration_min: 60, record_date: '2026-11-04' },
  { type: 'meal', meal_period: '점심', item: '김치찌개', record_date: '2026-11-04' }
]);
assert.match(confirmation, /1\. 💪 하체 근력운동 · 60분/);
assert.match(confirmation, /2\. 🍚 점심 김치찌개/);
assert.match(confirmation, /저장.*수정.*취소/s);

console.log('PASS intent classifier and record confirmation format');
