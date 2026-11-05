# AGENT_LOG

## 2026-10-23 — LogFit MVP Task 1

### 작업 범위

- 작업 폴더: 개인 LogFit 저장소
- 작업 브랜치: `feat/logfit-mvp-core`
- 공동 프로젝트는 작업 대상에서 제외했다.
- GitHub 저장소 생성, 공개 설정, 원격 추가, push, PR은 실행하지 않았다.

### 사람의 지시와 확인

- 개인 프로젝트를 공동 프로젝트와 분리하고 `~/logfit-mvp`에서만 작업하도록 지시받았다.
- `main` 브랜치를 개인 프로젝트의 기준 브랜치로 설정하고, 구현은 기능 브랜치에서 진행하도록 확인했다.
- 현재 오류와 수정 과정을 9주차 평가용 에이전트 작업 기록에 남기도록 요청받았다.

### 에이전트 작업

1. LogFit 설계 문서와 구현 계획을 개인 프로젝트로 복사했다.
2. 개인 LogFit 저장소에서 경로와 기존 Git 저장소 여부를 확인한 뒤 Git을 초기화했다.
3. 설계 문서와 구현 계획을 기준 커밋으로 기록했다.
4. Subagent-driven 방식으로 Task 1의 데이터 모델, KST 날짜 처리, 자연어 파싱, 상태·집계를 구현했다.

### 발견한 오류와 수정 과정

#### 오류 1: 원본 문장 보존 실패

- 발견 경로: Task 1 독립 리뷰
- 문제: 파서가 입력 문장을 `trim()`한 뒤 `rawText`와 각 기록의 `raw_text`에 사용해, 사용자가 입력한 앞뒤 공백이 사라졌다.
- 영향: 원본 문장 보존 규칙을 위반하고, 나중에 사람이 원문과 추출 결과를 비교하기 어려웠다.
- 수정: 원본 문자열은 그대로 별도 보관하고, 파싱에만 정리된 문자열을 사용하도록 변경했다.
- 수정 커밋: `31ac786c70bba1333727ec3cfb92f83b4d75e068`
- 검증: 원본 앞뒤 공백 보존 확인, JavaScript 문법 검사 통과, 기존 행동 검사 통과.

#### 오류 2: 불확실한 완료 상태 미처리

- 발견 경로: Task 1 독립 리뷰
- 문제: `운동했는지 모르겠어`, `모르겠`, `기억 안`, `아마`와 같은 표현도 완료 운동으로 분류될 수 있었다.
- 영향: 확인되지 않은 활동이 운동 횟수와 피드백에 잘못 포함될 수 있었다.
- 수정: 불확실성 표현을 감지하면 `completion: "uncertain"`으로 분류하고 완료 집계에서 제외하도록 변경했다.
- 검증: 불확실한 식사·운동·휴식의 직접 분류 및 집계 제외 확인.

#### 오류 3: 혼합 문장에서 불확실성 범위가 너무 넓음

- 발견 경로: 수정 후 독립 재검토
- 문제: `아침 밥 먹었어, 운동 했는지 모르`처럼 확정 기록과 불확실 기록이 한 문장에 섞이면, 공유된 `raw_text` 전체에서 불확실성 표현을 찾아 식사까지 불확실하게 만들었다.
- 영향: 확정된 식사 기록이 식사 건수에서 빠졌다.
- 수정: 불확실성 판단 대상을 전체 원문이 아니라 각 기록의 source fragment로 좁혔다.
- 수정 커밋: `fa6e02ebb1d9c94ccd89f0b9f658a8d5dda0fd7e`
- 검증: 같은 입력에서 식사는 `completed`, 운동은 `uncertain`, 식사 건수는 1건, 운동 건수는 0건으로 확인했다.

### 결과

- Task 1 최종 독립 재검토: 두 오류 해결 확인, 새 Critical/Important 문제 없음.
- JavaScript 문법 검사: 통과.
- 행동 검사: 통과.
- `git diff --check`: 통과.
- 현재 진행 중인 다음 작업: Task 2 대시보드·확인/수정·LocalStorage·CSV.

## 2026-10-23 — LogFit MVP Task 3

### 작업 범위

- 합성 fixture와 재현 가능한 Node 검사를 추가했다.
- README, MIT LICENSE, `.gitignore`, `.env.example`, 브라우저 검증 결과 문서를 추가했다.
- 공동 프로젝트는 수정하지 않았고, 원격·push·PR은 실행하지 않았다.

