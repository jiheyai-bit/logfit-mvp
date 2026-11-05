const assert = require('assert');
const fs = require('fs');
const path = require('path');
const runtimeDir = path.join(process.cwd(), '.tmp-p0-integrity');
fs.rmSync(runtimeDir, { recursive: true, force: true });
process.env.LOGFIT_RUNTIME_DIR = runtimeDir;
const { appendEvent } = require('../scripts/logfit-bridge');
const { handleTelegramResponse } = require('../scripts/logfit-response');
const { shouldSendFollowup } = require('../scripts/logfit-weather-followup');
const { shouldSendWeatherAlert } = require('../scripts/logfit-weather-alert');

const duplicateEventState = { events: [] };
const event = { event_id: 'telegram-update-1', schedule_id: 'telegram-inbox', event_type: 'telegram_message', metadata: { message_id: 'telegram-update-1' } };
const firstEvent = appendEvent(event);
const secondEvent = appendEvent(event);
assert.strictEqual(firstEvent.event_id, secondEvent.event_id);
assert.strictEqual(JSON.parse(fs.readFileSync(path.join(runtimeDir, 'state.json'), 'utf8')).events.length, 1);

function pendingRecord(id, text) {
  return {
    event_id: id,
    event_type: 'decision_log',
    metadata: {
      kind: 'record',
      status: 'awaiting_confirmation',
      records: [{ type: 'exercise', exercise_type: '러닝', duration_min: 30, record_date: '2026-11-05', raw_text: text, completion: 'completed' }]
    }
  };
}

const twoPending = { events: [pendingRecord('record-a', '오늘 러닝 3km 했어'), pendingRecord('record-b', '오늘 요가 30분 했어')], records: [] };
const ambiguous = handleTelegramResponse('저장', twoPending, new Date('2026-11-05T01:00:00Z'));
assert.strictEqual(ambiguous.status, 'needs_target');
assert.strictEqual(ambiguous.state.records.length, 0);

const chatAPending = pendingRecord('chat-a', '오늘 러닝 3km 했어');
chatAPending.metadata.chat_id = 'chat-a';
const chatBPending = pendingRecord('chat-b', '오늘 요가 30분 했어');
chatBPending.metadata.chat_id = 'chat-b';
const chatScoped = { events: [chatAPending, chatBPending], records: [] };
const wrongConversation = handleTelegramResponse('저장', chatScoped, new Date('2026-11-05T01:00:00Z'), { chat_id: 'chat-c' });
assert.strictEqual(wrongConversation.status, 'no_pending');
assert.strictEqual(wrongConversation.state.records.length, 0);
const rightConversation = handleTelegramResponse('저장', chatScoped, new Date('2026-11-05T01:00:00Z'), { chat_id: 'chat-b' });
assert.strictEqual(rightConversation.status, 'saved');
assert.strictEqual(rightConversation.state.records.length, 1);
assert.strictEqual(rightConversation.state.records[0].raw_text, '오늘 요가 30분 했어');

function pendingSuggestion(id, chatId, activity) {
  return { event_id: id, event_type: 'decision_log', metadata: { chat_id: chatId, status: 'awaiting_user_approval', suggestion: { response: 'none', created_at: '2026-11-05T00:00:00Z', options: [{ date: '2026-11-07', time: '07:00', activity, duration_min: 30 }] } } };
}
const suggestionState = { events: [pendingSuggestion('sug-a', 'chat-a', '러닝'), pendingSuggestion('sug-b', 'chat-b', '요가')] };
const approveA = handleTelegramResponse('승인', suggestionState, new Date('2026-11-05T01:00:00Z'), { chat_id: 'chat-a' });
assert.strictEqual(approveA.status, 'accepted');
assert.strictEqual(approveA.state.events[0].metadata.suggestion.response, 'accepted');
assert.strictEqual(approveA.state.events[1].metadata.suggestion.response, 'none');

const mixedState = { events: [pendingSuggestion('sug-a', 'chat-a', '러닝'), chatBPending] };
const approveMixed = handleTelegramResponse('승인', mixedState, new Date('2026-11-05T01:00:00Z'), { chat_id: 'chat-a' });
assert.strictEqual(approveMixed.status, 'accepted');

