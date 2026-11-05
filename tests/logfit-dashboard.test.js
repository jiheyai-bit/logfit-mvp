const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /한 문장으로 기록하거나 요청/);
assert.match(html, /data-logfit="decision-log"/);
assert.match(html, /오늘의 판단 로그/);
assert.match(html, /data-logfit="next-suggestion"/);
assert.match(html, /다음 제안/);
assert.match(html, /data-logfit="suggestion-stats"/);
assert.match(html, /data-logfit="memory-rules"/);
assert.match(html, /data-logfit="body-stats"/);
assert.match(html, /LogFit 데이터 연결 확인 중/);
assert.match(html, /도구 결과/);
assert.match(html, /미수행/);
assert.match(html, /데이터 출처/);

console.log('PASS coach-agent dashboard structure');
