#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { appendEvent } = require('./logfit-bridge');

const ROUTINE_ID = 'routine-hangang-5km-weather';
const runtimeDir = process.env.LOGFIT_RUNTIME_DIR || path.join(process.cwd(), '.logfit-runtime');
const statePath = path.join(runtimeDir, 'state.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (_) { return { events: [] }; }
}

function localDate(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function shouldSendFollowup(state, now, reminderNumber) {
  const events = Array.isArray(state && state.events) ? state.events : [];
  const date = localDate(now);
  const alert = events.filter((event) => event.event_type === 'weather_alert_sent' && event.schedule_id === ROUTINE_ID && localDate(event.occurred_at) === date).sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at)).at(-1);
  if (!alert || new Date(alert.occurred_at) > new Date(now)) return false;
  const afterAlert = events.filter((event) => new Date(event.occurred_at) > new Date(alert.occurred_at));
  if (afterAlert.some((event) => event.event_type === 'telegram_message')) return false;
  return !afterAlert.some((event) => event.event_type === 'weather_followup_sent' && Number(event.metadata && event.metadata.reminder_number) === Number(reminderNumber));
}

function renderFollowup(reminderNumber) {
  const time = Number(reminderNumber) === 2 ? '05:50' : '05:40';
  return [`아직 오늘 운동 알림에 응답이 없어요. (${time})`, '컨디션이 괜찮다면 한강 5km 러닝 또는 실내 운동을 계획해 보세요.', '무리하지 말고 수분을 챙겨 주세요.'].join('\n');
}

function main() {
  const reminderNumber = Number(process.env.LOGFIT_FOLLOWUP_NUMBER || 1);
  const now = new Date();
  const state = readState();
  if (!shouldSendFollowup(state, now, reminderNumber)) return;
  appendEvent({ schedule_id: ROUTINE_ID, event_type: 'weather_followup_sent', occurred_at: now.toISOString(), metadata: { reminder_number: reminderNumber } });
  process.stdout.write(renderFollowup(reminderNumber) + '\n');
}

if (require.main === module) main();

module.exports = { ROUTINE_ID, shouldSendFollowup, renderFollowup };
