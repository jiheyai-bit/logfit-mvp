const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fixtures = JSON.parse(fs.readFileSync('tests/fixtures/task3-fixtures.json', 'utf8'));
const storage = new Map();
const context = {
  console, Date, Intl, Array, Number, String, JSON, Math, Object, RegExp,
  setTimeout, clearTimeout,
  localStorage: {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  },
  document: { readyState: 'loading', addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, getElementById() { return null; }, createElement() { return { click() {}, setAttribute() {} }; }, body: { appendChild() {}, removeChild() {} } },
  URL, Blob
};
vm.createContext(context);
vm.runInContext(script, context);

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); process.exitCode = 1; }
}

const now = new Date(fixtures.referenceNow);

test('parses the core complex sentence into independent records', () => {
  const result = context.parseLogFitSentence(fixtures.complexSentence, now);
  assert.strictEqual(result.records.length, 3);
  assert.strictEqual(JSON.stringify(result.records.map((record) => record.type)), JSON.stringify(['meal', 'meal', 'exercise']));
  assert.strictEqual(JSON.stringify(result.records.map((record) => record.meal_period)), JSON.stringify(['아침', '점심', '']));
  assert.strictEqual(result.records[0].duration_min, null);
  assert.strictEqual(result.records[1].duration_min, null);
  assert.strictEqual(result.records[2].duration_min, 40);
  assert.ok(new Set(result.records.map((record) => record.id)).size === 3);
  result.records.forEach((record) => assert.strictEqual(record.raw_text, fixtures.complexSentence));
});

test('splits date-prefixed meal clauses joined by 먹고', () => {
  const input = '오늘 점심은 김치찌개를 먹고 저녁에 요가 40분 했어.';
  const result = context.parseLogFitSentence(input, now);
  assert.strictEqual(result.records.length, 2);
  assert.strictEqual(JSON.stringify(result.records.map((record) => record.type)), JSON.stringify(['meal', 'exercise']));
  assert.strictEqual(result.records[0].meal_period, '점심');
  assert.match(result.records[0].item, /김치찌개/);
  assert.strictEqual(result.records[1].exercise_type, '요가');
  assert.strictEqual(result.records[1].duration_min, 40);
  result.records.forEach((record) => assert.strictEqual(record.raw_text, input));
});

test('uses generic 운동 for detection without naming an exercise type', () => {
  const record = context.parseLogFitSentence('오늘 운동했어', now).records[0];
  assert.strictEqual(record.type, 'exercise');
  assert.strictEqual(record.exercise_type, null);
  assert.strictEqual(record.completion, 'completed');
});

test('resolves KST explicit, relative, and unclear dates without guessing', () => {
  const relative = context.parseLogFitSentence(fixtures.dateCases[0].input, now).records[0];
  assert.strictEqual(relative.record_date, fixtures.dateCases[0].expectedDate);
  const explicit = context.parseLogFitSentence(fixtures.dateCases[1].input, now).records[0];
  assert.strictEqual(explicit.record_date, fixtures.dateCases[1].expectedDate);
  const unclear = context.parseLogFitSentence(fixtures.dateCases[2].input, now).records[0];
  assert.strictEqual(unclear.completion, fixtures.dateCases[2].expectedCertainty);
  assert.strictEqual(unclear.record_date, null);
});

test('resolves month-day dates and compound durations for separate exercises', () => {
  const input = '10월 21일 PT근력운동 1시간, 조깅 30분 했어';
  const records = context.parseLogFitSentence(input, new Date('2026-10-27T03:00:00.000Z')).records;
  assert.strictEqual(records.length, 2);
  records.forEach((record) => assert.strictEqual(record.record_date, '2026-10-21'));
  assert.strictEqual(JSON.stringify(Array.from(records.map((record) => record.duration_min))), JSON.stringify([60, 30]));
});

test('converts an hour and minute duration into total minutes', () => {
  const input = '10월 21일 PT근력운동 1시간 30분, 조깅 30분 했어';
  const records = context.parseLogFitSentence(input, new Date('2026-10-27T03:00:00.000Z')).records;
  assert.strictEqual(records.length, 2);
  assert.strictEqual(JSON.stringify(Array.from(records.map((record) => record.duration_min))), JSON.stringify([90, 30]));
});

test('keeps exercise, rest, no-record, planned, and uncertain states distinct', () => {
  const statusFor = (input) => {
    const records = context.parseLogFitSentence(input, now).records;
    const date = records[0] && records[0].record_date ? records[0].record_date : fixtures.referenceDate;
    return context.renderLogFitDashboard(records, date).today.status;
  };
  assert.strictEqual(statusFor(fixtures.stateCases[0].input), '휴식');
  assert.strictEqual(statusFor(fixtures.stateCases[1].input), '운동 예정');
  assert.strictEqual(statusFor(fixtures.stateCases[2].input), '미기록');
  assert.strictEqual(statusFor(fixtures.stateCases[3].input), '확인 필요');
  const completed = context.parseLogFitSentence(fixtures.stateCases[4].input, now).records;
  assert.strictEqual(statusFor(fixtures.stateCases[4].input), '운동 완료');
  assert.strictEqual(context.summarizeLogFitDay(completed, fixtures.referenceDate).exerciseCount, 1);
  assert.strictEqual(context.summarizeLogFitDay(completed, fixtures.referenceDate).exerciseMinutes, 0);
});

test('preserves same-day rest alongside completed exercise in summary and detail records', () => {
  const fixture = fixtures.stateCases[5];
  const records = context.parseLogFitSentence(fixture.input, now).records;
  const summary = context.summarizeLogFitDay(records, fixtures.referenceDate);
  const model = context.renderLogFitDashboard(records, fixtures.referenceDate);
  assert.strictEqual(summary.status, fixture.expectedStatus);
  assert.strictEqual(summary.exerciseCount, fixture.expectedExerciseCount);
  assert.strictEqual(summary.exerciseMinutes, fixture.expectedExerciseMinutes);
  assert.strictEqual(model.records.filter((record) => record.type === 'rest').length, fixture.expectedRestCount);
  assert.strictEqual(model.records.some((record) => record.type === 'rest' && record.item.includes('휴식')), true);
});

test('aggregates a seven-day window by record date and excludes planned time', () => {
  const week = context.summarizeLogFitWeek(fixtures.weeklyRecords, '2026-10-19');
  assert.strictEqual(week.days.length, 7);
  assert.strictEqual(week.exerciseCount, 3);
  assert.strictEqual(week.exerciseMinutes, 70);
  assert.strictEqual(week.mealCount, 1);
  assert.strictEqual(week.missingExerciseTimeCount, 1);
  assert.strictEqual(week.missingDayCount, 2);
});

test('persists confirmed records and reloads the same records from localStorage', () => {
  storage.clear();
  const records = context.parseLogFitSentence(fixtures.complexSentence, now).records;
  const saved = context.saveConfirmedLogFitRecords(records, now);
  const serialized = storage.get('logfit.records.v1');
  assert.strictEqual(JSON.parse(serialized).length, 3);
  assert.strictEqual(JSON.stringify(context.loadLogFitRecords()), JSON.stringify(saved));
});

test('does not treat clock minutes as exercise duration', () => {
  const records = context.parseLogFitSentence('11월 4일 오후 8시 30분 하체 근력운동 1시간 진행', now).records;
  assert.strictEqual(records.length, 1);
  assert.strictEqual(records[0].duration_min, 60);
});

console.log('Task 3 synthetic checks complete');
