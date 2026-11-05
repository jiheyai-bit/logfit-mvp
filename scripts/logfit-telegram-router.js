'use strict';

const fs = require('fs');
const vm = require('vm');
const { classifyInput, buildRecordConfirmation } = require('./logfit-intent');
const { parseBodyStatsMessage, formatBodyStatsConfirmation } = require('./logfit-body-stats');
const { buildPlanSuggestion, formatPlanSuggestionMessage } = require('./logfit-plan-chain');
const { parsePaceSecPerKm } = require('./logfit-pace');

let parserContext;
function getParserContext() {
  if (parserContext) return parserContext;
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const noopNode = () => ({ addEventListener() {}, classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}, appendChild() {}, click() {} });
  const document = { readyState: 'loading', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return noopNode(); }, createElement() { return noopNode(); }, body: { appendChild() {}, removeChild() {} } };
  parserContext = { console, Date, Intl, Array, Number, String, JSON, Math, Object, RegExp, setTimeout, clearTimeout, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, document, URL, Blob };
  vm.createContext(parserContext);
  vm.runInContext(script, parserContext);
  return parserContext;
}

function enrichTelegramRecords(records, text) {
  const source = String(text || '');
  const distanceMatch = source.match(/(\d+(?:\.\d+)?)\s*km/i);
  const distance = distanceMatch ? Number(distanceMatch[1]) : null;
  const pace = parsePaceSecPerKm(source);
  return records.map((record) => {
    if (record.type !== 'exercise' || !/(러닝|달리기|달렸|조깅|km)/i.test(source)) return record;
    const updated = { ...record, exercise_type: '러닝', activity_name: '러닝' };
    if (distance != null) updated.distance_km = distance;
    if (pace != null) { updated.pace_sec_per_km = pace; updated.duration_min = distance != null ? Math.round(distance * pace / 60 * 10) / 10 : updated.duration_min; }
    return updated;
  });
}

function routeTelegramMessage(text, now = new Date(), planContext = null) {
  const bodyStats = parseBodyStatsMessage(text, now);
  if (bodyStats.kind === 'body_stats') return { kind: 'body_stats', reason: 'body_measurement_language', status: 'awaiting_confirmation', body_stats: bodyStats, message: formatBodyStatsConfirmation(bodyStats) };
  const classification = classifyInput(text);
  if (classification.kind === 'record') {
    const parsed = getParserContext().parseLogFitSentence(text, now);
    const records = enrichTelegramRecords(parsed.records, text);
    return { ...classification, status: 'awaiting_confirmation', records, message: buildRecordConfirmation(records) };
  }
  if (classification.kind === 'schedule') {
    const plan = getParserContext().parseLogFitPlanIntent(text, now);
    return { ...classification, status: plan.status === 'awaiting_time_confirmation' ? plan.status : 'awaiting_user_approval', plan, message: plan.status === 'awaiting_time_confirmation' ? '미래 운동 계획으로 이해했어요. 정확한 시작 시간을 알려주세요.' : '미래 운동 계획으로 이해했어요. 일정 승인 여부를 알려주세요.' };
  }
  if (classification.kind === 'request') {
    if (planContext) {
      const suggestion = buildPlanSuggestion(planContext);
      return { ...classification, status: 'awaiting_user_approval', suggestion, message: formatPlanSuggestionMessage(suggestion) };
    }
    return { ...classification, status: 'awaiting_plan_chain', message: '운동 계획 요청으로 이해했어요. 캘린더·날씨·최근 기록을 확인해 제안할게요.' };
  }
  return { ...classification, status: 'ignored', message: '기록이나 운동 계획 요청으로 이해하기 어려워요. 한 문장으로 다시 알려주세요.' };
}

if (require.main === module) {
  const input = JSON.parse(process.argv[2] || '{}');
  process.stdout.write(JSON.stringify(routeTelegramMessage(input.text || '', input.now ? new Date(input.now) : new Date()), null, 2) + '\n');
}

module.exports = { routeTelegramMessage };
