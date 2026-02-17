#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

export PATH="$HOME/.local/bin:$PATH"

# Rebuild frontend in case of changes
cd frontend && npx vite build && cd ..

# Start server on 0.0.0.0 (required for Codespaces port forwarding)
cd backend
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
SERVER_PID=$!
cd ..

# Wait for server to be ready
for i in $(seq 1 30); do
  curl -sf http://localhost:8000/api/v1/registers > /dev/null 2>&1 && break
  sleep 0.5
done

# Seed 10-risk workflow demo if no registers exist yet
REGISTER_COUNT=$(curl -sf http://localhost:8000/api/v1/registers | uv run -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
if [ "$REGISTER_COUNT" = "0" ]; then
  echo "Seeding workflow demo (10 risks)..."
  cd backend && uv run .venv/bin/python seed.py && cd ..
fi

wait $SERVER_PID
