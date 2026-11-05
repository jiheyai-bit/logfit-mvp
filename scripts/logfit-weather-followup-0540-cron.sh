#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
export LOGFIT_RUNTIME_DIR="${LOGFIT_RUNTIME_DIR:-$PROJECT_ROOT/.logfit-runtime}"
export LOGFIT_FOLLOWUP_NUMBER=1
exec node "$PROJECT_ROOT/scripts/logfit-weather-followup.js"