### 검증 결과

- `node tests/task2.test.js`: 8개 PASS.
- `node tests/task3.test.js`: 복합 문장, KST 날짜, 상태, 같은 날 운동+휴식 보존, 주간 집계, localStorage 지속성 6개 PASS.
- `index.html` 내장 JavaScript 문법 검사와 `git diff --check`: PASS.
- 브라우저에서 복합 문장 저장, LogFit 새로고침 지속성, 390px 좁은 화면을 확인했다. Platen 동작은 이 독립 저장소의 검증 범위가 아니므로 주장하지 않는다.
- 상세 입력·기대·실제·결과는 `docs/verification-results.md`에 기록했다.

### Task 3 review fix round 1

- `docs/evidence/`에 브라우저 harness의 verbatim DOM assertion과 Node 출력의 durable 사본을 추가했다.
- 복합 문장의 두 식사에 `duration_min: null`을 명시적으로 검증했다.
- 같은 날 완료 운동과 휴식 fixture를 추가하고 대표 상태, 운동 횟수·분, 휴식 보존을 검증했다.
- 임시 screenshot 경로와 Platen 회귀 주장을 제거하고 LogFit reload/layout 검증으로 범위를 바로잡았다.

## 2026-10-23 — Final review fix round

### 발견한 오류와 수정

- `오늘 점심은 김치찌개를 먹고 저녁에 요가 40분 했어.`에서 `먹고` 뒤의 저녁 절이 분리되지 않아 점심 식사 기록이 누락됐다. 날짜 접두사 때문에 식사 시간대도 인식되지 않았다.
- 식사 시간대 절 사이의 `먹고` 경계를 독립 기록 분리 규칙에 추가하고, `오늘`·상대 날짜 접두사를 포함한 식사 시간대 매칭을 지원했다. 원문 `raw_text`는 기존처럼 입력 문자열 전체를 유지한다.
- 일반 표현 `운동`은 운동 감지에 사용하되 구체적인 운동 종류가 없으면 `exercise_type: null`로 저장하도록 수정했다.

### 검증

- 회귀 테스트 2건을 `tests/task3.test.js`에 추가했다.
- `node tests/task3.test.js`, `node tests/task2.test.js`, 내장 JavaScript 문법 검사, `git diff --check`를 모두 통과했다.

## 2026-10-27 — 월·일 날짜 입력 회귀 수정

### 발견한 오류와 수정

- `10월 21일 PT근력운동 1시간 30분, 조깅 30분 했어` 입력에서 연도 없는 `10월 21일`을 날짜 해석기가 인식하지 못해 입력일인 `2026-10-27`로 표시됐다.
- KST 현재 연도를 사용해 `M월 D일` 형식을 `YYYY-MM-DD`로 해석하도록 `resolveLogFitDate()`에 규칙을 추가했다.
- 두 독립 운동 기록 모두 저장 전 확인 카드에 `2026-10-21`이 표시되는지 회귀 테스트와 브라우저로 확인했다.

### 검증

- 회귀 테스트: `node tests/task3.test.js` — PASS.
- 기존 Task 2 테스트: `node tests/task2.test.js` — PASS.
- 내장 JavaScript 문법 검사와 `git diff --check` — PASS.
- 브라우저 확인: 두 카드 모두 날짜 `2026-10-21` 표시.

### 별도 확인 사항

- 같은 입력의 `1시간 30분`은 현재 파서가 첫 단위인 60분으로 추출한다. 이번 작업은 날짜 오류만 수정했으며, 복합 운동 시간 해석은 별도 작업으로 남겼다.

## 2026-10-27 — 복합 운동 시간 분리·합산 수정

### 발견한 오류와 수정

- `10월 21일 PT근력운동 1시간 30분, 조깅 30분 했어`에서 첫 운동 시간이 `60분`으로만 추출됐다.
- 시간 정규식을 `시간+분` 조합까지 읽도록 변경해 `1시간 30분`을 `90분`으로 변환했다.
- 쉼표로 분리된 근력운동과 조깅은 각각 독립 운동 기록으로 유지했다.

### 검증

- `node tests/task3.test.js` — 전체 PASS.
- `node tests/task2.test.js` — 전체 PASS.
- 내장 JavaScript 문법 검사와 `git diff --check` — PASS.
- 브라우저 확인 결과:
  - PT근력운동: `2026-10-21`, `90분`
  - 조깅: `2026-10-21`, `30분`

