#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

export PATH="$HOME/.local/bin:$PATH"

# Rebuild frontend in case of changes
cd frontend && npx vite build && cd ..

# Start server on 0.0.0.0 (required for Codespaces port forwarding)
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!
cd ..

# Wait for server to be ready
for i in $(seq 1 30); do
  curl -sf http://localhost:8000/api/v1/registers > /dev/null 2>&1 && break
  sleep 0.5
done

# Seed 10-risk workflow demo (only if DB is missing or tiny)
if [ ! -f backend/darpi.db ] || [ "$(stat -c%s backend/darpi.db 2>/dev/null)" -lt 1000 ]; then
  echo "Seeding workflow demo (10 risks)..."
  python3 backend/seed.py
fi

wait $SERVER_PID
