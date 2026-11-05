'use strict';

const { readState } = require('./logfit-bridge');
const { getCalendarWindows } = require('./logfit-calendar');
const { runPlanChain, formatPlanSuggestionMessage } = require('./logfit-plan-chain');
const { classifyInput } = require('./logfit-intent');

function kstDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addKstDay(date) {
  const value = new Date(`${kstDate(date)}T00:00:00+09:00`);
  value.setDate(value.getDate() + 1);
  return kstDate(value);
}

async function fetchTomorrowWeather(date, window) {
  if (process.env.LOGFIT_PLAN_OFFLINE === '1') return null;
  const target = `${date}T${window && window.start || '06:00'}`;
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.5283&longitude=126.9349&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,wind_speed_10m,cloud_cover&timezone=Asia%2FSeoul&forecast_days=3';
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`weather_http_${response.status}`);
  const data = await response.json();
  const index = (data.hourly.time || []).findIndex((value) => String(value).slice(0, 13) === target.slice(0, 13));
  if (index < 0) throw new Error('weather_hour_missing');
  return {
    temperature_c: Number(data.hourly.temperature_2m[index]),
    precipitation_probability: Number(data.hourly.precipitation_probability[index]),
    precipitation_mm: Number(data.hourly.precipitation[index]),
    snowfall_cm: Number(data.hourly.snowfall[index]),
    wind_speed_kmh: Number(data.hourly.wind_speed_10m[index]),
    cloud_cover_percent: Number(data.hourly.cloud_cover[index]),
    forecast_at: `${target}+09:00`,
    source: 'Open-Meteo'
  };
}

async function createPlanProposal(now = new Date()) {
  const date = addKstDay(now);
  const state = readState();
  const result = await runPlanChain({ date, recentRecords: state.records || [] }, {
    getCalendar: async () => getCalendarWindows(date, { day_start: '05:30', day_end: '21:30', duration_min: 30, buffer_min: 15, step_min: 15 }),
    getWeather: fetchTomorrowWeather
  });
  return result;
}

async function main() {
  const input = JSON.parse(process.argv[2] || '{}');
  if (classifyInput(input.text || '').kind !== 'request') return process.stdout.write(JSON.stringify({ kind: 'other', status: 'ignored' }) + '\n');
  const result = await createPlanProposal(input.now ? new Date(input.now) : new Date());
  process.stdout.write(JSON.stringify({ kind: 'request', status: 'awaiting_user_approval', suggestion: result.suggestion, steps: result.steps, message: formatPlanSuggestionMessage(result.suggestion) }, null, 2) + '\n');
}

if (require.main === module) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });

module.exports = { createPlanProposal, fetchTomorrowWeather };
