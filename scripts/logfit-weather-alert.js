#!/usr/bin/env node
'use strict';

const { appendEvent, readState, writeState } = require('./logfit-bridge');

const LATITUDE = Number(process.env.LOGFIT_LATITUDE || 37.5283);
const LONGITUDE = Number(process.env.LOGFIT_LONGITUDE || 126.9349);
const LOCATION = process.env.LOGFIT_LOCATION || '한강 여의도 인근';
const MIN_TEMPERATURE_C = Number(process.env.LOGFIT_MIN_TEMPERATURE_C || 0);
const MAX_TEMPERATURE_C = Number(process.env.LOGFIT_MAX_TEMPERATURE_C || 25);
const MAX_PRECIPITATION_PROBABILITY = Number(process.env.LOGFIT_MAX_PRECIPITATION_PROBABILITY || 30);
const MAX_WIND_SPEED_KMH = Number(process.env.LOGFIT_MAX_WIND_SPEED_KMH || 25);
const CLOUDY_THRESHOLD_PERCENT = Number(process.env.LOGFIT_CLOUDY_THRESHOLD_PERCENT || 70);
const ROUTINE_ID = 'routine-hangang-5km-weather';

function evaluateForecast(forecast) {
  const reasons = [];
  if (!Number.isFinite(forecast.temperature_c) || forecast.temperature_c < MIN_TEMPERATURE_C || forecast.temperature_c > MAX_TEMPERATURE_C) reasons.push('temperature_outside_range');
  if (!Number.isFinite(forecast.precipitation_probability) || forecast.precipitation_probability > MAX_PRECIPITATION_PROBABILITY) reasons.push('rain_probability_high');
  if (Number(forecast.precipitation_mm) > 0 || Number(forecast.snowfall_cm) > 0) reasons.push('precipitation_present');
  if (!Number.isFinite(forecast.wind_speed_kmh) || forecast.wind_speed_kmh > MAX_WIND_SPEED_KMH) reasons.push('wind_too_strong');
  return { suitable: reasons.length === 0, reasons };
}

function renderAlertWithPlans(forecast, plans = []) {
  const base = renderAlert(forecast);
  const plan = plans.find((item) => item.date === String(forecast.forecast_at || '').slice(0, 10) && item.time === '06:00');
  if (!plan || !base) return base;
  const activity = plan.activity === '러닝' ? '🏃‍♀️ 한강 5km 러닝' : plan.activity === '요가' ? '🧘‍♀️ 요가' : `💪 ${plan.activity}`;
  return [`${activity} 계획이 있어요.`, `오늘 ${plan.time} ${activity} ${plan.duration_min}분`, `05:30 기온 ${forecast.temperature_c}℃ · 강수 ${forecast.precipitation_probability}% · 바람 ${forecast.wind_speed_kmh}km/h`, '', base].join('\n');
}

function shouldSendWeatherAlert(state, forecast) {
  const forecastAt = forecast && forecast.forecast_at;
  if (!forecastAt) return true;
  return !((state && Array.isArray(state.events) ? state.events : []).some((event) => {
    return event.event_type === 'weather_alert_sent' && event.schedule_id === ROUTINE_ID && event.metadata && event.metadata.forecast && event.metadata.forecast.forecast_at === forecastAt;
  }));
}

// Dashboard decision log entry for each weather check, sent or held.
function weatherDecisionEvent(forecast, sent, now = new Date()) {
  const decision = evaluateForecast(forecast);
  const summary = `기온 ${forecast.temperature_c}℃ · 강수확률 ${forecast.precipitation_probability}% · 바람 ${forecast.wind_speed_kmh}km/h · 구름량 ${forecast.cloud_cover_percent}%`;
  return {
    event_id: `weather-decision-${forecast.forecast_at}`,
    schedule_id: ROUTINE_ID,
    event_type: 'decision_log',
    occurred_at: now.toISOString(),
    metadata: {
      kind: 'weather_alert',
      status: sent ? 'executed' : 'skipped',
      message: sent ? '05:30 날씨 알림을 Telegram으로 보냈어요.' : '날씨 조건이 맞지 않아 알림을 보내지 않았어요.',
      decision_log: {
        at: now.toISOString(),
        decision: 'weather_alert',
        inputs: { text: `${forecast.location || LOCATION} ${String(forecast.forecast_at || '').slice(11, 16)} 예보` },
        reason: decision.suitable ? `${summary} → 러닝 조건 충족` : `${summary} → ${decision.reasons.join(', ')}`,
        tools: ['open_meteo_forecast', 'evaluateForecast', sent ? 'telegram_cron_delivery' : 'skip_delivery'],
        status: sent ? 'executed' : 'skipped'
      }
    }
  };
}

