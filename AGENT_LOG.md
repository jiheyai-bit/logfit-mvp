# AGENT_LOG

## 2026-10-23 — LogFit MVP Task 1

### 작업 범위

- 작업 폴더: `the project root`
- 작업 브랜치: `feat/logfit-mvp-core`
- 공동 프로젝트 `the shared Platen repository`은 작업 대상에서 제외했다.
- GitHub 저장소 생성, 공개 설정, 원격 추가, push, PR은 실행하지 않았다.

### 사람의 지시와 확인

- 개인 프로젝트를 공동 프로젝트와 분리하고 `the project root`에서만 작업하도록 지시받았다.
- `main` 브랜치를 개인 프로젝트의 기준 브랜치로 설정하고, 구현은 기능 브랜치에서 진행하도록 확인했다.
- 현재 오류와 수정 과정을 9주차 평가용 에이전트 작업 기록에 남기도록 요청받았다.

### 에이전트 작업

1. LogFit 설계 문서와 구현 계획을 개인 프로젝트로 복사했다.
2. `the project root`에서 경로와 기존 Git 저장소 여부를 확인한 뒤 Git을 초기화했다.
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
- `the shared Platen repository`은 수정하지 않았고, 원격·push·PR은 실행하지 않았다.

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
