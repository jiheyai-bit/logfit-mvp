'use strict';

const { mergeNotification } = require('./logfit-plan-chain');

function normalizeResponse(text) {
  const value = String(text || '').trim();
  if (/^1안\s*(승인|선택)|^1\s*안\s*(승인|선택)|^승인$/.test(value)) return { kind: 'approve', index: 0 };
  if (/^대안\s*(선택|승인)|^2안\s*(선택|승인)/.test(value)) return { kind: 'approve', index: 1 };
  if (/^거절|^싫어|^취소해/.test(value)) return { kind: 'reject' };
  if (/^저장|^확인|^응/.test(value)) return { kind: 'save' };
  if (/^수정|^바꿔/.test(value)) return { kind: 'edit' };
  if (/^취소/.test(value)) return { kind: 'cancel' };
  return { kind: 'other' };
}

function latestPending(state, chatId = null) {
  return pendingItems(state, chatId).at(-1) || null;
}

function pendingItems(state, chatId = null) {
  const events = Array.isArray(state && state.events) ? state.events : [];
  return events.map((event, index) => ({ event, index })).filter(({ event }) => {
    const metadata = event && event.metadata || {};
    const suggestion = metadata.suggestion;
    if (chatId && String(metadata.chat_id || '') !== String(chatId)) return false;
    return (metadata.status === 'awaiting_user_approval' && suggestion && suggestion.response === 'none') || (metadata.status === 'awaiting_confirmation' && metadata.kind !== 'cancelled');
  });
}

function updateEvent(state, index, metadata) {
  const events = state.events || (state.events = []);
  events[index] = { ...events[index], metadata: { ...events[index].metadata, ...metadata } };
}

function handleSuggestionResponse(reply, state, pending, now, options) {
  const choice = normalizeResponse(reply);
  const event = pending.event;
  const metadata = event.metadata;
  const suggestion = metadata.suggestion;
  if (suggestion.response !== 'none') return { status: 'duplicate', state, message: '이미 처리됐어요.' };
  if (choice.kind === 'reject') {
    const rejectionCount = Number(suggestion.rejection_count || 0) + 1;
    suggestion.response = 'rejected';
    suggestion.responded_at = now.toISOString();
    suggestion.response_sec = Math.max(0, Math.round((now - new Date(suggestion.created_at)) / 1000));
    suggestion.rejection_count = rejectionCount;
    if (rejectionCount === 1) {
      const reoffer = { ...event, event_id: `event-${Date.now().toString(36)}`, metadata: { ...metadata, status: 'awaiting_user_approval', suggestion: { ...suggestion, suggestion_id: `${suggestion.suggestion_id || 'suggestion'}-retry`, response: 'none', responded_at: null, response_sec: null, executed_action: null } } };
      state.events.push(reoffer);
      return { status: 'reoffered', state, message: '알겠어요. 다른 선택지를 한 번만 더 제안할게요.' };
    }
    updateEvent(state, pending.index, { status: 'rejected', suggestion });
    return { status: 'rejected', state, message: '알겠어요. 이번 제안은 종료할게요.' };
  }
  if (choice.kind !== 'approve') return { status: choice.kind === 'other' ? 'unhandled' : choice.kind, state, message: choice.kind === 'edit' ? '어떤 내용으로 수정할지 알려주세요.' : choice.kind === 'cancel' ? '대기 중인 제안을 취소했어요.' : '응답을 확인했어요.' };
  const option = suggestion.options[choice.index];
  if (!option) return { status: 'unhandled', state, message: '선택한 대안을 찾지 못했어요.' };
  if (!Array.isArray(state.plans)) state.plans = [];
  const itemId = `plan-item-${state.plans.reduce((count, plan) => count + (Array.isArray(plan.items) ? plan.items.length : 0), 0) + 1}`;
  const planItem = { ...option, item_id: itemId, status: 'planned' };
  const plannedStart = `${option.date}T${option.time}:00+09:00`;
  const reminderAt = `${option.date}T${option.time === '06:00' ? '05:30' : option.time}:00+09:00`;
  const weather = options && options.weatherNotification || (options && options.merge_weather && option.time === '06:00' ? { at: reminderAt, cron_job_id: '360294886eb8' } : null);
  const merge = mergeNotification({ planned_start_at: reminderAt, cron_job_id: null }, weather);
  const cronId = merge.merged ? merge.cron_job_id : (options && options.registerCron ? options.registerCron(planItem) : null);
  planItem.reminder_at = `${option.date}T${option.time === '06:00' ? '05:30' : option.time}:00+09:00`;
  planItem.cron_job_id = cronId;
  const planId = `plan-${option.date}`;
  const plan = state.plans.find((value) => value.plan_id === planId) || { plan_id: planId, week_start: option.date, items: [], adjustments: [] };
  plan.items.push(planItem);
  const planIndex = state.plans.findIndex((value) => value.plan_id === planId);
  if (planIndex >= 0) state.plans[planIndex] = plan; else state.plans.push(plan);
  suggestion.response = 'accepted';
  suggestion.responded_at = now.toISOString();
  suggestion.response_sec = Math.max(0, Math.round((now - new Date(suggestion.created_at)) / 1000));
  suggestion.executed_action = { plan_item_id: itemId, cron_job_id: cronId };
  updateEvent(state, pending.index, { status: 'executed', suggestion, plan: { plan_id: planId, items: plan.items } });
  const emoji = option.activity === '러닝' ? '🏃‍♀️' : option.activity === '요가' ? '🧘‍♀️' : '💪';
  return { status: 'accepted', state, message: `${emoji} ${option.date.slice(5).replace('-', '월 ')}일 ${option.time} ${option.activity}으로 정했어요. ${merge.merged ? '05:30' : option.time}에 알려드릴게요.`, merged: merge.merged };
}

