#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Start Laravel API
cd "$ROOT/apps/backend"
php artisan serve --host=0.0.0.0 --port=8000 &
BACKEND_PID=$!

# Start Next.js (exposed preview port)
cd "$ROOT/apps/web"
npm run dev -- --hostname 0.0.0.0 --port 3000

trap "kill $BACKEND_PID" EXIT
