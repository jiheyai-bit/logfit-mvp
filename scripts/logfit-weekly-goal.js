#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const runtimeDir = process.env.LOGFIT_RUNTIME_DIR || path.join(process.cwd(), '.logfit-runtime');
const statePath = path.join(runtimeDir, 'state.json');
const GOAL = 3;

function addDays(dateString, amount) {
  const value = new Date(`${dateString}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function getRollingWindow(checkDate) {
  return { start: addDays(checkDate, -7), end: addDays(checkDate, -1) };
}

function isAerobicJogging(record) {
  return record && record.completion === 'completed' && record.type !== 'rest' && /(러닝|조깅|유산소|달리)/.test(String(record.activity_name || record.exercise_type || record.item || ''));
}

function countAerobicJogging(records, window) {
  return (Array.isArray(records) ? records : []).filter((record) => isAerobicJogging(record) && record.record_date >= window.start && record.record_date <= window.end).length;
}

function renderWeeklyPush(records, checkDate = new Date().toISOString().slice(0, 10)) {
  const window = getRollingWindow(checkDate);
  const count = countAerobicJogging(records, window);
  if (count >= GOAL) return '';
  const remaining = GOAL - count;
  return [
    `지난 7일 유산소 조깅은 ${count}회예요. 목표 ${GOAL}회까지 ${remaining}회 더 남았어요.`,
    `집계 기간: ${window.start} ~ ${window.end}`,
    '',
    '이번 주 컨디션이 괜찮은 날에 가볍게 조깅을 계획해 보세요.',
    '날씨와 컨디션을 확인한 뒤 무리하지 않는 범위에서 진행하세요.'
  ].join('\n');
}

function readState() {
  try { return JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (_) { return { records: [] }; }
}

function main() {
  const state = readState();
  const message = renderWeeklyPush(state.records || []);
  if (message) process.stdout.write(message + '\n');
}

if (require.main === module) main();

module.exports = { GOAL, getRollingWindow, isAerobicJogging, countAerobicJogging, renderWeeklyPush };
