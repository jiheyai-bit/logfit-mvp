const assert = require('assert');
const { routeTelegramMessage } = require('../scripts/logfit-telegram-router');

const record = routeTelegramMessage('11월 4일 하체 근력운동 1시간 진행');
assert.strictEqual(record.kind, 'record');
assert.strictEqual(record.status, 'awaiting_confirmation');
assert.match(record.message, /💪 하체 근력운동 · 60분/);

const schedule = routeTelegramMessage('오늘 저녁에 요가할 예정이야');
assert.strictEqual(schedule.kind, 'schedule');
assert.strictEqual(schedule.status, 'awaiting_time_confirmation');
assert.match(schedule.message, /시간/);

const request = routeTelegramMessage('내일 운동 계획 세워줘');
assert.strictEqual(request.kind, 'request');
assert.strictEqual(request.status, 'awaiting_plan_chain');
assert.match(request.message, /계획/);

const planned = routeTelegramMessage('내일 운동 계획 세워줘', new Date('2026-11-05T00:00:00+09:00'), {
  date: '2026-11-06',
  calendar: { connected: true, windows: [{ start: '06:00', end: '06:30' }] },
  forecast: { temperature_c: 6, precipitation_probability: 0, wind_speed_kmh: 8, precipitation_mm: 0, snowfall_cm: 0, forecast_at: '2026-11-06T06:00+09:00', source: 'Open-Meteo' },
  recentRecords: []
});
assert.strictEqual(planned.status, 'awaiting_user_approval');
assert.match(planned.message, /🏃‍♀️|🧘‍♀️|💪/);
assert.match(planned.message, /6℃/);

const threeKm = routeTelegramMessage('3km 달리기 성공');
assert.strictEqual(threeKm.kind, 'record');
assert.strictEqual(threeKm.records[0].distance_km, 3);
assert.strictEqual(threeKm.records[0].exercise_type, '러닝');
assert.match(threeKm.message, /🏃‍♀️ 러닝 · 3km/);

const englishActivity = routeTelegramMessage('11월 5일 오후 8시30분 animal flow yoga 50분, 점심은 봉골레 파스타');
assert.strictEqual(englishActivity.kind, 'record');
assert.strictEqual(englishActivity.records.length, 2);
assert.strictEqual(englishActivity.records[0].exercise_type, 'animal flow yoga');
assert.strictEqual(englishActivity.records[0].duration_min, 50);
assert.strictEqual(englishActivity.records[1].type, 'meal');
assert.strictEqual(englishActivity.records[1].meal_period, '점심');
assert.strictEqual(englishActivity.records[1].item, '봉골레 파스타');

const bodyStats = routeTelegramMessage('11월 5일 체중 62.4kg, 체지방률 27.8%, 근육량 23.1kg');
assert.strictEqual(bodyStats.kind, 'body_stats');
assert.strictEqual(bodyStats.status, 'awaiting_confirmation');
assert.match(bodyStats.message, /체중 62\.4kg/);

console.log('PASS Telegram routes record, schedule, request, and body stats intents');
