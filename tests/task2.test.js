const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const storage = new Map();
const context = {
  console,
  Date,
  Intl,
  Array,
  Number,
  String,
  JSON,
  Math,
  setTimeout,
  clearTimeout,
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

const today = '2026-10-23';
const records = [
  { type: 'meal', item: '김치찌개', meal_period: '점심', raw_text: '점심 김치찌개', record_date: today, completion: 'completed' },
  { type: 'exercise', exercise_type: '요가', duration_min: 40, raw_text: '요가 40분', record_date: today, completion: 'completed' },
  { type: 'rest', item: '휴식', raw_text: '휴식', record_date: today, completion: 'completed' }
];

test('exports the Task 2 dashboard and persistence interfaces', () => {
  ['renderLogFitDashboard', 'renderReviewRecords', 'saveConfirmedLogFitRecords', 'loadLogFitRecords', 'exportLogFitCsv'].forEach((name) => assert.strictEqual(typeof context[name], 'function', name));
});

test('persists only confirmed normalized records and reloads them', () => {
  const saved = context.saveConfirmedLogFitRecords(records, new Date('2026-10-23T03:00:00Z'));
  assert.strictEqual(saved.length, 3);
  assert.strictEqual(JSON.parse(storage.get('logfit.records.v1')).length, 3);
  assert.strictEqual(JSON.stringify(context.loadLogFitRecords()), JSON.stringify(saved));
});

test('builds editable review records without saving drafts', () => {
  storage.clear();
  const review = context.renderReviewRecords(context.parseLogFitSentence('점심 김치찌개, 저녁 요가 40분', new Date('2026-10-23T03:00:00Z')).records);
  assert.strictEqual(review.length, 2);
  assert.strictEqual(review[0].record_date, today);
  assert.strictEqual(storage.has('logfit.records.v1'), false);
});

test('exports independent CSV rows with escaped fields and no draft state', () => {
  const csv = context.exportLogFitCsv(records.concat([
    { type: 'meal', raw_text: '검토 중 초안', record_date: today, completion: 'draft' },
    { type: 'meal', raw_text: '확인되지 않은 기록', record_date: today, completion: 'uncertain' }
  ]));
  assert.match(csv, /^id,type,raw_text,record_date,created_at,/);
  assert.match(csv, /meal_period,item,exercise_type,duration_min,completion/);
  assert.strictEqual((csv.match(/\n/g) || []).length, 3);
  assert.doesNotMatch(csv, /검토 중 초안|확인되지 않은 기록/);
});

test('keeps confirmation open when a remaining record has no confirmed date', () => {
  storage.clear();
  const result = context.confirmLogFitRecords([
    { type: 'meal', raw_text: '날짜 불명', record_date: null, date_certainty: 'uncertain', completion: 'completed' }
  ], new Date('2026-10-23T03:00:00Z'));
  assert.strictEqual(result.saved, false);
  assert.match(result.notice, /날짜/);
  assert.strictEqual(storage.has('logfit.records.v1'), false);
  assert.strictEqual(result.records.length, 1);
});

test('confirms only remaining records after the user supplies a valid date', () => {
  storage.clear();
  const result = context.confirmLogFitRecords([
    { type: 'meal', raw_text: '날짜를 수정함', record_date: today, date_certainty: 'certain', completion: 'completed' }
  ], new Date('2026-10-23T03:00:00Z'));
  assert.strictEqual(result.saved, true);
  assert.strictEqual(context.loadLogFitRecords().length, 1);
});

test('renders representative states and exceptions in the dashboard model', () => {
  const model = context.renderLogFitDashboard(records, today);
  assert.strictEqual(model.today.status, '운동 완료');
  assert.strictEqual(model.today.exerciseMinutes, 40);
  assert.strictEqual(model.today.missingExerciseTimeCount, 0);
  assert.match(model.today.feedback, /40/);
});

test('keeps planned, rest, uncertain, and missing-duration states distinct', () => {
  assert.strictEqual(context.renderLogFitDashboard([{ type: 'exercise', completion: 'planned', record_date: today }], today).today.status, '운동 예정');
  assert.strictEqual(context.renderLogFitDashboard([{ type: 'rest', completion: 'completed', record_date: today }], today).today.status, '휴식');
  assert.strictEqual(context.renderLogFitDashboard([{ type: 'exercise', completion: 'uncertain', record_date: today }], today).today.status, '확인 필요');
  const missing = context.renderLogFitDashboard([{ type: 'exercise', completion: 'completed', duration_min: null, record_date: today }], today);
  assert.strictEqual(missing.today.exerciseCount, 1);
  assert.strictEqual(missing.today.exerciseMinutes, 0);
  assert.strictEqual(missing.today.missingExerciseTimeCount, 1);
});
