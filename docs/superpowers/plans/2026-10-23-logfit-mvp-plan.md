# LogFit MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개인 프로젝트 `~/logfit-mvp`에 LogFit 대시보드형 MVP를 만들어 한 문장 기록, 확인·수정, 하루 요약, 7일 리포트를 검증한다.

**Architecture:** 개인 프로젝트의 단일 HTML 파일 안에 LogFit 화면과 상태 관리 로직을 둔다. 입력 문장은 여러 독립 기록으로 분리해 메모리 모델로 만들고, 사용자가 확인한 기록만 `localStorage`에 저장한다. AI 서버 없이 합성 입력을 처리하는 로컬 데모로 구현하며, 공개 저장소에는 개인 기록을 넣지 않는다.

**Tech Stack:** HTML, CSS, vanilla JavaScript, `localStorage`; 외부 라이브러리와 서버는 사용하지 않는다.

**Spec:** `docs/superpowers/specs/2026-10-23-logfit-mvp-design.md`

## Global Constraints

- 작업 디렉터리는 `~/logfit-mvp`이며 `~/platen`과 완전히 분리한다.
- 개인 프로젝트의 단일 `index.html`을 유지한다.
- CSS와 JavaScript는 `index.html` 안에 둔다.
- 기준 시간대는 `Asia/Seoul`(KST)이다.
- 식사·운동·휴식 기록은 한 번의 입력에서도 독립된 CSV 행에 대응하는 독립 객체로 저장한다.
- 모르는 날짜·시간·완료 여부를 임의로 추정하지 않는다.
- 실제 개인 기록은 GitHub에 포함하지 않고, 테스트에는 합성 데이터만 사용한다.
- 저장소 생성·공개 설정·최초 push 전에는 사용자의 확인을 받는다.

## Review Focus

- 한 문장에 여러 식사·운동·휴식이 섞임 — 각 기록이 독립 ID와 유형으로 분리되고 원문을 공유하는지 확인한다.
- `어제`, `그저께`, 미래 날짜, 불명확한 날짜 표현 — KST 기준 날짜와 계획·확인 필요 분류가 정확한지 확인한다.
- 실제 운동·휴식·계획·미기록의 동시 존재 — 대표 상태와 상세 기록이 명세의 우선순위를 따르는지 확인한다.
- 운동 시간 누락 — 운동 횟수에는 포함하되 총 시간에는 제외하고 `시간 미입력`을 표시하는지 확인한다.
- 새로고침 — 최종 저장 전 추출 결과는 저장하지 않고, 최종 저장 기록은 새로고침 후 복원되는지 확인한다.

---

### Task 1: LogFit 데이터 모델과 파싱·집계 엔진

**Files:**
- Modify: `index.html`의 기존 `<script>` 내부, LogFit 전용 로직 구간

**Interfaces:**
- Produces `parseLogFitSentence(text, now)` → `{ rawText, records }`
- Produces `normalizeLogFitRecord(record, now)` → record with `id`, `type`, `raw_text`, `record_date`, `created_at`, `status`
- Produces `getRepresentativeStatus(records)` → `"운동 완료" | "휴식" | "운동 예정" | "미기록" | "확인 필요"`
- Produces `summarizeLogFitDay(records, date)` → `{ mealCount, exerciseCount, exerciseMinutes, missingExerciseTimeCount, status }`
- Produces `summarizeLogFitWeek(records, startDate)` → seven day summaries and aggregate counts
- Consumes the fixed KST clock helper and the record schema defined below

**Record schema:**

`{ id, type: "meal" | "exercise" | "rest", raw_text, record_date, created_at, meal_period, item, exercise_type, duration_min, completion: "completed" | "planned" | "uncertain", status }`

- `record_date` is the activity date; `created_at` is the actual input timestamp.
- Missing meal period, exercise type, or duration remains empty/null.
- Future activity is `planned`; unclear date or completion is `uncertain`.

- [ ] **Step 1: Add deterministic date helpers**

Implement KST-aware helpers that accept an explicit `now` value for tests and handle no date, `어제`, `그저께`, `지난주 월요일`, explicit dates, future dates, and ambiguous phrases such as `주말에` and `며칠 전에`.

- [ ] **Step 2: Add extraction for independent records**

Implement the demo parser for the supported Korean sentence patterns. It must split multiple meals, exercises, and rest mentions into separate records while preserving the exact input as `raw_text`; it must never invent an unmentioned time or duration.

- [ ] **Step 3: Add representative status and aggregate functions**

