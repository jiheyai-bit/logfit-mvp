const assert = require('assert');
const { normalizeAgenda, findExerciseWindows } = require('../scripts/logfit-calendar');

const events = normalizeAgenda({ items: [
  { summary: '회의', start: { dateTime: '2026-11-05T18:00:00+09:00' }, end: { dateTime: '2026-11-05T19:00:00+09:00' } },
  { summary: '이동', start: { dateTime: '2026-11-05T19:00:00+09:00' }, end: { dateTime: '2026-11-05T19:30:00+09:00' } }
] });
assert.strictEqual(events.length, 2);
assert.strictEqual(events[0].title, '회의');

const windows = findExerciseWindows(events, '2026-11-05', { day_start: '05:30', day_end: '21:30', duration_min: 30, buffer_min: 15 });
assert.ok(windows.some((window) => window.start === '05:30' && window.end === '06:00'));
assert.ok(!windows.some((window) => window.start === '17:30' && window.end === '18:00'));
assert.ok(!windows.some((window) => window.start === '19:00' && window.end === '19:30'));
assert.ok(windows.some((window) => window.start === '19:45' && window.end === '20:15'));

const fallback = findExerciseWindows([], '2026-11-05', { day_start: '05:30', day_end: '06:30', duration_min: 30, buffer_min: 0, step_min: 30 });
assert.deepStrictEqual(fallback, [{ start: '05:30', end: '06:00' }, { start: '06:00', end: '06:30' }]);

const agendaEvents = normalizeAgenda({ events: [
  { summary: '캘린더 일정', start: '2026-11-05T18:00:00+09:00', end: '2026-11-05T19:00:00+09:00' }
] });
assert.strictEqual(agendaEvents.length, 1);
assert.strictEqual(agendaEvents[0].title, '캘린더 일정');

console.log('PASS calendar events become exercise windows with a no-calendar fallback');