// One sentence can hold several records (e.g. a workout and a meal), so the sentence alone is not the identity.
function recordKey(record) {
  return [record.record_date, record.type || 'exercise', String(record.exercise_type || record.item || '').trim(), record.raw_text].join('|');
}

function saveConfirmedRecords(state, records, source, idPrefix = 'telegram-record') {
  if (!Array.isArray(state.records)) state.records = [];
  let savedCount = 0;
  (records || []).forEach((record, index) => {
    if (!record || !record.record_date) return;
    if (state.records.some((item) => recordKey(item) === recordKey(record))) return;
    state.records.push({ ...record, id: record.id || `${idPrefix}-${Date.now()}-${index}`, completion: record.completion || 'completed', source });
    savedCount += 1;
  });
  return savedCount;
}

function handleRecordResponse(reply, state, pending, now) {
  const choice = normalizeResponse(reply);
  if (choice.kind === 'save') {
    const savedCount = saveConfirmedRecords(state, pending.event.metadata.records || [], 'telegram_confirmed');
    updateEvent(state, pending.index, { status: 'executed', confirmation: 'saved', duplicate: savedCount === 0 });
    if (savedCount === 0) return { status: 'duplicate', state, message: '이미 저장된 기록이에요.' };
    return { status: 'saved', state, message: `확인한 기록 ${savedCount}건을 저장했어요.` };
  }
  if (choice.kind === 'edit') return { status: 'edit_requested', state, message: '수정할 기록 내용을 다시 보내주세요.' };
  if (choice.kind === 'cancel') { updateEvent(state, pending.index, { status: 'cancelled', confirmation: 'cancelled' }); return { status: 'cancelled', state, message: '기록을 저장하지 않고 취소했어요.' }; }
  return { status: 'unhandled', state, message: '저장·수정·취소 중 하나로 답해 주세요.' };
}

function handleBodyStatsResponse(reply, state, pending) {
  const choice = normalizeResponse(reply);
  if (choice.kind === 'save') {
    if (!Array.isArray(state.body_stats)) state.body_stats = [];
    const entry = pending.event.metadata.body_stats;
    const index = state.body_stats.findIndex((item) => item.record_date === entry.record_date);
    const saved = { id: `body-${entry.record_date}`, record_date: entry.record_date, ...(entry.values || {}), source: 'telegram_confirmed', updated_at: new Date().toISOString() };
    if (index >= 0) state.body_stats[index] = { ...state.body_stats[index], ...saved }; else state.body_stats.push(saved);
    updateEvent(state, pending.index, { status: 'executed', confirmation: 'saved' });
    return { status: 'saved', state, message: '기록했어요.' };
  }
  if (choice.kind === 'edit') return { status: 'edit_requested', state, message: '체중·체지방률·근육량을 다시 보내주세요.' };
  if (choice.kind === 'cancel') { updateEvent(state, pending.index, { status: 'cancelled', confirmation: 'cancelled' }); return { status: 'cancelled', state, message: '신체 기록을 저장하지 않고 취소했어요.' }; }
  return { status: 'unhandled', state, message: '저장·수정·취소 중 하나로 답해 주세요.' };
}

function handleTelegramResponse(reply, inputState = {}, now = new Date(), options = {}) {
  const state = JSON.parse(JSON.stringify(inputState || {}));
  if (!Array.isArray(state.events)) state.events = [];
  const chatId = options && options.chat_id ? String(options.chat_id) : null;
  const pendingList = pendingItems(state, chatId);
  const targetId = options && options.pending_id ? String(options.pending_id) : null;
  const pending = targetId
    ? pendingList.find(({ event }) => String(event.event_id || event.metadata && event.metadata.pending_id || '') === targetId)
    : pendingList.length === 1 ? pendingList[0] : latestPending(state, chatId);
  // A new message (not 저장/승인/취소 etc.) must reach the normal router even while items wait.
  if (!targetId && normalizeResponse(reply).kind === 'other') return { status: 'no_pending', state, message: '지금 응답할 제안이 없어요.' };
  if (pendingList.length > 1 && !targetId) return { status: 'needs_target', state, message: '대기 중인 작업이 여러 개 있어요. 승인·저장·취소할 작업을 지정해 주세요.' };
  if (targetId && !pending) return { status: 'no_pending', state, message: '지정한 대기 작업을 찾지 못했어요.' };
  if (!pending) {
    const latestSuggestion = (state.events || []).map((event) => event && event.metadata && event.metadata.suggestion).filter(Boolean).at(-1);
    const normalized = normalizeResponse(reply);
    if (latestSuggestion && latestSuggestion.response && latestSuggestion.response !== 'none' && normalized.kind !== 'other') return { status: 'duplicate', state, message: '이미 처리됐어요.' };
    return { status: 'no_pending', state, message: '지금 응답할 제안이 없어요.' };
  }
  const metadata = pending.event.metadata || {};
  if (metadata.suggestion) return handleSuggestionResponse(reply, state, pending, now, options);
  if (metadata.kind === 'body_stats') return handleBodyStatsResponse(reply, state, pending);
  if (metadata.kind === 'record') return handleRecordResponse(reply, state, pending, now);
  return { status: 'no_pending', state, message: '지금 응답할 제안이 없어요.' };
}

module.exports = { normalizeResponse, handleTelegramResponse, saveConfirmedRecords };