## 2026-11-04 — LogFit 2.0 날씨 제안·Telegram 준비

### 작업 범위

- 작업 브랜치: `feat/logfit-2-agent`
- 기존 `index.html` MVP의 자연어 기록·일간·주간 집계 흐름은 유지했다.
- 미래 운동 계획을 완료 운동과 분리하고, 시간이 없는 표현은 임의 확정하지 않도록 계획 확인 UI를 추가했다.
- 명시적 운동 시간, `schedule_id`, `planned_start_at`, `reminder_at`, `timezone`, `cron_job_id`, `notification_status` 구조를 추가했다.
- Open-Meteo 기반 서울 기본 위치의 러닝 날씨 제안과 API 실패 fallback을 추가했다.
- 로컬 브리지와 승인 가드 Telegram Cron 등록 스크립트를 추가했다.
- 실제 Telegram Cron 생성·메시지 발송은 사용자 승인 전 실행하지 않았다.

### 검증

- `node tests/logfit2.test.js`: 6개 PASS.
- `node tests/logfit2-bridge.test.js`: PASS.
- `node tests/task2.test.js`: 8개 PASS.
- `node tests/task3.test.js`: 전체 PASS.
- 내장 JavaScript 문법 검사와 `git diff --check`: PASS.
- 브라우저에서 `오늘 저녁에 요가할 거야` 입력 시 시각 확인 필요 상태 표시 확인.
- 브라우저에서 `오늘 19시에 러닝할 거야` 입력 시 Open-Meteo 날씨 제안 표시 확인.
- 동일 일정 승인 2회 시 localStorage 일정 1건 유지 확인.
- `scripts/register-telegram-test.sh`는 승인값이 없을 때 종료 코드 2로 외부 등록을 차단함.

### 미완료·승인 대기

- `dev` Gateway는 중지 상태다.
- `dev` 프로필 Cron 작업은 없다.
- 다른 프로필과 Telegram 자격 증명 중복 경고가 있어 소유 프로필을 먼저 정해야 한다.
- 실제 일회성 Telegram 알림 생성·수신 검증은 사용자의 명시적 승인 후 진행한다.

### Telegram 승인 후 점검 결과

- 사용자는 `dev` 프로필을 Telegram 테스트 소유자로 승인했다.
- 안전한 키명 점검 결과 `dev/.env`에는 `TELEGRAM_BOT_TOKEN`과 `TELEGRAM_ALLOWED_USERS`가 없다.
- Telegram 관련 설정은 다른 프로필에만 존재하며, 프로필 간 중복 경고가 남아 있다.
- 토큰을 읽거나 복사하지 않고, `dev`로의 실제 Cron 등록·발송은 BLOCKED 상태로 유지했다.
- 이후 `dev`를 standalone Gateway로 설치·실행하고, Telegram polling 연결을 확인했다.
- 일회성 Cron을 Telegram 테스트 대상으로 등록했다.
- Hermes 실행 상태는 `completed`였고, 사용자가 Telegram에서 테스트 메시지 수신을 확인했다.
- 첫 실제 Telegram 전송 검증: PASS.

## 2026-11-04 — 한강 5km 공복 유산소 날씨 알림

### 작업 범위

- 한강 여의도 인근 좌표를 기준으로 Open-Meteo 시간별 예보를 조회하는 no-agent 스크립트를 추가했다.
- 기본 조건: 기온 5~25℃, 강수확률 30% 이하, 강수·눈 없음, 풍속 25km/h 이하.
- 조건을 만족하면 “한강 5km 공복 유산소” 제안 메시지를 출력하고, 조건을 만족하지 않으면 빈 출력을 내 Telegram 전달을 생략한다.
- 공복 운동을 의무화하거나 건강 상태를 진단하지 않고, 컨디션과 수분 섭취를 확인하도록 안내한다.
- `dev` 프로필 시간대를 `Asia/Seoul`로 설정했다.
- 반복 Cron `360294886eb8`을 매일 05:30에 `telegram` 전달 대상으로 등록했다.

### 검증

- `node tests/logfit-weather-alert.test.js`: PASS.
- 실제 Open-Meteo dry-run: 한강 위치·기온·강수확률·풍속을 포함한 알림 문구 생성 확인.
- `hermes -p dev cron list`: 05:30 KST, no-agent, `logfit-weather-alert.sh`, Telegram 대상 확인.
- `hermes -p dev cron status`: Gateway 실행·다음 실행 시각 확인.
- `hermes -p dev cron doctor`: 문제 없음.
- 첫 반복 알림의 실제 Telegram 수신은 다음 05:30 실행 후 별도 확인한다.

