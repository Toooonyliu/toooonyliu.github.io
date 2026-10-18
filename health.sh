#!/bin/sh
# Loopback health check; the platform injects APP_PORT (do not hardcode 3000).
curl -fsS -o /dev/null --max-time 3 "http://127.0.0.1:${APP_PORT:-3000}/health" || exit 1
