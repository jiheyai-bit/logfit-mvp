'use strict';

// Running pace (seconds per km) from a message. Only text written as a pace counts,
// so a plain duration like "30분" is never read as 30:00/km.
const PACE_PATTERNS = [
  // 6'30, 6’30", 6′30″ (optionally followed by /km)
  /(\d{1,2})\s*['’′]\s*(\d{1,2})\s*(?:["”″]|'')?/,
  // 6:30/km, 6:30 per km
  /(\d{1,2})\s*:\s*(\d{2})\s*(?:\/\s*km|per\s*km)/i,
  // 평균 6:30, 페이스 6:30, 평균 1km 6:30
  /(?:평균|페이스)\s*(?:페이스\s*)?(?:1\s*km\s*(?:당)?\s*)?(\d{1,2})\s*:\s*(\d{2})/,
  // 평균 1km 6분 30초, 페이스 6분30초, 1km당 6분 30초
  /(?:평균|페이스|1\s*km\s*당|km\s*당)\s*(?:페이스\s*)?(?:1\s*km\s*(?:당)?\s*)?(\d{1,2})\s*분\s*(?:(\d{1,2})\s*초)?/,
  // 6분 30초/km
  /(\d{1,2})\s*분\s*(?:(\d{1,2})\s*초)?\s*\/\s*km/i
];

function parsePaceSecPerKm(text) {
  const source = String(text || '');
  for (const pattern of PACE_PATTERNS) {
    const match = source.match(pattern);
    if (!match) continue;
    const seconds = Number(match[1]) * 60 + Number(match[2] || 0);
    if (Number(match[2] || 0) < 60 && seconds >= 120 && seconds <= 1200) return seconds;
  }
  return null;
}

module.exports = { parsePaceSecPerKm };
