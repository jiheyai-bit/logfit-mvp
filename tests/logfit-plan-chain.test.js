const assert = require('assert');
const { buildPlanSuggestion, formatEvidence, avoidRecentStrengthPart, mergeNotification, approveSuggestion, expireUnansweredSuggestions } = require('../scripts/logfit-plan-chain');

const context = {
  date: '2026-11-06',
  calendar: {
    connected: true,
    windows: [{ start: '06:00', end: '06:30' }, { start: '07:30', end: '08:00' }]
  },
  forecast: {
    temperature_c: 6,
    precipitation_probability: 0,
    wind_speed_kmh: 8,
    precipitation_mm: 0,
    snowfall_cm: 0,
    forecast_at: '2026-11-06T06:00+09:00',
    source: 'Open-Meteo'
  },
  recentRecords: [
    { type: 'exercise', exercise_type: '요가', record_date: '2026-11-05', duration_min: 30 },
    { type: 'exercise', exercise_type: '근력운동', body_part: '하체', record_date: '2026-11-04', duration_min: 60 }
  ]
};

const suggestion = buildPlanSuggestion(context);
assert.strictEqual(suggestion.kind, 'plan');
assert.ok(Array.isArray(suggestion.options));
assert.ok(suggestion.options.every((option) => option && typeof option === 'object'));
assert.deepStrictEqual(Object.keys(suggestion.options[0]), ['label', 'date', 'time', 'activity', 'body_part', 'duration_min', 'indoor']);
assert.match(suggestion.reason, /6℃/);
assert.match(suggestion.reason, /강수 0%/);
assert.match(suggestion.reason, /바람 8km\/h/);
assert.match(suggestion.reason, /06:00/);

assert.strictEqual(avoidRecentStrengthPart('하체', context.recentRecords, '2026-11-05T05:00:00+09:00'), true);
assert.strictEqual(avoidRecentStrengthPart('상체', context.recentRecords, '2026-11-05T05:00:00+09:00'), false);

const fallback = buildPlanSuggestion({ ...context, calendar: null, forecast: null });
assert.match(fallback.reason, /기본 슬롯/);
assert.match(fallback.reason, /날씨 정보 없음/);
assert.strictEqual(fallback.options[0].indoor, false);

const calendarUnavailable = buildPlanSuggestion({ ...context, calendar: { connected: false, windows: [{ start: '06:00', end: '06:30' }] }, forecast: context.forecast });
assert.match(calendarUnavailable.reason, /캘린더를 확인하지 못해/);
assert.doesNotMatch(calendarUnavailable.reason, /비어 있음/);

const sparse = buildPlanSuggestion({ ...context, recentRecords: [] });
assert.strictEqual(sparse.personalization, 'limited_data');
assert.match(sparse.reason, /최근 운동 기록 부족/);

const safetyHold = buildPlanSuggestion({ ...context, inputText: '무릎 통증이 있고 너무 피곤해' });
assert.strictEqual(safetyHold.status, 'needs_user_check');
assert.strictEqual(safetyHold.options.length, 0);
assert.match(safetyHold.reason, /통증|피로/);

const merged = mergeNotification({
  planned_start_at: '2026-11-06T05:30:00+09:00',
  cron_job_id: 'cron-plan-1'
}, { schedule_id: 'routine-hangang-5km-weather', cron_job_id: 'cron-weather-1', at: '2026-11-06T05:30:00+09:00' });
assert.strictEqual(merged.merged, true);
assert.strictEqual(merged.cron_job_id, 'cron-weather-1');
assert.match(merged.reason, /05:30/);

const separate = mergeNotification({ planned_start_at: '2026-11-06T06:00:00+09:00', cron_job_id: 'cron-plan-2' }, { at: '2026-11-06T05:30:00+09:00', cron_job_id: 'cron-weather-1' });
assert.strictEqual(separate.merged, false);
assert.strictEqual(separate.cron_job_id, 'cron-plan-2');

const approved = approveSuggestion(suggestion, 0, { plan_item_id: 'item-1', cron_job_id: 'cron-1', response_sec: 12 });
assert.strictEqual(approved.plan_item.activity, suggestion.options[0].activity);
assert.strictEqual(approved.plan_item.item_id, 'item-1');
assert.deepStrictEqual(approved.suggestion.executed_action, { plan_item_id: 'item-1', cron_job_id: 'cron-1' });

const expired = expireUnansweredSuggestions([{ suggestion: { response: 'none', created_at: '2026-11-04T00:00:00+09:00' } }], new Date('2026-11-05T01:00:00+09:00'));
assert.strictEqual(expired[0].suggestion.response, 'none');
assert.ok(expired[0].suggestion.responded_at);

console.log('PASS plan chain options, numeric evidence, fallbacks, and notification merge');

(async () => {
  const { runPlanChain } = require('../scripts/logfit-plan-chain');
  const chained = await runPlanChain({ date: '2026-11-06', recentRecords: [] }, {
    getCalendar: async () => ({ connected: true, windows: [{ start: '06:00', end: '06:30' }] }),
    getWeather: async () => ({ temperature_c: 6, precipitation_probability: 0, wind_speed_kmh: 8, precipitation_mm: 0, snowfall_cm: 0, forecast_at: '2026-11-06T06:00+09:00', source: 'Open-Meteo' })
  });
  assert.deepStrictEqual(chained.steps.map((step) => step.status), ['executed', 'executed', 'executed', 'proposed']);
  assert.match(chained.suggestion.reason, /06:00/);

  const failed = await runPlanChain({ date: '2026-11-06', recentRecords: [] }, {
    getCalendar: async () => { throw new Error('calendar unavailable'); },
    getWeather: async () => { throw new Error('weather unavailable'); }
  });
  assert.strictEqual(failed.steps[0].status, 'fallback');
  assert.strictEqual(failed.steps[1].status, 'fallback');
  assert.match(failed.suggestion.reason, /기본 슬롯/);
  console.log('PASS plan chain executes steps and falls back on calendar/weather failure');
})().catch((error) => { console.error(error); process.exitCode = 1; });

// English activity names count toward the right category.
{
  const { recentActivityCounts } = require('../scripts/logfit-plan-chain');
  const counts = recentActivityCounts([
    { exercise_type: 'animal flow yoga', completion: 'completed' },
    { exercise_type: 'running', completion: 'completed' },
    { exercise_type: '하체 근력운동', completion: 'completed' }
  ]);
  require('assert').deepStrictEqual(counts, { 러닝: 1, 요가: 1, 근력운동: 1 });
  console.log('PASS English activity names in recent counts');
}
