#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const os = require('os');
const path = require('path');

function gwsBinary() {
  return process.env.LOGFIT_GWS_BIN || (process.env.HOME ? path.join(os.homedir(), '.local', 'bin', 'gws') : 'gws');
}

function toMinutes(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function formatMinutes(value) {
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function normalizeAgenda(data) {
  const source = Array.isArray(data && data.items) ? data.items : Array.isArray(data && data.events) ? data.events : [];
  return source.filter((item) => item.status !== 'cancelled').map((item) => ({
    title: item.summary || '일정',
    start: typeof item.start === 'string' ? item.start : item.start && (item.start.dateTime || item.start.date) || null,
    end: typeof item.end === 'string' ? item.end : item.end && (item.end.dateTime || item.end.date) || null,
    all_day: Boolean(item.start && typeof item.start === 'object' && item.start.date)
  })).filter((item) => item.start && item.end);
}

function findExerciseWindows(events, date, preferences = {}) {
  const dayStart = toMinutes(preferences.day_start || '05:30');
  const dayEnd = toMinutes(preferences.day_end || '21:30');
  const duration = Number(preferences.duration_min || 30);
  const buffer = Number(preferences.buffer_min || 15);
  const step = Number(preferences.step_min || 15);
  const blocked = (Array.isArray(events) ? events : []).map((event) => {
    if (event.all_day || String(event.start).slice(0, 10) < date && String(event.end).slice(0, 10) > date) return { start: dayStart, end: dayEnd };
    if (String(event.start).slice(0, 10) !== date) return null;
    const startTime = String(event.start).slice(11, 16);
    const endTime = String(event.end).slice(11, 16);
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    return start === null || end === null ? null : { start: Math.max(dayStart, start - buffer), end: Math.min(dayEnd, end + buffer) };
  }).filter(Boolean);
  const windows = [];
  for (let start = dayStart; start + duration <= dayEnd; start += step) {
    const end = start + duration;
    if (!blocked.some((item) => start < item.end && end > item.start)) windows.push({ start: formatMinutes(start), end: formatMinutes(end) });
  }
  return windows;
}

function fetchAgenda(days = 1) {
  const binary = gwsBinary();
  const binDir = path.dirname(binary);
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH || ''}` };
  const output = execFileSync(binary, ['calendar', '+agenda', '--days', String(days), '--timezone', 'Asia/Seoul', '--format', 'json'], { encoding: 'utf8', timeout: 20000, env });
  return JSON.parse(output);
}

function getCalendarWindows(date, preferences = {}) {
  try {
    const agenda = normalizeAgenda(fetchAgenda(1));
    return { connected: true, source: 'Google Calendar', date, events_considered: agenda.length, windows: findExerciseWindows(agenda, date, preferences) };
  } catch (error) {
    return { connected: false, source: 'fallback', date, events_considered: 0, windows: findExerciseWindows([], date, preferences), error: 'calendar_unavailable' };
  }
}

module.exports = { normalizeAgenda, findExerciseWindows, getCalendarWindows };
