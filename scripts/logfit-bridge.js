#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { getCalendarWindows } = require('./logfit-calendar');
const { handleTelegramResponse, saveConfirmedRecords } = require('./logfit-response');

const runtimeDir = process.env.LOGFIT_RUNTIME_DIR || path.join(process.cwd(), '.logfit-runtime');
const statePath = path.join(runtimeDir, 'state.json');

function readState() {
  try {
    const value = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return value && typeof value === 'object' ? value : { schedules: [], events: [], records: [], plans: [], body_stats: [] };
  } catch (_) {
    return { schedules: [], events: [], records: [], plans: [], body_stats: [] };
  }
}

function writeState(state) {
  fs.mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  return state;
}

function upsertSchedule(schedule) {
  if (!schedule || !schedule.schedule_id) throw new Error('schedule_id is required');
  const state = readState();
  const normalized = {
    schedule_id: String(schedule.schedule_id),
    activity_type: schedule.activity_type || 'exercise',
    planned_start_at: schedule.planned_start_at || null,
    reminder_at: schedule.reminder_at || null,
    expected_duration_min: schedule.expected_duration_min ?? null,
    status: schedule.status || 'draft',
    timezone: schedule.timezone || 'Asia/Seoul',
    cron_job_id: schedule.cron_job_id || null,
    notification_channel: schedule.notification_channel || 'telegram',
    notification_status: schedule.notification_status || 'pending',
    linked_record_id: schedule.linked_record_id || null,
    updated_at: new Date().toISOString()
  };
  const index = state.schedules.findIndex((item) => item.schedule_id === normalized.schedule_id);
  if (index >= 0) state.schedules[index] = { ...state.schedules[index], ...normalized };
  else state.schedules.push(normalized);
  return writeState(state).schedules.find((item) => item.schedule_id === normalized.schedule_id);
}

function appendEvent(event) {
  if (!event || !event.event_type || !event.schedule_id) throw new Error('event_type and schedule_id are required');
  const state = readState();
  const eventId = event.event_id ? String(event.event_id) : null;
  const existing = eventId && state.events.find((item) => String(item.event_id || '') === eventId);
  if (existing) return existing;
  const item = { event_id: eventId || `event-${Date.now().toString(36)}`, schedule_id: String(event.schedule_id), event_type: event.event_type, channel: event.channel || null, occurred_at: event.occurred_at || new Date().toISOString(), metadata: event.metadata || {} };
  state.events.push(item);
  writeState(state);
  return item;
}

function upsertPlan(plan) {
  if (!plan || !plan.plan_id) throw new Error('plan_id is required');
  const state = readState();
  if (!Array.isArray(state.plans)) state.plans = [];
  const normalized = { plan_id: String(plan.plan_id), week_start: plan.week_start || null, items: Array.isArray(plan.items) ? plan.items : [], adjustments: Array.isArray(plan.adjustments) ? plan.adjustments : [], updated_at: new Date().toISOString() };
  const index = state.plans.findIndex((item) => item.plan_id === normalized.plan_id);
  if (index >= 0) state.plans[index] = { ...state.plans[index], ...normalized }; else state.plans.push(normalized);
  return writeState(state).plans.find((item) => item.plan_id === normalized.plan_id);
}

function upsertBodyStats(entry) {
  if (!entry || !entry.record_date || !entry.values) throw new Error('record_date and values are required');
  const state = readState();
  if (!Array.isArray(state.body_stats)) state.body_stats = [];
  const normalized = { id: entry.id || `body-${entry.record_date}`, record_date: entry.record_date, ...entry.values, source: entry.source || 'telegram_confirmed', updated_at: new Date().toISOString() };
  const index = state.body_stats.findIndex((item) => item.record_date === normalized.record_date);
  if (index >= 0) state.body_stats[index] = { ...state.body_stats[index], ...normalized }; else state.body_stats.push(normalized);
  return writeState(state).body_stats.find((item) => item.id === normalized.id);
}