## 2026-11-04 — Telegram 운동 완료 메시지 LogFit 저장

### 작업 범위

- Hermes `agent:start` Gateway hook으로 Telegram 사용자 메시지를 수신한다.
- `5km 공복 유산소 완료, 평균 1km 6분 40초` 형식을 파싱한다.
- 거리, 평균 페이스(초/km), 총 운동 시간, 완료 상태를 LogFit 브리지에 저장한다.
- 동일 루틴·동일 완료 메시지는 다시 받아도 기록을 중복 생성하지 않는다.
- 브리지 `/api/state`를 통해 LogFit 홈 화면이 외부 완료 기록을 localStorage와 병합한다.
- `dev` Gateway에 `logfit-completion` hook을 설치하고 재시작했으며, 로그에서 hook 로드를 확인했다.

### 검증

- `node tests/logfit-completion.test.js`: PASS.
- 내부 hook 실행: 완료 기록 저장 및 중복 저장 방지 확인.
- Gateway 로그: `Loaded hook 'logfit-completion' for events: ['agent:start']` 확인.
- 브리지 `/health`: PASS.
- 기존 날씨·LogFit 2.0·Task 2·Task 3 회귀 테스트: 전체 PASS.
- 실제 Telegram 문장 수신 후 사용자 확인은 다음 단계로 남아 있다.

## 2026-11-04 — 주 3회 유산소 조깅 목표 알림

### 작업 범위

- 최근 7일 동안 완료된 러닝·조깅·유산소 기록을 집계한다.
- 완료 횟수가 3회 이상이면 Telegram 메시지를 보내지 않는다.
- 3회 미만이면 부족한 횟수와 집계 기간을 포함한 push를 보낸다.
- 매주 월요일 05:30 KST에 no-agent Cron으로 실행한다.
- 날씨 알림과 주간 목표 알림을 별도 Cron으로 분리했다.

### 등록·검증

- 주간 목표 Cron Job: `6acad8d7d0e4`
- 스케줄: `30 5 * * 1`
- 전달: Telegram
- `hermes -p dev cron doctor`: 두 작업 모두 문제 없음.
- 주간 목표 테스트: PASS.
- 목표 3회인 경우 무응답, 2회인 경우 “1회 더” push 조건을 테스트했다.

## 2026-11-04 — 무응답 후속 알림·흐린 날 실내 제안

### 작업 범위

- 05:30 날씨 알림 후 Telegram 응답이 없으면 05:40과 05:50에 각각 한 번씩 후속 알림을 보낸다.
- Telegram 사용자가 어떤 메시지라도 보내면 해당 날짜의 후속 알림을 중단한다.
- 후속 알림이 이미 발송된 경우 같은 번호를 중복 발송하지 않는다.
- 구름량 70% 이상이면 야외 러닝 대신 실내 근력운동·요가를 제안한다.
- 비·눈·강풍·기온 기준 미달이면 기존처럼 야외 러닝 알림을 생략한다.
- 05:30 날씨 알림 발송 이벤트와 Telegram 수신 이벤트를 로컬 브리지에 저장한다.

### 등록·검증

- 05:40 Cron Job: `21041d547ff6`
- 05:50 Cron Job: `576c5b7841ad`
- `hermes -p dev cron list`: 두 후속 작업 active 확인.
- `hermes -p dev cron doctor`: 4개 작업 모두 문제 없음.
- 무응답 후속 알림 테스트: PASS.
- 흐린 날 실내 제안 테스트: PASS.
- Gateway hook 재로드: PASS.

## 2026-11-04 — Google Calendar 기반 운동 가능 시간

### 작업 범위

- Google Calendar의 일정에서 바쁜 시간과 일정 전후 15분 여유를 제외한다.
- 30분 운동 후보 시간을 15분 간격으로 계산한다.
- 캘린더 연결이 없거나 OAuth가 만료되어도 05:30~21:30 기본 시간 후보를 제공한다.
- 이벤트 제목·참석자 등 상세 정보는 LogFit에 저장하지 않는다.
- 홈 화면에 “운동 가능한 시간” 카드와 연결 상태를 표시한다.
- Calendar 쓰기 기능은 추가하지 않고 읽기 전용으로 제한했다.

