'use strict';

const { appendEvent, readState } = require('./logfit-bridge');

const input = JSON.parse(process.argv[2] || '{}');
if (input.check_only) {
  const eventId = String(input.event_id || '');
  const found = eventId && (readState().events || []).some((event) => String(event.event_id || '') === eventId);
  process.stdout.write(JSON.stringify({ processed: Boolean(found) }) + '\n');
  process.exit(0);
}
appendEvent({
  event_id: input.event_id || input.message_id || null,
  schedule_id: input.schedule_id || 'telegram-inbox',
  event_type: input.event_type || 'telegram_message',
  occurred_at: input.occurred_at || new Date().toISOString(),
  metadata: input.metadata || { text: String(input.text || '').slice(0, 1000), message_id: input.message_id || input.event_id || null }
});
process.stdout.write('{"saved":true}\n');
