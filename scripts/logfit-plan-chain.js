'use strict';

const ACTIVITIES = [
  { activity: '러닝', body_part: null, indoor: false, emoji: '🏃‍♀️' },
  { activity: '요가', body_part: null, indoor: true, emoji: '🧘‍♀️' },
  { activity: '근력운동', body_part: '상체', indoor: true, emoji: '💪' }
];

function asDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatEvidence(forecast, window, calendarConnected = true) {
  const weather = forecast && Number.isFinite(Number(forecast.temperature_c)) && Number.isFinite(Number(forecast.precipitation_probability)) && Number.isFinite(Number(forecast.wind_speed_kmh))
    ? `${forecast.forecast_at ? String(forecast.forecast_at).slice(11, 16) : window.start} 기온 ${forecast.temperature_c}℃ · 강수 ${forecast.precipitation_probability}% · 바람 ${forecast.wind_speed_kmh}km/h`
    : '날씨 정보 없음';
  const calendar = !calendarConnected ? '캘린더 확인 실패 · 기본 슬롯' : window ? `${window.start}~${window.end} 비어 있음` : '기본 슬롯';
  return `${calendar} · ${weather}`;
}

function hasSafetyConcern(inputText) {
  return /(통증|아파|부상|다쳤|다침|심한\s*피로|너무\s*피곤|몸살|어지러|어지럽)/i.test(String(inputText || ''));
}

function recentActivityCounts(records) {
  const counts = { 러닝: 0, 요가: 0, 근력운동: 0 };
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (record.completion && record.completion !== 'completed') return;
    const value = String(record.exercise_type || record.activity_name || '');
    if (/요가|yoga|필라테스|pilates/i.test(value)) counts.요가 += 1;
    else if (/러닝|조깅|달리|유산소|running|jogging|\brun\b/i.test(value)) counts.러닝 += 1;
    else if (/근력|웨이트|strength|weight/i.test(value)) counts.근력운동 += 1;
  });
  return counts;
}

function avoidRecentStrengthPart(bodyPart, records, at) {
  if (!bodyPart) return false;
  const target = asDate(at);
  if (!target) return false;
  return (Array.isArray(records) ? records : []).some((record) => {
    if (!/근력/.test(String(record.exercise_type || record.activity_name || ''))) return false;
    if (String(record.body_part || '').trim() !== bodyPart) return false;
    const recorded = asDate(record.created_at || `${record.record_date}T00:00:00+09:00`);
    return recorded && target - recorded >= 0 && target - recorded < 48 * 60 * 60 * 1000;
  });
}

function buildPlanSuggestion(context = {}) {
  const date = context.date || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const calendar = context.calendar;
  const forecast = context.forecast;
  const windows = calendar && Array.isArray(calendar.windows) && calendar.windows.length ? calendar.windows : [{ start: '06:00', end: '06:30' }, { start: '07:30', end: '08:00' }];
  const selectedWindows = windows.slice().sort((a, b) => (a.start === '06:00' ? -1 : b.start === '06:00' ? 1 : a.start.localeCompare(b.start)));
  const recentRecords = Array.isArray(context.recentRecords) ? context.recentRecords : [];
  const counts = recentActivityCounts(recentRecords);
  const safetyConcern = hasSafetyConcern(context.inputText || context.user_input);
  if (safetyConcern) {
    return {
      kind: 'plan',
      status: 'needs_user_check',
      personalization: 'blocked_for_safety',
      created_at: new Date().toISOString(),
      reason: '통증·부상·심한 피로가 언급되어 고강도 운동 추천을 보류합니다. 의학적 판단이 아니므로 상태를 먼저 확인해 주세요.',
      options: [], response: 'none', responded_at: null, response_sec: null, executed_action: null
    };
  }
  const preferred = ACTIVITIES.slice().sort((a, b) => counts[a.activity] - counts[b.activity])[0];
  const weatherAvailable = forecast && Number.isFinite(Number(forecast.temperature_c)) && Number.isFinite(Number(forecast.precipitation_probability)) && Number.isFinite(Number(forecast.wind_speed_kmh));
  const weatherBad = weatherAvailable && (forecast.temperature_c < 5 || forecast.temperature_c > 25 || forecast.precipitation_probability > 30 || forecast.wind_speed_kmh > 25 || forecast.precipitation_mm > 0 || forecast.snowfall_cm > 0);
  const primary = weatherBad && preferred.activity === '러닝' ? { activity: '요가', body_part: null, indoor: true, emoji: '🧘‍♀️' } : preferred;
  const primaryWindow = selectedWindows[0];
  const alternative = primary.activity === '러닝' ? { activity: '요가', body_part: null, indoor: true, emoji: '🧘‍♀️' } : { activity: '러닝', body_part: null, indoor: false, emoji: '🏃‍♀️' };
  const options = [primary, alternative].map((item, index) => ({
    label: index === 0 ? '1안' : '대안',
    date,
    time: selectedWindows[index] ? selectedWindows[index].start : primaryWindow.start,
    activity: item.activity,
    body_part: item.body_part,
    duration_min: 30,
    indoor: item.indoor
  }));
  const reasonParts = [formatEvidence(forecast, primaryWindow, Boolean(calendar && calendar.connected !== false)), `최근 7일 횟수 · 러닝 ${counts.러닝}회 · 요가 ${counts.요가}회 · 근력운동 ${counts.근력운동}회`];
  if (!calendar || !calendar.connected) reasonParts.push('캘린더를 확인하지 못해 기본 슬롯을 사용');
  if (!weatherAvailable) reasonParts.push('날씨 정보 없음으로 야외 계획을 유지');
  if (recentRecords.length < 3) reasonParts.push('최근 운동 기록 부족으로 개인화 추천에 한계');
  if (primary.activity === '근력운동' && avoidRecentStrengthPart(primary.body_part, recentRecords, `${date}T${primaryWindow.start}:00+09:00`)) reasonParts.push('최근 48시간 같은 부위 회피');
  return {
    kind: 'plan',
    status: 'awaiting_user_approval',
    personalization: recentRecords.length < 3 ? 'limited_data' : 'based_on_recent_records',
    created_at: new Date().toISOString(),
    reason: reasonParts.join(' · '),
    options,
    response: 'none',
    responded_at: null,
    response_sec: null,
    executed_action: null
  };
}

