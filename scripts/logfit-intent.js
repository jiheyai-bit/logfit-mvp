'use strict';

const ACTIVITY_EMOJI = {
  running: '🏃‍♀️',
  러닝: '🏃‍♀️',
  조깅: '🏃‍♀️',
  exercise: '💪',
  근력: '💪',
  근력운동: '💪',
  yoga: '🧘‍♀️',
  요가: '🧘‍♀️',
  meal: '🍚',
  식사: '🍚',
  rest: '😴',
  휴식: '😴'
};

function hasRecordLanguage(text) {
  const source = String(text || '');
  const completion = /(완료|성공|했어|했다|했어요|뛰었어|끝냈어|다녀왔어|먹었어|먹었다|먹었어요|마셨어|마셨다|했(?:고|으며|지만)|진행|기록했|남겼|쉬었어|쉬었다|기록해)/.test(source);
  const activityOrMeasure = /(\d+(?:\.\d+)?\s*km|\d+(?:\.\d+)?\s*(?:분|시간)|러닝|달리기|달렸|뛰|요가|근력|스쿼트|운동|먹|마시|휴식|쉬었|animal\s*flow(?:\s*yoga)?|yoga|running|jogging|swimming|cycling|walking|pilates|strength|workout|exercise|hiking|jump\s*rope)/i.test(source);
  const explicitExerciseMeasurement = /(\d+(?:\.\d+)?\s*(?:km|분|시간))/.test(source) && /(운동|요가|달리기|러닝|조깅|수영|자전거|사이클|헬스|필라테스|근력|등산|줄넘기|animal\s*flow(?:\s*yoga)?|yoga|running|jogging|swimming|cycling|walking|pilates|strength|workout|exercise|hiking|jump\s*rope)/i.test(source) && !/(할\s*거야|할\s*예정|할\s*계획|하려고|계획)/.test(source);
  return (completion || explicitExerciseMeasurement) && activityOrMeasure;
}

function hasScheduleLanguage(text) {
  return /(?:할\s*거야|할\s*예정|할\s*계획|하러\s*갈|갈\s*거야|뛸\s*거야|계획은|계획이야|예정이야)/.test(text) && !/(계획\s*(세워|짜)|추천|정해|알려|잡아)/.test(text);
}

function hasRequestLanguage(text) {
  return /(계획\s*(세워|짜)|추천해|추천\s*해|정해\s*줘|알려\s*줘|운동\s*시간|일정\s*(잡아|짜)|리마인드|알림\s*(보내|설정))/.test(text);
}

function classifyInput(input) {
  const text = String(input || '').trim();
  const record = hasRecordLanguage(text);
  const schedule = hasScheduleLanguage(text);
  const request = hasRequestLanguage(text);
  const kinds = [];
  if (record) kinds.push('record');
  if (schedule) kinds.push('schedule');
  if (request) kinds.push('request');
  if (kinds.length > 1) return { kind: 'mixed', kinds, reason: 'multiple_intents', text };
  if (record) return { kind: 'record', reason: 'completion_language', text };
  if (schedule) return { kind: 'schedule', reason: 'future_personal_plan', text };
  if (request) return { kind: 'request', reason: 'planning_request', text };
  return { kind: 'other', reason: 'no_supported_intent', text };
}

function emojiForRecord(record) {
  if (record.type === 'meal') return ACTIVITY_EMOJI.meal;
  if (record.type === 'rest') return ACTIVITY_EMOJI.rest;
  const value = String(record.exercise_type || record.activity_name || '근력운동');
  if (/러닝|조깅|달리|유산소/.test(value)) return ACTIVITY_EMOJI.running;
  if (/요가/.test(value)) return ACTIVITY_EMOJI.yoga;
  return ACTIVITY_EMOJI.exercise;
}

function describeRecord(record) {
  const emoji = emojiForRecord(record);
  if (record.type === 'meal') return `${emoji} ${record.meal_period || '식사'} ${record.item || '기록'}`;
  if (record.type === 'rest') return `${emoji} 휴식`;
  let name = record.exercise_type || record.activity_name || '근력운동';
  if (/하체/.test(String(record.raw_text || '')) && /근력/.test(String(record.raw_text || ''))) name = '하체 근력운동';
  const duration = record.duration_min == null ? '' : ` · ${record.duration_min}분`;
  const distance = record.distance_km == null ? '' : ` · ${record.distance_km}km`;
  return `${emoji} ${name}${distance}${duration}`;
}

function buildRecordConfirmation(records) {
  const lines = records.map((record, index) => `${index + 1}. ${describeRecord(record)}`);
  return ['기록으로 이해했어요.', '', ...lines, '', '이대로 저장할까요?', '[저장] [수정] [취소]'].join('\n');
}

module.exports = { ACTIVITY_EMOJI, classifyInput, buildRecordConfirmation, describeRecord };
