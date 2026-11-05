const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'logfit-hook-'));
process.env.LOGFIT_RUNTIME_DIR = runtime;
const bridge = require('../scripts/logfit-bridge');
bridge.appendEvent({ schedule_id: 'telegram-inbox', event_type: 'decision_log', metadata: {
  kind: 'request', status: 'awaiting_user_approval', suggestion: {
    suggestion_id: 's-1', created_at: '2026-11-05T00:00:00+09:00', response: 'none',
    options: [{ label: '1안', date: '2026-11-06', time: '06:00', activity: '러닝', body_part: null, duration_min: 30, indoor: false }, { label: '대안', date: '2026-11-06', time: '05:30', activity: '요가', body_part: null, duration_min: 30, indoor: true }]
  }
} });

const python = "import sys; sys.path.insert(0, 'scripts/hermes-logfit-completion-hook'); import handler; handler.handle('agent:start', {'platform':'telegram','message':'1안 승인'})";
const approvalOutput = execFileSync('python3', ['-c', python], { cwd: path.resolve(__dirname, '..'), env: { ...process.env }, encoding: 'utf8' });
assert.match(approvalOutput, /\[logfit-response\] status=accepted/);
assert.doesNotMatch(approvalOutput, /\[logfit-router\] kind=/);
assert.strictEqual(bridge.readState().plans[0].items[0].activity, '러닝');

const generalOutput = execFileSync('python3', ['-c', "import sys; sys.path.insert(0, 'scripts/hermes-logfit-completion-hook'); import handler; handler.handle('agent:start', {'platform':'telegram','message':'오늘 기분 좋아'})"], { cwd: path.resolve(__dirname, '..'), env: { ...process.env }, encoding: 'utf8' });
assert.strictEqual(generalOutput, '');

const recordOutput = execFileSync('python3', ['-c', "import sys; sys.path.insert(0, 'scripts/hermes-logfit-completion-hook'); import handler; handler.handle('agent:start', {'platform':'telegram','message':'3km 달리기 성공'})"], { cwd: path.resolve(__dirname, '..'), env: { ...process.env }, encoding: 'utf8' });
assert.match(recordOutput, /\[logfit-router\] kind=record/);
assert.match(recordOutput, /🏃‍♀️ 러닝 · 3km/);
assert.doesNotMatch(recordOutput, /workout_log/);
const recordEvent = bridge.readState().events.find((event) => event.metadata && event.metadata.records && event.metadata.records[0].distance_km === 3);
assert.ok(recordEvent, '3km record must be routed to LogFit');

console.log('PASS polling-to-hook-to-response routing, record routing, and general-message handoff');
fs.rmSync(runtime, { recursive: true, force: true });
