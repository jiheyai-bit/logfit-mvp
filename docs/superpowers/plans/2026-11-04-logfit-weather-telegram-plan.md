# LogFit Weather Telegram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reviewable weather-aware running suggestion and an approval-gated one-shot Telegram reminder without breaking the existing local LogFit MVP.

**Architecture:** Keep the existing single-file browser app and add deterministic weather suggestion functions that consume Open-Meteo-style forecast data without exposing secrets. Add a small Node bridge for durable local notification metadata and a clearly separated Telegram Cron registration command; do not create or send a real notification until the user explicitly approves it. Existing `localStorage` records remain compatible, while new plans and intervention events are stored in a local JSON file ignored by Git.

**Tech Stack:** Existing HTML/CSS/JavaScript, Node.js built-ins, Hermes Cron CLI, Asia/Seoul timezone, weather API over HTTPS.

**Spec:** User request: finish by Thursday with weather suggestions and Telegram alerts; preserve LogFit 1.0; no external state change before approval.

## Global Constraints

- Preserve existing natural-language logging, daily summary, and weekly report behavior.
- Never infer an exact exercise time from “저녁”; request confirmation.
- Do not include personal health data, Telegram tokens, API keys, or chat IDs in Git.
- Use `Asia/Seoul` for schedule display and calculations.
- Planned workouts are excluded from completed exercise totals until completion is confirmed.
- Real Telegram Cron registration and message sending require explicit user approval.
- Existing `main` and public worktree are not modified.

## Review Focus

- A future plan with “저녁” but no clock time must remain `awaiting_time_confirmation` rather than becoming 19:00.
- Weather API failure or missing forecast must leave the workout plan usable and show a transparent fallback.
- Rain probability must produce a suggestion, not an unsafe medical or absolute “cannot run” verdict.
- Approving a plan twice must not create duplicate schedule or Cron identifiers.
- A planned workout must not enter daily/weekly exercise totals before completion confirmation.

---

### Task 1: Lock existing behavior and add weather/schedule tests

**Files:**
- Create: `tests/logfit2.test.js`
- Modify: `tests/fixtures/task3-fixtures.json` only if a deterministic fixture is needed

**Interfaces:**
- Consumes: functions extracted from `index.html` by the existing VM test pattern.
- Produces: failing tests for `parseLogFitPlanIntent`, `buildWeatherSuggestion`, `createScheduleDraft`, and idempotent completion promotion.

- [ ] **Step 1: Write failing tests**
  - Assert `오늘 저녁에 요가할 거야` yields `intent: planned`, `activity_type: exercise`, and `planned_start_at: null` with `status: awaiting_time_confirmation`.
  - Assert `오늘 19시에 러닝할 거야` extracts KST `planned_start_at` and remains planned.
  - Assert a rainy forecast produces a reviewable alternate suggestion with reason codes, not an absolute prohibition.
  - Assert missing forecast produces `weather_status: unavailable` and preserves the original running plan.
  - Assert planned exercise is excluded from daily and weekly completed totals.
  - Assert completion promotion is idempotent for the same `schedule_id`.

- [ ] **Step 2: Run `node tests/logfit2.test.js` and verify it fails**
  - Expected: missing function or assertion failures; existing Task 2/3 tests remain untouched.

- [ ] **Step 3: Run the existing regression suite**
  - Run `node tests/task2.test.js && node tests/task3.test.js`.
  - Expected: existing suite remains PASS before new implementation.

### Task 2: Implement deterministic planned-workout and weather suggestion logic

**Files:**
- Modify: `index.html` embedded JavaScript and UI markup
- Test: `tests/logfit2.test.js`

**Interfaces:**
- `parseLogFitPlanIntent(text, now) -> PlanIntent`
- `createScheduleDraft(plan, context) -> ScheduleDraft`
- `buildWeatherSuggestion(schedule, forecast, preferences) -> WeatherSuggestion`
- `promoteScheduleCompletion(schedule, completionInput, records) -> {schedule, records}`

- [ ] **Step 1: Implement time parsing without guessing**
  - Parse explicit hour/minute expressions into KST ISO values.
  - Treat “아침/점심/저녁/밤” without a clock as missing time.
  - Return `awaiting_time_confirmation` for missing time.

- [ ] **Step 2: Implement weather suggestion policy**
  - Accept normalized forecast fields: temperature, precipitation probability, precipitation type, wind speed, fetched time, source.
  - Return `recommended_action` values such as `run_as_planned`, `move_time`, `indoor_alternative`, or `weather_unavailable`.
  - Include `reason_codes` and a human-readable explanation.
  - Never claim medical safety or guarantee that running is safe.

- [ ] **Step 3: Implement schedule and completion state transitions**
  - Store `schedule_id`, `planned_start_at`, `reminder_at`, `timezone`, `status`, `cron_job_id`, notification fields, and `linked_record_id`.
  - Keep planned schedules outside completed exercise aggregation.
  - Promote exactly once on confirmed completion.

