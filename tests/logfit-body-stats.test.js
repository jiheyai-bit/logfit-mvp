const assert = require('assert');
const { parseBodyStatsMessage, formatBodyStatsConfirmation } = require('../scripts/logfit-body-stats');

const parsed = parseBodyStatsMessage('11월 5일 체중 62.4kg, 체지방률 27.8%, 근육량 23.1kg');
assert.strictEqual(parsed.kind, 'body_stats');
assert.strictEqual(parsed.record_date, '2026-11-05');
assert.deepStrictEqual(parsed.values, { weight_kg: 62.4, body_fat_pct: 27.8, muscle_kg: 23.1 });
assert.match(formatBodyStatsConfirmation(parsed), /체중 62\.4kg/);
assert.match(formatBodyStatsConfirmation(parsed), /저장/);

console.log('PASS Telegram body stats parsing and confirmation');