### 구현·검증

- `scripts/logfit-calendar.js`: 일정 정규화·바쁜 구간 제외·fallback 계산.
- `logfit-bridge`의 `/api/calendar/windows` endpoint 추가.
- 현재 API 응답: `connected: false`, `error: calendar_unavailable`, fallback 후보 반환.
- `gws auth status`: OAuth 토큰이 expired or revoked 상태임을 확인.
- Google Calendar 일정이 연결되면 같은 endpoint가 실제 바쁜 시간을 제외하도록 준비됨.
- 캘린더 후보 시간 테스트: PASS.

### 사용자 작업 필요

- 실제 Google Calendar 사용을 위해 `gws auth login` 재인증이 필요하다.
- 재인증 전에도 LogFit과 날씨·Telegram 기능은 기존 fallback으로 계속 작동한다.
- 이후 `gws auth login` 재인증 완료 후 `token_valid: true`를 확인했다.
- `gws calendar +agenda --today --timezone Asia/Seoul` 조회 성공: 오늘 일정 0건.
- `/api/calendar/windows` 응답이 `connected: true`, Google Calendar, 0 events, 기본 운동 후보 시간을 반환했다.

## 2026-11-04 — 1차 상세 기획 PPT 저장

- 산출물: `docs/LogFit_2.0_1차기획안.pptx`
- 구성: 16장
- 범위: 제품 방향, 문제, Agent 원칙, 현재 구현, 사용자 흐름, 날씨 정책, Telegram, 아키텍처, 데이터 모델, Google Calendar, 평가 지표, 범위, 위험 경계, 발표 데모, 2차 검토 결정사항.
- `python-pptx`로 생성 후 슬라이드 수와 주요 텍스트 구조를 재검증했다.
- Git commit·push는 실행하지 않았다.

## 2026-11-05 — Phase 1-1 입력 채널 통합

### 작업 범위

- 입력 판별을 `record / schedule / request / other`로 분리했다.
- 사용자의 미래 계획(`내일 러닝할 거야`, `오늘 저녁에 요가할 예정이야`)은 `schedule`로 분류해 기존 시간 확인 흐름으로 보낸다.
- 계획 생성 요청은 `request`로 분류해 멀티스텝 계획 체인 대기 상태로 보낸다.
- Telegram 라우터와 웹 입력이 같은 LogFit 자연어 파서를 재사용하도록 연결했다.
- 기록 문장은 저장하지 않고 확인 대기 메시지를 생성한다.
- Telegram 판별 결과와 근거를 `decision_log` 이벤트로 저장한다.
- Telegram·웹 기록 표시 앞에 종목별 이모지를 추가했다.

### 검증

- `node tests/logfit-intent.test.js`: PASS.
- `node tests/logfit-telegram-router.test.js`: PASS.
- 기존 Task 2·Task 3·LogFit 2.0·브리지·Calendar·Telegram·날씨 회귀 테스트: 전체 PASS.
- `index.html` 내장 JavaScript 문법 검사: PASS.
- `git diff --check`: PASS.

## 2026-11-05 — Phase 1-2 멀티스텝 계획 체인

### 작업 범위

- Calendar 빈 시간, 날씨 수치, 최근 7일 기록을 순서대로 읽는 계획 체인을 추가했다.
- 제안의 `options`를 문자열이 아닌 `{label, date, time, activity, body_part, duration_min, indoor}` 객체로 저장했다.
- 제안 근거에 캘린더 시간과 기온·강수확률·풍속을 실제 값으로 기록한다.
- Calendar·날씨 실패 시 기본 슬롯과 날씨 미확인 fallback을 사용한다.
- 최근 48시간 같은 근력 부위를 회피하는 규칙을 추가했다.
- 승인 시 plan item ID와 cron ID를 `executed_action`에 기록하는 구조를 추가했다.
- 24시간 무응답 제안을 `none`으로 확정하는 만료 함수를 추가했다.
- 05:30 날씨 알림과 같은 시각의 계획 알림은 기존 날씨 cron ID를 사용해 합치는 판단 함수를 추가했다.
- 계획 승인 저장을 위해 브리지에 `plans`와 `/api/plans`를 추가했다.
- Telegram 계획 요청은 실제 체인 실행 결과와 수치 근거를 포함한 제안 메시지를 생성한다.

### 검증

