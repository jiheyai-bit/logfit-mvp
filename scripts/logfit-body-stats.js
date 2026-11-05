'use strict';

function kstDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function resolveDate(text, now) {
  const match = String(text || '').match(/(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일|(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (!match) return kstDate(now);
  const year = match[1] || new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now);
  const month = match[2] || match[4];
  const day = match[3] || match[5];
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseBodyStatsMessage(text, now = new Date()) {
  const source = String(text || '').trim();
  const values = {
    weight_kg: (source.match(/(?:체중|몸무게)\s*([0-9]+(?:\.[0-9]+)?)\s*kg/i) || [])[1],
    body_fat_pct: (source.match(/(?:체지방률|체지방)\s*([0-9]+(?:\.[0-9]+)?)\s*%/) || [])[1],
    muscle_kg: (source.match(/(?:근육량|골격근량)\s*([0-9]+(?:\.[0-9]+)?)\s*kg/i) || [])[1]
  };
  Object.keys(values).forEach((key) => { values[key] = values[key] == null ? null : Number(values[key]); });
  if (values.weight_kg == null && values.body_fat_pct == null && values.muscle_kg == null) return { kind: 'other', raw_text: source };
  return { kind: 'body_stats', raw_text: source, record_date: resolveDate(source, now), values };
}

function formatBodyStatsConfirmation(parsed) {
  const v = parsed.values || {};
  const parts = [];
  if (v.weight_kg != null) parts.push(`체중 ${v.weight_kg}kg`);
  if (v.body_fat_pct != null) parts.push(`체지방률 ${v.body_fat_pct}%`);
  if (v.muscle_kg != null) parts.push(`근육량 ${v.muscle_kg}kg`);
  return [`신체 기록으로 이해했어요.`, `날짜: ${parsed.record_date}`, parts.join(' · '), '', '이대로 저장할까요?', '[저장] [수정] [취소]'].join('\n');
}

module.exports = { parseBodyStatsMessage, formatBodyStatsConfirmation };
