const assert = require('assert');
const { shouldSendFollowup, renderFollowup } = require('../scripts/logfit-weather-followup');

const alertAt = '2026-11-05T05:30:00+09:00';
const base = {
  events: [{ event_type: 'weather_alert_sent', schedule_id: 'routine-hangang-5km-weather', occurred_at: alertAt }]
};

assert.strictEqual(shouldSendFollowup(base, '2026-11-05T05:40:00+09:00', 1), true);
assert.strictEqual(shouldSendFollowup(base, '2026-11-05T05:50:00+09:00', 2), true);
assert.match(renderFollowup(1), /05:40/);
assert.match(renderFollowup(2), /05:50/);

const replied = {
  events: [
    ...base.events,
    { event_type: 'telegram_message', schedule_id: 'routine-hangang-5km-weather', occurred_at: '2026-11-05T05:35:00+09:00', metadata: { text: '오늘은 쉬겠습니다' } }
  ]
};
assert.strictEqual(shouldSendFollowup(replied, '2026-11-05T05:40:00+09:00', 1), false);

const alreadySent = {
  events: [
    ...base.events,
    { event_type: 'weather_followup_sent', schedule_id: 'routine-hangang-5km-weather', occurred_at: '2026-11-05T05:40:00+09:00', metadata: { reminder_number: 1 } }
  ]
};
assert.strictEqual(shouldSendFollowup(alreadySent, '2026-11-05T05:40:00+09:00', 1), false);

console.log('PASS weather followups send at 05:40 and 05:50 only when unanswered');
