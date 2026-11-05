const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'logfit-completion-'));
process.env.LOGFIT_RUNTIME_DIR = runtime;
const completion = require('../scripts/logfit-completion');
const bridge = require('../scripts/logfit-bridge');

const parsed = completion.parseCompletionMessage('5km 공복 유산소 완료, 평균 1km 6분 40초');
assert.strictEqual(parsed.completed, true);
assert.strictEqual(parsed.distance_km, 5);
assert.strictEqual(parsed.pace_sec_per_km, 400);
assert.strictEqual(parsed.duration_min, 33.333333333333336);
assert.strictEqual(parsed.activity_name, '한강 5km 공복 유산소');

const first = bridge.upsertCompletion({
  schedule_id: 'schedule-morning-run',
  raw_text: '5km 공복 유산소 완료, 평균 1km 6분 40초',
  distance_km: parsed.distance_km,
  pace_sec_per_km: parsed.pace_sec_per_km,
  duration_min: parsed.duration_min,
  activity_name: parsed.activity_name,
  record_date: '2026-11-05'
});
assert.strictEqual(first.created, true);
assert.strictEqual(first.record.distance_km, 5);
assert.strictEqual(first.record.pace_sec_per_km, 400);

const second = bridge.upsertCompletion({
  schedule_id: 'schedule-morning-run',
  raw_text: '5km 공복 유산소 완료, 평균 1km 6분 40초',
  distance_km: 5,
  pace_sec_per_km: 400,
  duration_min: parsed.duration_min,
  activity_name: parsed.activity_name,
  record_date: '2026-11-05'
});
assert.strictEqual(second.created, false);
assert.strictEqual(bridge.readState().records.length, 1);

console.log('PASS completion message parses and persists one idempotent LogFit record');
fs.rmSync(runtime, { recursive: true, force: true });
