const assert = require('assert');
const { resolveWeekDayState } = require('../scripts/logfit-week-status');

const rest = resolveWeekDayState('2026-11-02', null, [{ type: 'rest', record_date: '2026-11-02', completion: 'completed' }]);
assert.deepStrictEqual(rest, { className: 'done', label: '휴식', detail: '휴식' });

const missed = resolveWeekDayState('2026-11-03', { date: '2026-11-03', activity: '러닝', status: 'planned' }, []);
assert.deepStrictEqual(missed, { className: 'miss', label: '미수행', detail: '미수행' });

const noPlan = resolveWeekDayState('2026-11-04', null, []);
assert.deepStrictEqual(noPlan, { className: 'wait', label: '휴식', detail: '휴식' });

const completed = resolveWeekDayState('2026-11-05', { date: '2026-11-05', activity: '요가', status: 'planned' }, [{ type: 'exercise', exercise_type: '요가', record_date: '2026-11-05', completion: 'completed', duration_min: 30 }]);
assert.deepStrictEqual(completed, { className: 'done', label: '요가 30분', detail: '완료' });

console.log('PASS week status distinguishes rest, missed, and completed exercise');
