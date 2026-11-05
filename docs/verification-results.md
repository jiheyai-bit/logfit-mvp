# Verification results

Date: 2026-10-23 (KST)

All data below is synthetic. The browser run used a fixed synthetic sentence and a cleared local storage area; no personal records, secrets, tokens, or API keys were used.

## Static checks

| Check | Expected | Actual | Result |
|---|---|---|---|
| Embedded JavaScript syntax extraction with `new Function` | No syntax error | `PASS index.html embedded JavaScript syntax` | PASS |
| `node tests/task2.test.js` | Existing dashboard/persistence checks pass | 8 PASS lines, exit code 0 | PASS |
| `node tests/task3.test.js` | Synthetic Task 3 checks pass | 6 PASS lines plus completion line, exit code 0 | PASS |
| `git diff --check` | No whitespace errors | Exit code 0 | PASS |
| Local asset scan | No required external local file dependency | `index.html` is self-contained; no local asset references | PASS |

## Browser evidence

Browser: local `index.html`, desktop viewport 1280x577 and narrow viewport 390x844. Durable verbatim harness output and DOM assertions are stored under [`docs/evidence/`](evidence/). No local absolute path is used as evidence.

### Run 1 — core complex sentence

- **Input:** `아침 샐러드, 점심 김치찌개, 저녁 요가 40분`
- **Expected:** 3 independent review records: breakfast meal, lunch meal, and a 40-minute exercise; every record keeps the same `raw_text`; IDs are unique; no invented meal period; after confirmation, dashboard shows 2 meals, 40 minutes, and completed exercise.
- **Actual:** Review contained `cards: 3`, dates were all `2026-10-23`, duration inputs were `["40"]`. After confirmation, storage contained 3 records with types `meal, meal, exercise`, meal periods `아침, 점심, ""`, exercise duration `40`, identical original sentence, and distinct IDs. Dashboard DOM read `mealCount: "2"`, `minutes: "40분"`, `status: "운동 완료"`.
- **Result:** PASS

### Run 2 — refresh persistence and responsive layout

- **Input:** Refresh after Run 1, then return to the LogFit page and resize to 390x844.
- **Expected:** Three confirmed records and their 2-meal/40-minute summary remain after refresh; the LogFit layout remains usable at desktop and narrow viewport widths.
- **Actual:** After refresh, DOM read `stored: 3`, `mealCount: "2"`, `minutes: "40분"`, `status: "운동 완료"`. At 390x844, the hero, input, full-width confirm button, and summary panel were visible without horizontal clipping in the captured viewport.
- **Result:** PASS

### Run 3 — deterministic parser/date/state/weekly synthetic checks

- **Input:** `tests/fixtures/task3-fixtures.json`, reference time `2026-10-23T03:00:00.000Z` (KST date `2026-10-23`), plus the seven synthetic records dated `2026-10-19` through `2026-10-24`.
- **Expected:** Core sentence splits into 3 records; `어제` resolves to `2026-10-22`; explicit `2026년 10월 20일` resolves exactly; unclear weekend date remains uncertain; rest/planned/no-record/uncertain/completed-without-duration states stay distinct; weekly totals exclude planned time and count missing duration separately; localStorage reload matches saved records.
- **Actual:** `node tests/task3.test.js` emitted PASS for all 6 checks: complex sentence (including null meal durations), KST dates, state distinctions, same-day exercise-plus-rest preservation, seven-day aggregation, and persistence. Aggregate assertions were 3 completed exercise records, 70 completed minutes, 1 meal, 1 missing exercise duration, and 2 unrecorded days in the fixed 7-day window. Exit code was 0.
- **Result:** PASS

## Review focus coverage

- **Core complex sentence:** verified in browser and synthetic test.
- **Date handling:** KST default date, relative yesterday, explicit date, and unclear date are covered; unclear dates are not guessed.
- **Exercise/rest states:** completed exercise, rest, planned exercise, uncertain completion, no record, and completed exercise without duration are covered.
- **Weekly aggregation:** aggregation uses `record_date`; planned time is excluded; missing duration is counted separately.
- **Refresh persistence:** confirmed records and dashboard metrics survived browser refresh through `localStorage`.
- **Reload/layout:** LogFit reload persistence and desktop/narrow layout were browser-checked. Claims about Platen behavior, typing, Hangul composition, lamps, auto-typing, reset, or sound are unsupported by this independent repository and are intentionally not made.

## Final review fix round

- **Input:** `오늘 점심은 김치찌개를 먹고 저녁에 요가 40분 했어.`
- **Expected:** 2 records (점심 meal and 40-minute 요가 exercise), both preserving the exact input as `raw_text`; the meal period is `점심`.
- **Actual:** `node tests/task3.test.js` passed the regression assertion for 2 records, `점심`, `김치찌개`, `요가`, and `40` minutes.
- **Input:** `오늘 운동했어`
- **Expected:** one completed exercise record used for detection, with no named exercise type.
- **Actual:** regression assertion passed with `exercise_type: null`.
- **Result:** PASS

All final-review checks also passed: `node tests/task2.test.js`, embedded JavaScript syntax validation, and `git diff --check`.
## Reproduction notes

1. Open `index.html` directly.
2. Clear local storage for the file origin before a fresh browser run.
3. Repeat Run 1 and inspect the confirmation cards before saving.
4. Refresh and inspect the dashboard metrics.
5. Run `node tests/task2.test.js && node tests/task3.test.js` from the repository root.
6. Do not commit exported CSV files or real user data; `.gitignore` excludes generated CSV/log files.
7. Read the durable evidence files under `docs/evidence/`; each contains verbatim harness output or exact DOM assertions from the corresponding run.
