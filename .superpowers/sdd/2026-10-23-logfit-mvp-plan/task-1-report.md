# Task 1 구현 보고서

## 변경 파일

- `index.html`
  - 단일 파일 안에 LogFit 데이터 모델과 파싱·집계 로직을 추가했다.
  - KST 날짜 해석, 독립 기록 정규화, 대표 상태, 하루·7일 집계를 구현했다.
- `.superpowers/sdd/2026-10-23-logfit-mvp-plan/task-1-report.md`
  - 이 구현 보고서.

## 구현 내용과 결정

- `Asia/Seoul` 기준의 `getKstDate`, `getKstParts`, `addKstDays`, `resolveLogFitDate`를 추가했다. 모든 테스트 가능한 날짜 연산은 명시적인 `now`를 받는다.
- 지원 날짜 표현은 날짜 없음(입력일), `어제`, `그저께`/`그제`, `지난주 월요일`~`지난주 일요일`, `YYYY년 M월 D일` 및 ISO/점 구분 날짜다.
- `주말에`, `며칠 전에`는 날짜를 추정하지 않고 `certainty: "uncertain"`, `record_date: null`로 남긴다.
- 한 문장의 식사·운동·휴식 후보를 각각 독립 record로 만들며, 모든 record가 동일한 정확한 `raw_text`를 공유한다. ID는 record마다 별도로 생성한다.
- 운동 시간은 명시된 분/시간만 변환한다. 운동 종류·식사 시간대·운동 시간이 없으면 빈 문자열/null을 유지한다.
- 미래 활동은 유형과 무관하게 `planned`, 불명확한 날짜/완료 여부는 `uncertain`으로 정규화한다.
- 대표 상태 우선순위는 완료 운동 → 휴식 → 계획 운동 → 확인 필요 → 미기록이다. 식사만 있는 날은 운동 여부를 추정하지 않고 `미기록`으로 둔다.
- 하루·주간 집계는 `record_date`로 필터링한다. 완료 운동만 횟수에 포함하고, 유한한 명시적 운동 시간만 합산하며, 시간 누락 완료 운동은 별도 count로 센다. 주간 결과는 7개 `days`와 호환용 `summaries`, 합계 필드를 함께 제공한다.

## 테스트와 실제 출력

### TDD RED

명령:

```sh
node -e "const fs=require('fs'); if (!fs.existsSync('index.html')) { console.error('FAIL: index.html missing and LogFit functions are unavailable'); process.exit(1); }"
```

실제 출력:

```text
FAIL: index.html missing and LogFit functions are unavailable
```

종료 코드: `1`

### 필수 JavaScript 정적 구문 검사

명령:

```sh
node -e "const fs=require('fs'); const s=fs.readFileSync('index.html','utf8').match(/<script>([\\s\\S]*?)<\\/script>/)[1]; new Function(s); console.log('JavaScript syntax OK')"
```

실제 출력:

```text
JavaScript syntax OK
```

종료 코드: `0`

### 합성 behavioral checks

고정 `now`: `2026-10-23T00:30:00.000Z`

검증 항목: 복합 문장 2식사+1운동, 독립 ID, 원문 보존, 40분 보존, `어제`, `그저께`, `지난주 월요일`, 불명확한 주말, 미래 계획 운동, 하루 집계, 7일 집계, 식사만 있는 날의 대표 상태.

실제 출력:

```text
LogFit Task 1 behavioral checks OK (15 assertions)
```

종료 코드: `0`

추가로 `git diff --check`도 오류 없이 종료했다.

## 우려 사항

- 저장·확인 UI, localStorage, CSV, 브라우저 회귀 검증은 Task 2/3 범위이며 이번 Task 1에는 추가하지 않았다.
- 파서는 명세의 데모 한국어 패턴을 대상으로 하는 결정론적 로컬 파서다. 임의의 자연어 전체를 해석하는 AI 파서는 아니다.
- 첫 behavioral check는 Node `vm`의 다른 realm 배열에 `assert.deepStrictEqual`을 적용해 실패했다. 구현 오류가 아니라 테스트 하니스의 realm 차이였고, JSON/`Array.from` 비교로 같은 15개 검증을 재실행해 통과했다.

## Task 1 리뷰 수정 라운드 1

### 수정 내용

- `parseLogFitSentence`는 입력 문자열을 trim하지 않고 그대로 `rawText`에 반환하며, 각 record의 `raw_text`에도 같은 원문을 저장한다. 날짜 해석과 조각 분리에는 별도의 `parsingSource`를 사용한다.
- `했는지 모르`, `모르겠`, `기억 안`, `아마` 표현을 식사·운동·휴식 모두 `completion: "uncertain"`으로 분류한다. `normalizeLogFitRecord` 직접 호출에도 같은 규칙을 적용하고, 미래 날짜 판정이 불확실성을 `planned`로 덮어쓰지 않게 했다.
- 하루 집계의 식사 수에서도 `uncertain` 기록을 제외했다. 운동 수·시간·시간 누락 수는 기존처럼 완료 운동만 대상으로 하며, 대표 상태는 확인 필요를 유지한다.

### 수정 라운드 검증

- JavaScript 정적 구문 검사: `JavaScript syntax OK` (종료 코드 0)
- 리뷰 수정 behavioral check: `Task 1 review-fix behavioral checks OK (10 assertions)` (종료 코드 0)
- 확인 범위: 공백 포함 원문 보존, 모든 record 원문 보존, 식사·운동·휴식 불확실성 분류, 불확실 기록 집계 제외, 직접 정규화 불확실성 분류.

### 수정 라운드 우려 사항

- 기존 범위와 동일하게 저장 UI, localStorage, CSV 및 브라우저 회귀 검증은 Task 2/3 범위다.

## Task 1 리뷰 수정 라운드 2

### 수정 내용

- 불확실성 판정에 사용하는 `completionSource`를 현재 record 조각으로 분리했다. 파서는 각 독립 record에 `source_fragment`를 내부 전달하고, 출력 schema에는 포함하지 않는다.
- 따라서 `아침 밥 먹었어, 운동 했는지 모르`는 식사를 `completed`, 운동만 `uncertain`으로 유지한다.
- 모든 record의 `raw_text`와 parser의 `rawText`는 입력 원문을 그대로 보존한다. 직접 `normalizeLogFitRecord` 호출은 기존처럼 해당 record의 `raw_text`를 판정 source로 사용한다.

### 수정 라운드 검증

- JavaScript 정적 구문 검사: `JavaScript syntax OK` (종료 코드 0)
- mixed-source behavioral check: `Task 1 mixed-source behavioral checks OK (12 assertions)` (종료 코드 0)
- `git diff --check`: 오류 없음 (종료 코드 0)
- 확인 범위: 혼합 식사·운동 불확실성 분리, 모든 record 원문 보존, 대표 상태, 직접 정규화, 불확실 운동의 하루 집계 제외.

### 수정 라운드 2 우려 사항

- 저장 UI, localStorage, CSV 및 브라우저 회귀 검증은 기존과 같이 Task 2/3 범위다.
