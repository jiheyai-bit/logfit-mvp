const assert = require('assert');
const { evaluateForecast, renderAlert, renderAlertWithPlans } = require('../scripts/logfit-weather-alert');

const good = {
  temperature_c: 12,
  precipitation_probability: 10,
  precipitation_mm: 0,
  snowfall_cm: 0,
  wind_speed_kmh: 9,
  location: '한강 여의도 인근',
  forecast_at: '2026-11-05T05:30:00+09:00'
};

const bad = {
  temperature_c: -2,
  precipitation_probability: 70,
  precipitation_mm: 1.2,
  snowfall_cm: 0,
  wind_speed_kmh: 31,
  location: '한강 여의도 인근',
  forecast_at: '2026-11-05T05:30:00+09:00'
};

assert.deepStrictEqual(evaluateForecast(good), { suitable: true, reasons: [] });
const badDecision = evaluateForecast(bad);
assert.strictEqual(badDecision.suitable, false);
assert.ok(badDecision.reasons.includes('temperature_outside_range'));
assert.ok(badDecision.reasons.includes('rain_probability_high'));
assert.ok(badDecision.reasons.includes('wind_too_strong'));

const alert = renderAlert(good);
assert.match(alert, /한강 5km 러닝/);
assert.match(alert, /05:30/);
assert.match(alert, /컨디션이 괜찮/);
assert.strictEqual(renderAlert(bad), '');

const cloudy = { ...good, cloud_cover_percent: 85 };
const cloudyAlert = renderAlert(cloudy);
assert.match(cloudyAlert, /흐린 날씨/);
assert.match(cloudyAlert, /실내/);

const combined = renderAlertWithPlans({ ...good, forecast_at: '2026-11-06T05:30:00+09:00' }, [{ date: '2026-11-06', time: '06:00', activity: '러닝', duration_min: 30 }]);
assert.match(combined, /오늘 06:00 .*러닝/);
assert.match(combined, /기온 12℃ · 강수 10% · 바람 9km\/h/);

console.log('PASS weather alert evaluates safe conditions, merges approved plans, and stays silent otherwise');