function mergeNotification(plan, weatherNotification) {
  const planned = asDate(plan && plan.planned_start_at);
  const weatherAt = asDate(weatherNotification && (weatherNotification.at || weatherNotification.planned_start_at));
  if (planned && weatherAt && planned.getTime() === weatherAt.getTime()) {
    return { merged: true, cron_job_id: weatherNotification.cron_job_id || null, reason: `계획 알림 ${planned.toISOString().slice(11, 16)}를 05:30 날씨 알림에 합침` };
  }
  return { merged: false, cron_job_id: plan && plan.cron_job_id || null, reason: '기존 날씨 알림과 시간이 달라 별도 알림' };
}

function approveSuggestion(suggestion, optionIndex, ids = {}) {
  const option = suggestion && suggestion.options && suggestion.options[optionIndex];
  if (!option) throw new Error('suggestion option is required');
  const item = { ...option, item_id: ids.plan_item_id || `plan-item-${Date.now().toString(36)}`, status: 'planned' };
  const updated = { ...suggestion, response: 'accepted', responded_at: ids.responded_at || new Date().toISOString(), response_sec: ids.response_sec ?? null, executed_action: { plan_item_id: item.item_id, cron_job_id: ids.cron_job_id || null } };
  return { suggestion: updated, plan_item: item };
}

function expireUnansweredSuggestions(events, now = new Date()) {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  return (Array.isArray(events) ? events : []).map((event) => {
    const suggestion = event && event.suggestion;
    if (!suggestion || suggestion.response !== 'none') return event;
    const created = asDate(suggestion.created_at);
    if (created && created.getTime() <= cutoff) return { ...event, suggestion: { ...suggestion, response: 'none', responded_at: now.toISOString() } };
    return event;
  });
}

async function runPlanChain(input = {}, dependencies = {}) {
  const date = input.date;
  let calendar = null;
  let forecast = null;
  let calendarError = null;
  let weatherError = null;
  try { calendar = await (dependencies.getCalendar ? dependencies.getCalendar(date) : null); } catch (error) { calendarError = error; }
  try { forecast = await (dependencies.getWeather ? dependencies.getWeather(date, calendar && calendar.windows && calendar.windows[0]) : null); } catch (error) { weatherError = error; }
  const suggestion = buildPlanSuggestion({ date, calendar, forecast, recentRecords: input.recentRecords || [] });
  return { suggestion, steps: [
    { step: 'calendar', status: calendar && calendar.connected !== false ? 'executed' : 'fallback', error: calendarError && calendarError.message },
    { step: 'weather', status: forecast ? 'executed' : 'fallback', error: weatherError && weatherError.message },
    { step: 'recent_records', status: 'executed', count: Array.isArray(input.recentRecords) ? input.recentRecords.length : 0 },
    { step: 'suggestion', status: 'proposed' }
  ] };
}

function formatPlanSuggestionMessage(suggestion) {
  const emoji = (activity) => activity === '러닝' ? '🏃‍♀️' : activity === '요가' ? '🧘‍♀️' : activity === '근력운동' ? '💪' : '🏃‍♀️';
  const options = (suggestion.options || []).map((option) => `${option.label} · ${emoji(option.activity)} ${option.time} ${option.activity} ${option.duration_min}분${option.indoor ? ' · 실내' : ''}`).join('\n');
  return ['내일 운동 계획을 제안해요.', '', options, '', `근거: ${suggestion.reason}`, '', '어떻게 할까요?', '[1안 승인] [대안 선택] [거절]'].join('\n');
}

module.exports = { buildPlanSuggestion, runPlanChain, formatEvidence, formatPlanSuggestionMessage, avoidRecentStrengthPart, mergeNotification, recentActivityCounts, approveSuggestion, expireUnansweredSuggestions, hasSafetyConcern };
