'use strict';

const { parsePaceSecPerKm } = require('./logfit-pace');

function parseCompletionMessage(text) {
  const rawText = String(text || '').trim();
  const completed = /(완료|했어|했어요|달렸어|뛰었어|다녀왔어)/.test(rawText);
  const distanceMatch = rawText.match(/(\d+(?:\.\d+)?)\s*km/i);
  const distanceKm = distanceMatch ? Number(distanceMatch[1]) : null;
  const paceSecPerKm = parsePaceSecPerKm(rawText);
  const durationMin = distanceKm !== null && paceSecPerKm !== null ? distanceKm * paceSecPerKm / 60 : null;
  const running = /(러닝|달리|조깅|뛰|km|유산소)/i.test(rawText);
  if (!completed || !running || distanceKm === null || paceSecPerKm === null) {
    return { completed: false, raw_text: rawText, distance_km: distanceKm, pace_sec_per_km: paceSecPerKm, duration_min: durationMin, activity_name: null };
  }
  return {
    completed: true,
    raw_text: rawText,
    distance_km: distanceKm,
    pace_sec_per_km: paceSecPerKm,
    duration_min: durationMin,
    activity_name: rawText.includes('공복') ? `한강 ${distanceKm}km 공복 유산소` : `러닝 ${distanceKm}km`
  };
}

if (require.main === module) {
  const input = JSON.parse(process.argv[2] || '{}');
  const parsed = parseCompletionMessage(input.text || '');
  if (!parsed.completed) {
    process.stdout.write(JSON.stringify({ matched: false, parsed }) + '\n');
  } else {
    const { upsertCompletion } = require('./logfit-bridge');
    const result = upsertCompletion({ ...parsed, record_date: input.record_date, schedule_id: input.schedule_id });
    process.stdout.write(JSON.stringify({ matched: true, created: result.created, record_id: result.record.record_id, record: result.record }) + '\n');
  }
}

module.exports = { parseCompletionMessage };
