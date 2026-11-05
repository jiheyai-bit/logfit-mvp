#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
export LOGFIT_RUNTIME_DIR="${LOGFIT_RUNTIME_DIR:-$PROJECT_ROOT/.logfit-runtime}"
exec node "$PROJECT_ROOT/scripts/logfit-weekly-goal.js"