- 전체 회귀 테스트: PASS.
- 계획 체인 정상 실행·Calendar 실패·날씨 실패 테스트: PASS.
- 제안 객체 구조·수치 근거·48시간 부위 회피·승인 실행 ID·무응답 만료·알림 병합 테스트: PASS.
- `index.html` JavaScript 및 Python hook 문법 검사: PASS.
- `git diff --check`: PASS.

## 2026-11-05 — Phase 1 응답 처리 경로

### 작업 범위

- 가장 최근 대기 중인 suggestion 또는 기록 확인을 Telegram 응답에 매핑한다.
- `1안 승인`, `대안 선택`, `거절`, `저장`, `수정`, `취소` 텍스트 응답을 처리한다.
- 승인 시 plan item 저장, executed_action의 plan item ID·cron ID 기록, 중복 알림 병합 판단을 수행한다.
- 거절 1회는 대안을 재제안하고, 두 번째 거절은 종료한다.
- 같은 suggestion의 중복 응답은 실행하지 않고 이미 처리된 응답으로 반환한다.
- 기록 확인 저장·수정·취소와 대기 없음 응답을 처리한다.
- Gateway hook이 응답 처리 경로를 일반 입력 판별보다 먼저 실행한다.
- fallback 계획의 첫 제안 시간을 06:00으로 고정했다.

### 검증

- 승인·대안·거절 재제안·두 번째 거절·중복 응답·대기 없음·기록 저장 테스트: PASS.
- 실제 임시 Gateway hook 실행에서 계획 제안 후 `1안 승인`이 plan item과 executed_action을 저장하는 것을 확인했다.
- 기존 Task 2·Task 3·LogFit 2.0·브리지 회귀 테스트: PASS.
- 내장 JavaScript 문법 검사와 `git diff --check`: PASS.

## 2026-11-05 — 05:30 알림 병합

### 작업 범위

- 06:00 운동의 알림 시각을 05:30으로 계산한다.
- 기존 날씨 알림 Job `360294886eb8`에 승인된 계획을 합치고 별도 Cron을 생성하지 않는다.
- plan item에 `reminder_at=2026-11-06T05:30:00+09:00`과 `cron_job_id=360294886eb8`을 기록한다.
- 날씨 알림 메시지에 06:00 러닝 계획과 실제 기온·강수·풍속을 함께 표시한다.
- 알림 병합 근거를 `decision_log`에 저장한다.
- 확인 메시지를 `05:30에 알려드릴게요`로 통일한다.

### 검증

- 날씨 알림 병합 테스트: PASS.
- 승인 응답의 plan item reminder·cron ID 테스트: PASS.
- 실제 runtime plan item: `plan-item-1`, 06:00 러닝 30분, 05:30 알림, Job `360294886eb8`.

## 2026-11-05 — 응답자 단일화와 기록 정리

### 작업 범위

- 대기 중인 suggestion·기록 확인 응답은 LogFit 응답 처리기가 먼저 처리한다.
- 대기 중인 것이 없는 일반 문장은 hook이 출력하지 않고 일반 대화 에이전트로 넘긴다.
- 중복 운동 기록 파일을 삭제했다.
- LogFit runtime records를 11월 4일 공복 유산소 5km와 하체 근력운동 60분, 총 2건으로 정리했다.
- 폴링 → Gateway hook → 응답 처리기 승인과 일반 대화 handoff 통합 테스트를 추가했다.

### 검증

- `node tests/logfit-hook-integration.test.js`: PASS.
- 응답·날씨 병합·Task 3·후속 알림 테스트: PASS.
- 실제 11월 4일 records: 2건, 공복 유산소 32.5분·하체 근력운동 60분.
- 최신 hook 설치 후 Gateway 재시작: PASS.

## 2026-11-05 — 코치 에이전트 대시보드 1차 개편

### 작업 범위

- 입력창을 기록·요청 통합 문구로 바꿨다.
- `오늘의 판단 로그`에 결정·근거·도구·상태를 표시한다.
- 승인 대기 suggestion을 `다음 제안` 카드로 표시한다.
- `오늘의 코칭`에 제안 수와 수용 건수·수용률을 표시한다.
- 건강 요약 영역을 하단으로 배치했다.
- 브리지 runtime의 식사·운동 records를 원래 type으로 대시보드에 반영한다.
- 기록 확인 영역 누락으로 초기화가 중단되던 기존 화면 구조를 복구했다.

### 검증