- [ ] **Step 4: Run focused and regression tests**
  - Run `node tests/logfit2.test.js`, `node tests/task2.test.js`, and `node tests/task3.test.js`.
  - Expected: all PASS.

### Task 3: Add the weather-aware review UI

**Files:**
- Modify: `index.html`
- Test: `tests/logfit2.test.js` and browser evidence under `docs/evidence/logfit-2/`

**Interfaces:**
- Consumes: `PlanIntent`, `ScheduleDraft`, and `WeatherSuggestion` from Task 2.
- Produces: a visible review card before any schedule or notification is registered.

- [ ] **Step 1: Add a weather context panel to the existing “오늘의 코칭” area**
  - Show forecast source and last-updated time.
  - Show recommendation and reason codes.
  - Show `시간 확인 필요` when the plan has no exact time.
  - Keep existing colors, cards, spacing, and typography.

- [ ] **Step 2: Add explicit user actions**
  - `시간 확인 후 제안 받기`
  - `일정 승인`
  - `대체 운동 선택`
  - `취소`
  - No action may create a Hermes Cron job yet.

- [ ] **Step 3: Browser verify**
  - Verify the ambiguous-time flow, explicit-time flow, weather-unavailable fallback, and planned-not-counted behavior.
  - Save exact DOM assertions and command output under `docs/evidence/logfit-2/`.

### Task 4: Add a local notification bridge and approval-gated Hermes Cron command

**Files:**
- Create: `scripts/logfit-bridge.js`
- Create: `scripts/register-telegram-test.sh`
- Modify: `.gitignore`
- Test: `tests/logfit2-bridge.test.js`

**Interfaces:**
- `scripts/logfit-bridge.js` stores local schedule/event metadata in `.logfit-runtime/` and exposes a small localhost API for the browser.
- `register-telegram-test.sh` accepts explicit schedule time, Telegram target, and approval flag; it refuses to create a job without the approval flag.

- [ ] **Step 1: Write bridge tests**
  - Assert schedule records contain `schedule_id`, `cron_job_id`, `notification_channel`, `notification_status`, and `timezone`.
  - Assert repeated registration for the same `schedule_id` refuses duplication.
  - Assert runtime files are ignored and contain no secrets in tracked paths.

- [ ] **Step 2: Implement local JSON persistence**
  - Use Node built-ins only.
  - Store runtime data under `.logfit-runtime/`.
  - Never store Telegram tokens; accept only a target chat ID at registration time and do not write it to tracked files.

- [ ] **Step 3: Implement the approval-gated Cron registration wrapper**
  - Use Hermes CLI `hermes cron create <schedule> <prompt> --deliver telegram:<chat_id> --name ...`.
  - Require `LOGFIT_APPROVE_TELEGRAM=YES` in the process environment.
  - Use `--paused` for a canary creation if a non-sending registration inspection is needed.
  - Capture the returned Cron Job ID and persist it against `schedule_id` only after successful creation.
  - Do not execute this wrapper during implementation without the user’s approval.

- [ ] **Step 4: Run bridge tests without external side effects**
  - Expected: PASS with no Cron job created and no Telegram message sent.

### Task 5: Verify the one-shot Telegram path after approval

**Files:**
- Create: `docs/evidence/logfit-2/telegram-test.md`
- Modify: `AGENT_LOG.md`

**Interfaces:**
- Consumes: a user-approved Telegram target and a one-shot test time.
- Produces: Cron list/run output, delivery status, and user-confirmed receipt evidence.

- [ ] **Step 1: Recheck profile and gateway ownership**
  - Run the active dev-profile Hermes gateway status command and `hermes cron status`.
  - Resolve the existing Telegram credential/profile conflict before registration.

- [ ] **Step 2: Ask for explicit approval immediately before registration and sending**
  - Confirm target profile, target chat, message text, and one-shot time.
  - Never request or display the Bot token.

- [ ] **Step 3: Create exactly one one-shot Cron job**
  - Persist the Cron Job ID and `schedule_id` mapping.
  - Read back `hermes cron list` and `hermes cron runs`.

- [ ] **Step 4: Verify delivery separately from user receipt**
  - Record Hermes execution/delivery status.
  - Ask the user to confirm receipt in Telegram; do not treat Cron success alone as user receipt.

### Task 6: Final regression and presentation evidence

**Files:**
- Modify: `docs/verification-results.md`
- Modify: `AGENT_LOG.md`
- Create: `docs/evidence/logfit-2/test-matrix.md`

- [ ] **Step 1: Run all static and behavior checks**
  - `node tests/task2.test.js`
  - `node tests/task3.test.js`
  - `node tests/logfit2.test.js`
  - `node tests/logfit2-bridge.test.js`
  - embedded JavaScript syntax check
  - `git diff --check`

- [ ] **Step 2: Record T1–T9 results**
  - Every test records input, expected result, actual result, PASS/FAIL/BLOCKED, and evidence path.

- [ ] **Step 3: Verify Git protection**
  - Confirm branch is not `main`.
  - Confirm no secrets, runtime files, or personal health data are tracked.
  - Do not commit, push, deploy, or create a PR without user approval.