const targetedState = { events: [pendingSuggestion('sug-1', 'chat-c', '러닝'), pendingSuggestion('sug-2', 'chat-c', '요가')] };
const targeted = handleTelegramResponse('승인', targetedState, new Date('2026-11-05T01:00:00Z'), { chat_id: 'chat-c', pending_id: 'sug-1' });
assert.strictEqual(targeted.status, 'accepted');
assert.strictEqual(targeted.state.events[0].metadata.suggestion.response, 'accepted');
assert.strictEqual(targeted.state.events[1].metadata.suggestion.response, 'none');

const newMessageWhilePending = handleTelegramResponse('오늘 러닝 5km 했어', twoPending, new Date('2026-11-05T01:00:00Z'));
assert.strictEqual(newMessageWhilePending.status, 'no_pending');

const onePending = { events: [pendingRecord('record-old', '3km 달리기 성공')], records: [] };
const newRecordWhileOnePending = handleTelegramResponse('11월 5일 오후 8시30분 animal flow yoga 50분', onePending, new Date('2026-11-05T01:00:00Z'));
assert.strictEqual(newRecordWhileOnePending.status, 'no_pending');
assert.strictEqual(newRecordWhileOnePending.state.records.length, 0);

const noPendingApproval = handleTelegramResponse('승인', { events: [], records: [] }, new Date('2026-11-05T01:00:00Z'));
assert.strictEqual(noPendingApproval.status, 'no_pending');

const cancelled = { events: [{ ...pendingRecord('cancelled-1', '오늘 러닝 3km 했어'), metadata: { ...pendingRecord('cancelled-1', '').metadata, status: 'cancelled' } }], records: [] };
const lateApproval = handleTelegramResponse('저장', cancelled, new Date('2026-11-05T01:00:00Z'));
assert.strictEqual(lateApproval.status, 'no_pending');
assert.strictEqual(lateApproval.state.records.length, 0);

const alertTime = new Date('2026-11-06T05:30:00+09:00');
const afterInboundMessage = {
  events: [
    { event_id: 'alert-1', schedule_id: 'routine-hangang-5km-weather', event_type: 'weather_alert_sent', occurred_at: '2026-11-05T20:30:00.000Z', metadata: {} },
    { event_id: 'telegram-update-2', schedule_id: 'routine-hangang-5km-weather', event_type: 'telegram_message', occurred_at: '2026-11-05T20:35:00.000Z', metadata: { message_id: 'telegram-update-2' } }
  ]
};
assert.strictEqual(shouldSendFollowup(afterInboundMessage, alertTime, 1), false);

const forecast = { forecast_at: '2026-11-06T05:30:00+09:00' };
const sentForecast = { events: [{ event_type: 'weather_alert_sent', schedule_id: 'routine-hangang-5km-weather', metadata: { forecast } }] };
assert.strictEqual(shouldSendWeatherAlert(sentForecast, forecast), false);

fs.rmSync(runtimeDir, { recursive: true, force: true });
console.log('PASS P0 pending-target, late-response, and followup-stop guards');

// One sentence with a workout and a meal must save both records, and saving again must save none.
const { routeTelegramMessage } = require('../scripts/logfit-telegram-router');
const mixed = routeTelegramMessage('11월 5일 오후 8시30분 animal flow yoga 50분, 점심은 봉골레 파스타', new Date('2026-11-06T03:00:00+09:00'));
const sentenceState = { events: [{ event_id: 'mixed-1', metadata: { kind: 'record', status: 'awaiting_confirmation', chat_id: 'c', records: mixed.records } }], records: [] };
const mixedSaved = handleTelegramResponse('저장', sentenceState, new Date('2026-11-06T03:00:00+09:00'), { chat_id: 'c' });
assert.strictEqual(mixedSaved.status, 'saved');
assert.deepStrictEqual(mixedSaved.state.records.map((r) => r.type).sort(), ['exercise', 'meal']);
const { saveConfirmedRecords } = require('../scripts/logfit-response');
assert.strictEqual(saveConfirmedRecords(mixedSaved.state, mixed.records, 'dashboard_confirmed'), 0);
console.log('PASS multi-record sentence saves every record once');
