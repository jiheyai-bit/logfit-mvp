# LogFit MVP

LogFit is a local, single-file wellness logging demo. It parses a Korean sentence into meal, exercise, and rest records, shows an editable confirmation step, stores confirmed synthetic/demo records in browser `localStorage`, and summarizes the latest seven record dates.

## Scope

- Natural-language meal, exercise, rest, planned, and uncertain states
- KST (`Asia/Seoul`) record-date handling
- Confirmation before persistence
- Daily summary and seven-day aggregation
- CSV export for verification
- No server, account, API key, or external runtime dependency

This repository contains synthetic fixtures only. Do not add personal health records, secrets, tokens, or API keys.

## Run locally

1. Open `index.html` directly in a browser, or serve this directory with any static file server.
2. Enter a sentence such as `아침 샐러드, 점심 김치찌개, 저녁 요가 40분`.
3. Check the extracted cards, then click `확인한 기록 저장`.
4. Refresh the page to verify confirmed records and the seven-day report remain.
5. Use the `Platen` switch to confirm the adjacent placeholder view is reachable.

The browser stores demo data under `logfit.records.v1`. To reset the demo, clear site data/local storage for the local file in browser developer tools.

## Reproducible checks

No package installation is required. From the repository root:

```bash
node --check tests/task2.test.js
node --check tests/task3.test.js
node tests/task2.test.js
node tests/task3.test.js
node -e "const fs=require('fs'); const h=fs.readFileSync('index.html','utf8'); const s=h.match(/<script>([\\s\\S]*?)<\\/script>/)[1]; new Function(s); console.log('PASS index.html embedded JavaScript syntax')"
git diff --check
```

`tests/fixtures/task3-fixtures.json` fixes the reference timestamp and synthetic records so parser, date, state, weekly, and persistence checks are repeatable. The browser verification record is in [`docs/verification-results.md`](docs/verification-results.md).

## Files

- `index.html` — complete static application
- `tests/task2.test.js` — persistence/dashboard checks from Task 2
- `tests/task3.test.js` — Task 3 synthetic regression checks
- `tests/fixtures/task3-fixtures.json` — deterministic synthetic inputs
- `docs/verification-results.md` — browser and static verification evidence
- `.env.example` — non-secret configuration examples; no environment variables are required at runtime

## Limitations

This is a local demo, not medical software. Parsing is deterministic and intentionally limited; unclear dates or completion states require user confirmation rather than inference. Future planned exercise is not included in completed exercise totals.
