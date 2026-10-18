#!/bin/sh
# Runs ONCE on the Pod after unzip. Installs runtime deps only. Never build here.
set -e
cd "$(dirname "$0")"
if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then
  echo "[install] step: npm ci"
  npm ci --omit=dev
else
  echo "[install] step: npm install (no lockfile present)"
  npm install --omit=dev --no-audit --no-fund
fi
echo "[install] done"
