const assert = require('assert');
const { handleTelegramResponse } = require('../scripts/logfit-response');

function suggestionEvent() {
  return { event_type: 'decision_log', occurred_at: '2026-11-05T00:00:00.000Z', metadata: {
    kind: 'request', status: 'awaiting_user_approval', suggestion: {
      kind: 'plan', created_at: '2026-11-05T00:00:00.000Z', response: 'none', response_sec: null,
      options: [
        { label: '1안', date: '2026-11-06', time: '06:00', activity: '러닝', body_part: null, duration_min: 30, indoor: false },
        { label: '대안', date: '2026-11-06', time: '19:30', activity: '요가', body_part: null, duration_min: 50, indoor: true }
      ], executed_action: null
    }
  } };
}

const approved = handleTelegramResponse('1안 승인', { events: [suggestionEvent()], plans: [] }, new Date('2026-11-05T00:00:12.000Z'), {
  merge_weather: true,
  registerCron: () => 'cron-plan-1'
});
assert.strictEqual(approved.status, 'accepted');
assert.strictEqual(approved.state.plans[0].items[0].item_id, 'plan-item-1');
assert.strictEqual(approved.state.plans[0].items[0].reminder_at, '2026-11-06T05:30:00+09:00');
assert.strictEqual(approved.state.plans[0].items[0].cron_job_id, '360294886eb8');
assert.strictEqual(approved.state.events[0].metadata.suggestion.executed_action.cron_job_id, '360294886eb8');
assert.match(approved.message, /🏃‍♀️.*06:00/);
assert.match(approved.message, /05:30에 알려드릴게요/);

const alternative = handleTelegramResponse('대안 선택', { events: [suggestionEvent()], plans: [] }, new Date('2026-11-05T00:00:12.000Z'), {
  registerCron: () => 'cron-plan-2'
});
assert.strictEqual(alternative.state.plans[0].items[0].activity, '요가');
assert.match(alternative.message, /🧘‍♀️.*19:30/);

const firstReject = handleTelegramResponse('거절', { events: [suggestionEvent()], plans: [] }, new Date('2026-11-05T00:00:12.000Z'), { registerCron: () => 'unused' });
assert.strictEqual(firstReject.status, 'reoffered');
assert.strictEqual(firstReject.state.events.length, 2);
const secondReject = handleTelegramResponse('거절', firstReject.state, new Date('2026-11-05T00:01:12.000Z'), { registerCron: () => 'unused' });
assert.strictEqual(secondReject.status, 'rejected');
assert.match(secondReject.message, /종료/);

const duplicate = handleTelegramResponse('1안 승인', approved.state, new Date('2026-11-05T00:01:12.000Z'), { registerCron: () => { throw new Error('must not register'); } });
assert.strictEqual(duplicate.status, 'duplicate');
assert.match(duplicate.message, /이미 처리됐어요/);

const noPending = handleTelegramResponse('저장', { events: [], records: [], plans: [] }, new Date(), {});
assert.strictEqual(noPending.status, 'no_pending');
assert.match(noPending.message, /응답할 제안이 없어요/);

const recordState = { events: [{ event_type: 'decision_log', metadata: { kind: 'record', status: 'awaiting_confirmation', records: [{ type: 'exercise', exercise_type: '하체 근력운동', duration_min: 60, record_date: '2026-11-04', raw_text: '11월 4일 하체 근력운동 1시간 완료', completion: 'completed' }] } }], records: [] };
const saved = handleTelegramResponse('저장', recordState, new Date(), {});
assert.strictEqual(saved.status, 'saved');
assert.strictEqual(saved.state.records.length, 1);
assert.match(saved.message, /저장했어요/);
const duplicateRecord = handleTelegramResponse('저장', { events: [{ event_type: 'decision_log', metadata: { kind: 'record', status: 'awaiting_confirmation', records: [{ raw_text: '3km 달리기 성공', record_date: '2026-11-05', activity_name: '러닝', distance_km: 3 }] } }], records: [{ raw_text: '3km 달리기 성공', record_date: '2026-11-05', activity_name: '러닝', distance_km: 3 }] }, new Date(), {});
assert.strictEqual(duplicateRecord.status, 'duplicate');
assert.strictEqual(duplicateRecord.message, '이미 저장된 기록이에요.');
assert.strictEqual(duplicateRecord.state.records.length, 1);

const bodySaved = handleTelegramResponse('저장', { events: [{ event_type: 'decision_log', metadata: { kind: 'body_stats', status: 'awaiting_confirmation', body_stats: { record_date: '2026-11-05', values: { weight_kg: 62.4, body_fat_pct: 27.8, muscle_kg: 23.1 } } } }], body_stats: [] }, new Date(), {});
assert.strictEqual(bodySaved.status, 'saved');
assert.strictEqual(bodySaved.state.body_stats[0].weight_kg, 62.4);
assert.strictEqual(bodySaved.message, '기록했어요.');

console.log('PASS Telegram approval, alternative, rejection, duplicate, no-pending, and record-save responses');