function mergeApprovedPlansIntoState(state, forecast, cronJobId = process.env.LOGFIT_WEATHER_CRON_JOB_ID || '360294886eb8') {
  const date = String(forecast.forecast_at || '').slice(0, 10);
  const plans = Array.isArray(state.plans) ? state.plans : [];
  const merged = [];
  plans.forEach((plan) => (plan.items || []).forEach((item) => {
    if (item.date !== date || item.time !== '06:00' || item.cron_job_id) return;
    item.reminder_at = `${date}T05:30:00+09:00`;
    item.cron_job_id = cronJobId;
    merged.push(item);
  }));
  if (merged.length) {
    state.events = Array.isArray(state.events) ? state.events : [];
    state.events.push({ event_id: `event-${Date.now().toString(36)}`, schedule_id: 'routine-hangang-5km-weather', event_type: 'decision_log', occurred_at: new Date().toISOString(), metadata: { decision_log: { at: new Date().toISOString(), decision: 'notification_merge', inputs: { plan_items: merged.map((item) => item.item_id), weather_cron_job_id: cronJobId }, reason: '06:00 운동의 30분 전 알림이 기존 05:30 날씨 알림과 같은 시각이므로 한 메시지로 합침', tools: ['weather_alert', 'plan_lookup'], status: 'executed' } } });
  }
  return merged;
}

function renderAlert(forecast) {
  const decision = evaluateForecast(forecast);
  if (!decision.suitable) return '';
  const time = String(forecast.forecast_at || '').slice(11, 16) || '05:30';
  if (Number(forecast.cloud_cover_percent) >= CLOUDY_THRESHOLD_PERCENT) {
    return [
      '오늘은 흐린 날씨예요. 야외 러닝 대신 실내 운동을 제안해요.',
      `시간 ${time} · ${forecast.location || LOCATION}`,
      `기온 ${forecast.temperature_c}℃ · 강수확률 ${forecast.precipitation_probability}% · 구름량 ${forecast.cloud_cover_percent}%`,
      '',
      '컨디션이 괜찮다면 실내 근력운동이나 요가를 해보세요.',
      '한강 5km 러닝은 날씨가 더 좋아지는 날로 미뤄도 괜찮아요.'
    ].join('\n');
  }
  return [
    '오늘 한강 5km 러닝 조건이 좋아요.',
    `시간 ${time} · ${forecast.location || LOCATION}`,
    `기온 ${forecast.temperature_c}℃ · 강수확률 ${forecast.precipitation_probability}% · 바람 ${forecast.wind_speed_kmh}km/h`,
    '',
    '컨디션이 괜찮고 수분을 챙길 수 있다면,',
    '한강 5km 공복 유산소를 해보세요.'
  ].join('\n');
}

function kstHourKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:00`;
}

async function fetchForecast(fetchImpl = globalThis.fetch, now = new Date()) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,wind_speed_10m,cloud_cover&timezone=Asia%2FSeoul&forecast_days=2`;
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`weather_http_${response.status}`);
  const data = await response.json();
  const hourly = data && data.hourly ? data.hourly : {};
  const targetHour = (process.env.LOGFIT_TARGET_AT ? process.env.LOGFIT_TARGET_AT : kstHourKey(now)).slice(0, 13);
  const index = Array.isArray(hourly.time) ? hourly.time.findIndex((value) => String(value).slice(0, 13) === targetHour) : -1;
  if (index < 0) throw new Error('weather_hour_missing');
  return {
    temperature_c: Number(hourly.temperature_2m[index]),
    precipitation_probability: Number(hourly.precipitation_probability[index]),
    precipitation_mm: Number(hourly.precipitation[index]),
    snowfall_cm: Number(hourly.snowfall[index]),
    wind_speed_kmh: Number(hourly.wind_speed_10m[index]),
    cloud_cover_percent: Number(hourly.cloud_cover[index]),
    location: LOCATION,
    forecast_at: `${targetHour}:30+09:00`,
    source: 'Open-Meteo',
    fetched_at: new Date().toISOString()
  };
}

async function main() {
  try {
    const forecast = await fetchForecast();
    const state = readState();
    if (!shouldSendWeatherAlert(state, forecast)) return;
    const planItems = (state.plans || []).flatMap((plan) => plan.items || []).filter((item) => item.date === String(forecast.forecast_at || '').slice(0, 10) && item.status === 'planned');
    const merged = mergeApprovedPlansIntoState(state, forecast);
    const message = renderAlertWithPlans(forecast, planItems);
    if (message) {
      writeState(state);
      appendEvent({ schedule_id: ROUTINE_ID, event_type: 'weather_alert_sent', occurred_at: new Date().toISOString(), metadata: { forecast, merged_plan_item_ids: merged.map((item) => item.item_id) } });
    }
    appendEvent(weatherDecisionEvent(forecast, Boolean(message)));
    if (message) process.stdout.write(message + '\n');
  } catch (error) {
    process.stderr.write(`[LogFit weather alert skipped] ${error.message}\n`);
  }
}

if (require.main === module) main();

module.exports = { evaluateForecast, renderAlert, renderAlertWithPlans, shouldSendWeatherAlert, weatherDecisionEvent, mergeApprovedPlansIntoState, fetchForecast, kstHourKey };