Use the specified priority: completed exercise → `운동 완료`; explicit rest without completed exercise → `휴식`; planned exercise only → `운동 예정`; no record → `미기록`; uncertain completion/date → `확인 필요`. Count each completed exercise record once, sum only confirmed `duration_min`, and count meals independently.

- [ ] **Step 4: Run static syntax verification**

Run: `node -e "const fs=require('fs'); const s=fs.readFileSync('index.html','utf8').match(/<script>([\\s\\S]*?)<\\/script>/)[1]; new Function(s); console.log('JavaScript syntax OK')"`
Expected: `JavaScript syntax OK` with no syntax error.

### Task 2: LogFit dashboard, review/edit flow, persistence, and CSV export

**Files:**
- Modify: `index.html` CSS section for LogFit styles
- Modify: `index.html` body section for the LogFit view and dashboard elements
- Modify: `index.html` script section for event handlers and `localStorage`

**Interfaces:**
- Consumes Task 1 parser and summary functions.
- Produces `renderLogFitDashboard()`, `renderReviewRecords(records)`, `saveConfirmedLogFitRecords(records)`, and `loadLogFitRecords()`.
- Produces `exportLogFitCsv(records)` for verification-only CSV export.
- Uses the storage key `logfit.records.v1` and stores only confirmed records.

- [ ] **Step 1: Add a view switch without changing Platen behavior**

Add a clearly labeled control that switches between the existing Platen screen and the LogFit dashboard. Keep the existing keyboard, lamp, demo, reset, and sound listeners scoped to their current elements.

- [ ] **Step 2: Build the dashboard layout**

Add the LogFit logo, `하루를 한 문장으로 기록하세요`, large free-text input, save button, today summary, representative status, detailed records, and 7-day report. Use responsive CSS and the existing file's inline-only constraint.

- [ ] **Step 3: Build the review-and-edit step**

On save, show every extracted record in an editable confirmation card. Show the inferred `record_date` before final save, expose empty/uncertain fields instead of guessing, and let the user edit or remove each record before confirmation. Show the original `raw_text`.

- [ ] **Step 4: Persist only confirmed records**

On final confirmation, assign stable IDs where needed, save the independent record objects to `localStorage`, rerender today and weekly summaries, and restore the records on page load. Keep unconfirmed draft extraction out of storage.

- [ ] **Step 5: Display representative state and exceptions**

Show `운동 완료`, `휴식`, `운동 예정`, `미기록`, or `확인 필요` according to Task 1. Show `시간 미입력` for completed exercises without duration and keep rest details visible when exercise is the representative state.

- [ ] **Step 6: Add verification-only CSV export**

Export only the confirmed synthetic/local records as independent rows with `id`, `type`, `raw_text`, `record_date`, `created_at`, and type-specific fields. Do not upload or commit exported personal data.

### Task 3: Reproducible tests, documentation, and browser verification

**Files:**
- Modify: `index.html` only if verification exposes a defect
- Create: `README.md`
- Create: `LICENSE`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `AGENT_LOG.md`
- Create: `tests/` synthetic fixtures and reproducible checks
- Create: `docs/verification-results.md`

**Interfaces:**
- Consumes the completed LogFit dashboard and the personal project's browser UI.
- Produces a verified browser behavior report and documented reproduction steps; no new runtime dependency.

- [ ] **Step 1: Run static checks**

Run the JavaScript syntax check from Task 1 and inspect `index.html` for broken local file references. Expected: no syntax error and no new external file dependency.

- [ ] **Step 2: Open the HTML in a browser**

Open `index.html` directly and verify the LogFit dashboard can be reached, the original Platen screen still loads, and the layout works at desktop and narrow viewport widths.

- [ ] **Step 3: Verify the core example**

Enter `아침 샐러드, 점심 김치찌개, 저녁 요가 40분`. Before confirmation, verify two meal records and one exercise record, shared `raw_text`, independent IDs, no invented meal period beyond the stated values, and 40 minutes only on the exercise record.

- [ ] **Step 4: Verify state edge cases**

Verify separately: explicit rest, no record, planned future exercise, unclear date, completed exercise plus rest on one day, and completed exercise without duration. Confirm representative status and aggregate behavior against the review focus.

- [ ] **Step 5: Verify refresh persistence and regression**

Save confirmed records, refresh the browser, and verify the records and 7-day report remain. Reopen the LogFit HTML and verify the dashboard starts without stored personal data, the core view is reachable, and the layout works at desktop and narrow viewport widths.

- [ ] **Step 6: Report results before any commit**

Record at least three real test runs with input, expected result, actual result, and pass/fail in `docs/verification-results.md`. Include browser evidence paths or links. Do not create a GitHub repository, change visibility, push, or open a PR until the user has directly checked the browser result and approved those actions.
