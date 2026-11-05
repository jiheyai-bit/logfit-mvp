const assert = require('assert');
const fs = require('fs');
const path = require('path');
const runtimeDir = path.join(process.cwd(), '.tmp-dashboard-plan');
fs.rmSync(runtimeDir, { recursive: true, force: true });
process.env.LOGFIT_RUNTIME_DIR = runtimeDir;
const { routeTelegramMessage } = require('../scripts/logfit-telegram-router');
const { saveDashboardPlan, readState } = require('../scripts/logfit-bridge');

const text = '11월8일 일요일 아침에 한강으로 조깅하러 갈거야. 계획은 10km';
const routed = routeTelegramMessage(text, new Date('2026-11-06T04:40:00+09:00'));
assert.strictEqual(routed.kind, 'schedule');
assert.strictEqual(routed.plan.plan_date, '2026-11-08');
assert.strictEqual(routed.plan.activity_name, '조깅');
assert.strictEqual(routed.plan.distance_km, 10);
assert.strictEqual(routed.plan.time_label, '아침');
assert.strictEqual(routed.plan.planned_start_at, null);

const weekday = routeTelegramMessage('일요일 아침 러닝할 예정이야', new Date('2026-11-06T04:40:00+09:00'));
assert.strictEqual(weekday.plan.plan_date, '2026-11-08');

const first = saveDashboardPlan({ text, plan: routed.plan });
assert.strictEqual(first.saved, true);
const second = saveDashboardPlan({ text, plan: routed.plan });
assert.strictEqual(second.duplicate, true);
const state = readState();
const items = state.plans.find((plan) => plan.plan_id === 'plan-2026-11-08').items;
assert.strictEqual(items.length, 1);
assert.deepStrictEqual({ date: items[0].date, activity: items[0].activity, km: items[0].distance_km, time: items[0].time, status: items[0].status }, { date: '2026-11-08', activity: '조깅', km: 10, time: null, status: 'planned' });

fs.rmSync(runtimeDir, { recursive: true, force: true });
console.log('PASS dashboard plan sentence is parsed and saved once');

// A planned workout sent as a record is refused, so plans never become records.
{
  const dir = path.join(process.cwd(), '.tmp-dashboard-plan-2');
  fs.rmSync(dir, { recursive: true, force: true });
  process.env.LOGFIT_RUNTIME_DIR = dir;
  delete require.cache[require.resolve('../scripts/logfit-bridge')];
  const bridge = require('../scripts/logfit-bridge');
  assert.throws(() => bridge.saveDashboardRecords({ text, records: [{ type: 'exercise', exercise_type: '조깅', record_date: '2026-11-08', raw_text: text, completion: 'planned' }] }), /completed records are required/);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('PASS planned workouts are not saved as records');
}