- `node tests/logfit-dashboard.test.js`: PASS.
- 전체 회귀 테스트: PASS.
- 브리지 서버 `http://127.0.0.1:8787/health`: PASS.
- HTTP 화면에서 판단 로그·수용률·11월 4일 92.5분 집계 표시: PASS.
- 공유 브라우저 화면 확인: PASS.

## 2026-11-05 — Google Calendar 인증·브리지 복구

### 원인

- 실제 gws 인증 소스: 로컬 OAuth2 설정 기반.
- 사용자 계정 식별자는 기록하지 않는다.
- 환경변수 access token·credentials 파일은 사용되지 않았다.
- `credentials.enc`에는 Calendar read-only scope가 있었지만, `token_cache.json`의 이전 access token이 재사용되어 403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT`가 발생했다.

### 조치

- 기존 `token_cache.json`을 백업하고 삭제해 새 scope의 access token을 발급하게 했다.
- 브리지를 재시작했다.
- `gws calendar +agenda` 조회 성공을 확인했다.
- `+agenda` 응답의 `events` 형식을 브리지 Calendar 정규화 함수가 읽도록 수정했다.

### 최종 확인

- `/health`: `ok: true`.
- `/api/calendar/windows`: `connected: true`, `source: Google Calendar`, `events_considered: 2`.
- 기존 fallback은 API 오류 시 계속 유지된다.

## 2026-11-05 — 참조 레이아웃 기반 대시보드 교체

### 작업 범위

- `docs/design/dashboard-reference.html`의 CSS 변수·클래스·DOM 구조를 `index.html`에 그대로 적용했다.
- 기존 Daily Wellness Log 히어로, Calendar 별도 카드, 세로 1열 MVP 구조를 제거했다.
- `data-logfit` 지점에 status·판단 로그·다음 제안·주간 계획·균형·제안 통계·메모리·신체 지표를 바인딩했다.
- Telegram과 같은 `/api/responses` 응답 처리기를 대시보드 승인·대안·거절 버튼에 연결했다.
- CSV 내보내기를 제안과 응답 카드 하단으로 이동했다.
- 390px에서 가로 overflow가 없는 것을 확인했다.

### 검증

- 전체 테스트: PASS.
- 1280px 브라우저 확인: PASS.
- 390px 브라우저 확인: PASS.
- 390px `clientWidth=375`, `scrollWidth=375`: PASS.
- 증빙 스크린샷:
  - `docs/evidence/2026-11-06/dashboard-1280.png`
  - `docs/evidence/2026-11-06/dashboard-390.png`

## 2026-11-05 — 3km 러닝 라우팅 보강

### 작업 범위

- `완료·성공·했어·했다·뛰었어·끝냈어·다녀왔어·먹었어·마셨어` 완료 표현과 거리·시간·종목 단어를 기록 후보 판별에 추가했다.
- pending suggestion 여부와 관계없이 운동·식사·휴식 기록은 LogFit parser로 라우팅한다.
- `3km 달리기 성공`을 `러닝 · 3km` 기록 확인 메시지로 변환한다.
- 기존 동일 기록을 중복 저장하지 않도록 확인 저장에 중복 검사를 추가했다.
- 2026-11-05 러닝 기록을 `distance_km=3`, `pace_sec_per_km=420`, `duration_min=21`, `completion=completed`로 runtime에 저장했다.
- 일반 대화 규칙에 운동·식사·휴식 기록을 파일이나 메모리에 저장하지 않는 원칙을 추가했다.
- 잘못 재생성된 중복 운동 기록 파일을 삭제했다.

### 검증

- `3km 달리기 성공` 라우팅 통합 테스트: PASS.
- 일반 문장 hook 미응답 테스트: PASS.
- 05:30 후속 suggestion accepted 상태 확인: PASS.
- 확인 메시지 Telegram 전달 Job `de18ceb1045f`: PASS, 2026-11-05 06:51:36.
- Calendar API 403 해결 확인: `gws calendar +agenda`가 일정 2건을 반환했고 브리지도 `connected=true`.


### 작업 범위

- 주간 실제 칸에서 계획이 없고 운동 기록도 없으면 `휴식`으로 표시한다.
- 계획은 있었지만 실제 기록이 없으면 `미수행`으로 표시한다.
- Telegram 체중·체지방률·근육량 입력을 추가했다.
- 명시 날짜를 `record_date`로 저장하고 확인 후 `body_stats`에 보존한다.
- 대시보드 `나의 변화` 카드가 최신 body_stats를 표시한다.
- 저장 확인 응답은 `기록했어요.` 한 번만 반환한다.

### 검증

- 주간 상태 판정 테스트: PASS.
- body stats 파싱·라우팅·응답 저장 테스트: PASS.
- 임시 Gateway hook 통합 실행: PASS.
- 전체 회귀 테스트: PASS.

## 2026-11-06 — 영어 운동명 인식

### 작업 범위

- Telegram과 웹이 공유하는 입력 판별·문장 파서에 영어 운동명 패턴을 추가했다.
- `animal flow yoga`, `yoga`, `running`, `jogging`, `swimming`, `cycling`, `walking`, `pilates`, `strength`, `workout`, `exercise`, `hiking`, `jump rope` 등을 운동 기록으로 인식한다.
- 명시적인 운동 시간·거리와 운동명이 있으면 완료 표현이 없어도 기록 확인 대상으로 분류한다.
- 미래 계획 표현은 기존처럼 계획 흐름으로 분리한다.

### 검증

- `node tests/logfit-telegram-router.test.js`: PASS.
- 전체 `tests/*.test.js`: PASS.
- `index.html` 내장 JavaScript 문법 검사: PASS.
- 전체 JavaScript 문법 검사와 `git diff --check`: PASS.
- `11월 5일 오후 8시30분 animal flow yoga 50분, 점심은 봉골레 파스타`에서 운동 50분과 점심 식사 1건을 각각 추출하는 것을 확인했다.

## 2026-11-06 — 중간고사 P0/P1 안정성 점검

### 원인과 수정

- Telegram `event_id` 중복 방지와 활성 `pre_gateway_dispatch` 단일 진입 경로를 보강했다.
- Telegram `chat_id`를 대기 작업 소유자로 연결해 다른 대화의 `저장`·`승인`·`취소`가 실행되지 않도록 했다.
- 대기 작업이 여러 개일 때 `저장`·`승인`·`취소`를 임의 작업에 적용하지 않고 대상 확인을 요구하도록 했다.
- Telegram 수신 이벤트를 runtime에 기록해 사용자가 응답하면 05:40·05:50 후속 알림을 중단하도록 했다.
- 동일 예보 시각의 날씨 알림 재실행을 차단했다.
- Calendar 브리지가 systemd 환경의 `node` PATH 누락으로 fallback 처리되던 원인을 수정했다.
- 통증·부상·심한 피로 입력 시 고강도 추천을 보류하고, Calendar 실패·날씨 실패·최근 기록 부족을 근거에 명시했다.
- 대시보드의 하드코딩된 연결 문구를 runtime 판단 로그 수로 바꾸고, 중복 로그 제거·도구별 결과·주간 상태·신체 데이터 출처를 표시하도록 했다.
- 추적 문서와 실행 스크립트에서 개인 절대경로·계정 식별자·Telegram 대상 식별자를 제거하고 Python 캐시를 제외했다.

### 검증

- P0 회귀 테스트: PASS.
- 활성 Gateway plugin fake adapter 통합 테스트: 동일 inbound event 2회 입력 시 `sent_count=1`, 두 번째 결과 `action=skip`, `reason=logfit_duplicate_event`.
- 전체 `tests/*.test.js`: PASS.
- 전체 JavaScript·shell·Python 문법 검사 및 `git diff --check`: PASS.
- 실제 Gateway 재시작 후 `pre_gateway_dispatch registered`, Telegram polling 연결, 4개 기존 Cron active, `cron doctor` 문제 없음 확인.
- 실제 브리지 `/health`: PASS.
- 실제 `/api/calendar/windows`: `connected=true`, Google Calendar, 일정 3건, 운동 가능 시간 44개 확인.
- 실제 Open-Meteo: HTTP 200 및 시간별 응답 구조 확인.
- 실제 대시보드: 데스크톱 overflow 없음, 390px에서 `clientWidth=375`, `scrollWidth=375`, overflow 없음.

### 사용자 승인 대기 또는 미실행

- 실제 Telegram 메시지 발송·수신 확인: NOT TESTED. 사용자 승인 없이 발송하지 않았다.
- 운영 중인 Cron 생성·변경·삭제: 실행하지 않았다.
- 알림 허용 시간·최대 후속 횟수·일시 중지·반복 취소용 사용자 설정 UI: 기존 기능에 없어 제안만 남겼다.
- 선호 자동 학습·선호 수정·삭제: 저장 구조와 UI가 없어 구현 완료로 표시하지 않았다.