function upsertCompletion(record) {
  if (!record || !record.raw_text || !record.record_date) throw new Error('raw_text and record_date are required');
  const state = readState();
  if (!Array.isArray(state.records)) state.records = [];
  const identity = record.record_id || record.schedule_id || `${record.record_date}:${record.activity_name}:${record.raw_text}`;
  const existing = state.records.find((item) => item.record_id === identity || (item.raw_text === record.raw_text && item.record_date === record.record_date));
  if (existing) return { created: false, record: existing };
  const normalized = {
    record_id: identity,
    id: identity,
    linked_schedule_id: record.schedule_id || null,
    type: 'exercise',
    activity_name: record.activity_name || '러닝',
    exercise_type: record.activity_name || '러닝',
    item: record.activity_name || '러닝',
    raw_text: record.raw_text,
    record_date: record.record_date,
    distance_km: Number(record.distance_km),
    pace_sec_per_km: Number(record.pace_sec_per_km),
    duration_min: Number(record.duration_min),
    completion: 'completed',
    source: 'telegram_completion',
    created_at: record.created_at || new Date().toISOString()
  };
  state.records.push(normalized);
  writeState(state);
  return { created: true, record: normalized };
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

// Records the user confirmed in the dashboard input box, logged like a Telegram decision.
function saveDashboardRecords(input) {
  // Only completed activity becomes a record; plans go through saveDashboardPlan.
  const records = (Array.isArray(input && input.records) ? input.records : []).filter((record) => record && !['planned', 'draft', 'uncertain'].includes(record.completion));
  if (!records.length) throw new Error('completed records are required');
  const state = readState();
  if (!Array.isArray(state.events)) state.events = [];
  const savedCount = saveConfirmedRecords(state, records, 'dashboard_confirmed', 'dashboard-record');
  const at = new Date().toISOString();
  const text = String(input.text || records[0].raw_text || '').slice(0, 1000);
  state.events.push({
    event_id: `dashboard-${Date.now().toString(36)}`,
    schedule_id: 'dashboard-input',
    event_type: 'decision_log',
    channel: 'dashboard',
    occurred_at: at,
    metadata: {
      kind: 'record',
      status: 'executed',
      confirmation: 'saved',
      duplicate: savedCount === 0,
      records,
      decision_log: { at, decision: 'record', inputs: { channel: 'dashboard', text }, reason: savedCount ? 'dashboard_confirmed' : 'duplicate_record', tools: ['classifyInput', 'parseLogFitSentence'], status: 'executed' }
    }
  });
  writeState(state);
  return { saved: savedCount, duplicate: savedCount === 0 };
}

// A plan the user confirmed in the dashboard input box. The user's click is the approval;
// no reminder or cron job is registered here.
function saveDashboardPlan(input) {
  const plan = input && input.plan;
  if (!plan || !/^\d{4}-\d{2}-\d{2}$/.test(String(plan.plan_date || '')) || !plan.activity_name) throw new Error('plan_date and activity_name are required');
  const state = readState();
  if (!Array.isArray(state.plans)) state.plans = [];
  if (!Array.isArray(state.events)) state.events = [];
  const date = plan.plan_date;
  const time = plan.planned_start_at ? String(plan.planned_start_at).slice(11, 16) : null;
  const rawText = String(input.text || plan.raw_text || '').slice(0, 1000);
  const planId = `plan-${date}`;
  let target = state.plans.find((item) => item.plan_id === planId);
  if (!target) { target = { plan_id: planId, week_start: date, items: [], adjustments: [] }; state.plans.push(target); }
  if (!Array.isArray(target.items)) target.items = [];
  const duplicate = target.items.find((item) => item.raw_text === rawText && item.activity === plan.activity_name);
  const at = new Date().toISOString();
  let item = duplicate;
  if (!duplicate) {
    item = {
      item_id: `plan-item-dashboard-${Date.now().toString(36)}`,
      date, time, time_label: plan.time_label || null,
      activity: plan.activity_name, distance_km: plan.distance_km ?? null, duration_min: plan.duration_min ?? null,
      status: 'planned', source: 'dashboard_confirmed', raw_text: rawText, created_at: at, cron_job_id: null
    };
    target.items.push(item);
  }
  target.updated_at = at;
  state.events.push({
    event_id: `dashboard-plan-${Date.now().toString(36)}`,
    schedule_id: 'dashboard-input',
    event_type: 'decision_log',
    channel: 'dashboard',
    occurred_at: at,
    metadata: {
      kind: 'plan', status: 'executed', duplicate: Boolean(duplicate), plan_item: item,
      decision_log: { at, decision: 'schedule', inputs: { channel: 'dashboard', text: rawText }, reason: duplicate ? 'duplicate_plan' : (time ? 'user_confirmed_plan' : 'user_confirmed_plan · 시작 시간 미정'), tools: ['classifyInput', 'parseLogFitPlanIntent'], status: 'executed' }
    }
  });
  writeState(state);
  return { saved: !duplicate, duplicate: Boolean(duplicate), item };
}

function startServer(port = Number(process.env.LOGFIT_BRIDGE_PORT || 8787)) {
  const server = http.createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' }); return res.end(); }
    const requestUrl = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && requestUrl.pathname === '/health') return json(res, 200, { ok: true, runtime_dir: runtimeDir });
    if (req.method === 'GET' && requestUrl.pathname === '/api/state') return json(res, 200, readState());
    if (req.method === 'GET' && requestUrl.pathname === '/api/calendar/windows') {
      const date = requestUrl.searchParams.get('date') || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
      return json(res, 200, getCalendarWindows(date, { day_start: '05:30', day_end: '21:30', duration_min: 30, buffer_min: 15, step_min: 15 }));
    }
    if (req.method !== 'POST' || !['/api/schedules', '/api/events', '/api/records', '/api/dashboard-records', '/api/dashboard-plans', '/api/plans', '/api/responses'].includes(req.url)) return json(res, 404, { error: 'not_found' });
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 100000) req.destroy(); });
    req.on('end', () => {
      try {
        const value = JSON.parse(body || '{}');
        const result = req.url === '/api/schedules' ? upsertSchedule(value) : req.url === '/api/events' ? appendEvent(value) : req.url === '/api/plans' ? upsertPlan(value) : req.url === '/api/dashboard-records' ? saveDashboardRecords(value) : req.url === '/api/dashboard-plans' ? saveDashboardPlan(value) : req.url === '/api/responses' ? handleTelegramResponse(value.text || '', readState(), new Date(), { merge_weather: true, pending_id: value.pending_id || null, chat_id: value.chat_id || null }) : upsertCompletion(value);
        if (req.url === '/api/responses' && result && result.state && result.status !== 'no_pending' && result.status !== 'duplicate') writeState(result.state);
        json(res, 200, result);
      } catch (error) { json(res, 400, { error: error.message }); }
    });
  });
  server.listen(port, '127.0.0.1', () => console.log(`LogFit bridge listening on http://127.0.0.1:${port}`));
  return server;
}

if (require.main === module) startServer();

module.exports = { readState, writeState, upsertSchedule, appendEvent, saveDashboardRecords, saveDashboardPlan, upsertPlan, upsertBodyStats, upsertCompletion, startServer, statePath };
