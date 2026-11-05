# LogFit 2.0 검증 증빙

기준일: 2026-11-04 (KST)
브랜치: `feat/logfit-2-agent`

## 구현 범위

- 미래 운동 계획과 완료 운동 분리
- 시간이 없는 `오늘 저녁에 요가할 거야` 입력은 시각을 추측하지 않고 확인 요청
- 명시적 운동 시각 추출
- 서울 기본 위치의 Open-Meteo 시간별 예보 조회
- 러닝 중 비 예보 시 실내 운동 또는 시간 변경 제안
- 날씨 API 실패 시 원래 계획 유지
- 승인된 일정의 로컬 저장
- 같은 계획 반복 승인 시 `schedule_id` 중복 생성 방지
- Telegram Cron 등록 승인 가드 스크립트
- 로컬 일정·개입 이벤트 브리지

## 테스트 결과

| 테스트 | 입력/조건 | 실제 결과 | 결과 | 증빙 |
|---|---|---|---|---|
| T1 | `오늘 저녁에 요가할 거야` | `planned`, 요가, `planned_start_at=null`, `awaiting_time_confirmation` | PASS | `tests/logfit2.test.js` |
| T2 | `오늘 19시에 러닝할 거야` | KST 19:00으로 추출, `awaiting_user_approval` | PASS | `tests/logfit2.test.js` |
| T3 | 비 확률 80%, 러닝 | `indoor_alternative`, `rain_expected` | PASS | `tests/logfit2.test.js` |
| T4 | 날씨 응답 없음 | `weather_unavailable`, 원래 계획 유지 | PASS | `tests/logfit2.test.js` |
| T5 | 계획 운동 완료 전 | 완료 기록 0건 | PASS | `tests/logfit2.test.js` |
| T6 | 동일 일정 완료 응답 2회 | 실제 운동 기록 1건 | PASS | `tests/logfit2.test.js` |
| T7 | 로컬 브리지 일정 저장 | 필수 일정·알림 필드 저장 | PASS | `tests/logfit2-bridge.test.js` |
| T8 | Telegram 등록 승인값 없음 | 종료 코드 2, Cron 생성 차단 | PASS | `scripts/register-telegram-test.sh` 실행 결과 |
| T9 | 브라우저에서 동일 일정 2회 승인 | `logfit.schedules.v1` 일정 1건 | PASS | 브라우저 DOM/localStorage 확인 |
| T10 | 실제 Open-Meteo 조회 | `Open-Meteo`, `서울(기본값)`, 날씨 제안 표시 | PASS | 브라우저 확인 |
| T11 | 기존 Task 2 회귀 | 8개 PASS | PASS | `node tests/task2.test.js` |
| T12 | 기존 Task 3 회귀 | 전체 PASS | PASS | `node tests/task3.test.js` |
| T13 | 내장 JS 문법 | PASS | PASS | Node `new Function` 검사 |
| T14 | 공백 오류 | `git diff --check` 통과 | PASS | 터미널 실행 결과 |

## Telegram 현재 상태

- `dev` 프로필을 standalone Gateway로 실행
- Telegram polling 연결: 정상
- 일회성 Cron Job: `eded8764d7fb`
- 실행 상태: `completed`
- 사용자가 Telegram에서 테스트 메시지 수신을 확인함
- 첫 실제 Telegram 전송 검증: PASS

Bot 토큰은 로그·코드·문서에 기록하지 않는다.
