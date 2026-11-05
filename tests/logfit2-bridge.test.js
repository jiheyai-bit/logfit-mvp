const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'logfit-bridge-'));
process.env.LOGFIT_RUNTIME_DIR = runtime;
const bridge = require('../scripts/logfit-bridge');

const saved = bridge.upsertSchedule({ schedule_id: 'schedule-test-1', planned_start_at: '2026-11-04T19:00:00+09:00' });
assert.strictEqual(saved.schedule_id, 'schedule-test-1');
assert.strictEqual(saved.timezone, 'Asia/Seoul');
assert.strictEqual(saved.notification_channel, 'telegram');
assert.strictEqual(saved.cron_job_id, null);

const updated = bridge.upsertSchedule({ schedule_id: 'schedule-test-1', status: 'scheduled', cron_job_id: 'cron-test-1' });
assert.strictEqual(updated.status, 'scheduled');
assert.strictEqual(bridge.readState().schedules.length, 1);
assert.strictEqual(bridge.readState().schedules[0].cron_job_id, 'cron-test-1');

const plan = bridge.upsertPlan({ plan_id: 'plan-test-1', week_start: '2026-11-02', items: [{ item_id: 'item-1', activity: '러닝', date: '2026-11-06', time: '06:00', duration_min: 30, indoor: false, status: 'planned' }] });
assert.strictEqual(plan.items[0].item_id, 'item-1');
assert.strictEqual(bridge.readState().plans.length, 1);

const event = bridge.appendEvent({ schedule_id: 'schedule-test-1', event_type: 'suggestion_shown' });
assert.strictEqual(event.schedule_id, 'schedule-test-1');
assert.strictEqual(bridge.readState().events.length, 1);
assert.ok(fs.statSync(bridge.statePath).mode & 0o600);

console.log('PASS bridge persists schedule metadata and intervention events');
fs.rmSync(runtime, { recursive: true, force: true });
