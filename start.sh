#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

# ── Check prerequisites ──────────────────────────────────────────────
check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $1 is required but not installed."
    exit 1
  fi
}

check_cmd python3
check_cmd npm

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
if python3 -c "import sys; exit(0 if sys.version_info >= (3, 12) else 1)" 2>/dev/null; then
  echo "Python $PYTHON_VERSION ✓"
else
  echo "Error: Python 3.12+ required (found $PYTHON_VERSION)"
  exit 1
fi

# ── Backend setup ─────────────────────────────────────────────────────
echo ""
echo "Setting up backend..."
cd backend

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "  Created virtual environment"
fi
source .venv/bin/activate

pip install -q -e . 2>&1 | tail -1
echo "  Backend dependencies installed ✓"

cd ..

# ── Database ─────────────────────────────────────────────────────────
DB_FILE="backend/darpi.db"
SEED_MODE=""
if [ -f "$DB_FILE" ]; then
  echo ""
  echo "Existing database found."
  echo "  1) Keep existing data"
  echo "  2) Start fresh (empty)"
  echo "  3) Start fresh with demo data"
  read -rp "  Choose [1/2/3]: " db_choice
  case "$db_choice" in
    2)
      rm "$DB_FILE"
      echo "  Database deleted — starting empty"
      ;;
    3)
      rm "$DB_FILE"
      SEED_MODE=1
      echo "  Database deleted — will seed demo data"
      ;;
    *)
      echo "  Keeping existing database ✓"
      ;;
  esac
else
  echo ""
  echo "No database found."
  echo "  1) Start empty"
  echo "  2) Start with demo data"
  read -rp "  Choose [1/2]: " db_choice
  case "$db_choice" in
    2)
      SEED_MODE=1
      echo "  Will seed demo data after launch"
      ;;
    *)
      echo "  Starting empty"
      ;;
  esac
fi

# ── Frontend build ────────────────────────────────────────────────────
echo ""
echo "Building frontend..."
cd frontend

npm install --silent 2>&1 | tail -1
echo "  Frontend dependencies installed ✓"

npx vite build 2>&1 | tail -1
echo "  Frontend built ✓"

cd ..

# ── Launch ────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  DARPI is running at: http://localhost:8000"
echo "  Press Ctrl+C to stop"
echo "═══════════════════════════════════════════════════"
echo ""

if [ "$SEED_MODE" = "1" ]; then
  # Start server in background, run seed, then foreground the server
  cd backend
  uvicorn app.main:app --host 127.0.0.1 --port 8000 &
  SERVER_PID=$!
  cd ..

  # Wait for server to be ready
  for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/api/v1/registers > /dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done

  echo "Seeding demo data..."
  python3 backend/seed.py
  echo ""

  # Foreground the server so Ctrl+C works
  wait $SERVER_PID
else
  cd backend
  exec uvicorn app.main:app --host 127.0.0.1 --port 8000
fi
