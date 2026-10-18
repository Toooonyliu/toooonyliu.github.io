#!/bin/sh
# Foreground process. Last line MUST be exec.
set -e
cd "$(dirname "$0")"
export APP_PORT="${APP_PORT:-3000}"
export APP_HOSTNAME="${APP_HOSTNAME:-0.0.0.0}"
export NODE_ENV=production
exec node app/server.js
