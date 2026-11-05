#!/usr/bin/env bash
set -euo pipefail

: "${LOGFIT_APPROVE_TELEGRAM:=}"
: "${LOGFIT_TELEGRAM_CHAT_ID:=}"
: "${LOGFIT_SCHEDULE_AT:=}"
: "${LOGFIT_MESSAGE:=LogFit 테스트 알림입니다.}"
: "${LOGFIT_CRON_NAME:=LogFit one-shot Telegram test}"

if [[ "${LOGFIT_APPROVE_TELEGRAM}" != "YES" ]]; then
  printf '%s\n' 'Refusing Telegram Cron registration: set LOGFIT_APPROVE_TELEGRAM=YES only after user approval.' >&2
  exit 2
fi
if [[ -z "${LOGFIT_TELEGRAM_CHAT_ID}" || -z "${LOGFIT_SCHEDULE_AT}" ]]; then
  printf '%s\n' 'Usage requires LOGFIT_TELEGRAM_CHAT_ID and LOGFIT_SCHEDULE_AT.' >&2
  exit 2
fi

schedule_id="${LOGFIT_SCHEDULE_ID:-schedule-$(date +%s)}"
hermes cron create "${LOGFIT_SCHEDULE_AT}" "${LOGFIT_MESSAGE}" \
  --name "${LOGFIT_CRON_NAME}" \
  --deliver "telegram:${LOGFIT_TELEGRAM_CHAT_ID}"
printf '%s\n' "Cron registration requested for ${schedule_id}. Read back 'hermes cron list' before claiming success." 
