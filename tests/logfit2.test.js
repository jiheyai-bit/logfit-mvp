const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const storage = new Map();
const context = {
  console, Date, Intl, Array, Number, String, JSON, Math, Object, RegExp,
  setTimeout, clearTimeout,
  localStorage: {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  document: { readyState: 'loading', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } },
  URL, Blob
};
vm.createContext(context);
vm.runInContext(script, context);

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

const now = new Date('2026-11-04T03:00:00.000Z');

test('asks for an exact time instead of guessing from 저녁', () => {
  const plan = context.parseLogFitPlanIntent('오늘 저녁에 요가할 거야', now);
  assert.strictEqual(plan.intent, 'planned');
  assert.strictEqual(plan.activity_type, 'exercise');
  assert.strictEqual(plan.activity_name, '요가');
  assert.strictEqual(plan.planned_start_at, null);
  assert.strictEqual(plan.status, 'awaiting_time_confirmation');
});

test('extracts an explicit KST running time as a planned workout', () => {
  const plan = context.parseLogFitPlanIntent('오늘 19시에 러닝할 거야', now);
  assert.strictEqual(plan.planned_start_at, '2026-11-04T19:00:00+09:00');
  assert.strictEqual(plan.status, 'awaiting_user_approval');
});

test('suggests an alternative for rainy running conditions', () => {
  const suggestion = context.buildWeatherSuggestion({ activity_type: 'running', planned_start_at: '2026-11-04T19:00:00+09:00' }, {
    temperature_c: 12, precipitation_probability: 80, precipitation_type: 'rain', wind_speed_kmh: 18,
    source: 'test-weather', fetched_at: '2026-11-04T10:00:00+09:00'
  }, {});
  assert.strictEqual(suggestion.weather_status, 'available');
  assert.strictEqual(suggestion.recommended_action, 'indoor_alternative');
  assert.ok(suggestion.reason_codes.includes('rain_expected'));
  assert.match(suggestion.message, /실내|시간/);
});

test('keeps a running plan usable when weather is unavailable', () => {
  const suggestion = context.buildWeatherSuggestion({ activity_type: 'running' }, null, {});
  assert.strictEqual(suggestion.weather_status, 'unavailable');
  assert.strictEqual(suggestion.recommended_action, 'run_as_planned');
  assert.match(suggestion.message, /날씨/);
});

test('planned workouts stay out of completed totals until confirmation', () => {
  const schedule = context.createScheduleDraft({
    intent: 'planned', activity_type: 'exercise', activity_name: '요가',
    planned_start_at: '2026-11-04T19:00:00+09:00'
  }, { reminder_minutes_before: 30, timezone: 'Asia/Seoul' });
  schedule.status = 'awaiting_completion';
  const result = context.promoteScheduleCompletion(schedule, { status: 'awaiting_completion' }, []);
  assert.strictEqual(result.schedule.status, 'awaiting_completion');
  assert.strictEqual(result.records.length, 0);
});

test('completion promotion is idempotent for one schedule', () => {
  const schedule = context.createScheduleDraft({
    intent: 'planned', activity_type: 'exercise', activity_name: '요가',
    planned_start_at: '2026-11-04T19:00:00+09:00'
  }, { reminder_minutes_before: 30, timezone: 'Asia/Seoul' });
  const first = context.promoteScheduleCompletion(schedule, { status: 'completed', duration_min: 30 }, []);
  const second = context.promoteScheduleCompletion(first.schedule, { status: 'completed', duration_min: 30 }, first.records);
  assert.strictEqual(first.records.length, 1);
  assert.strictEqual(second.records.length, 1);
  assert.strictEqual(second.schedule.status, 'completed');
});
