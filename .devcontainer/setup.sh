#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# Backend deps
cd backend && uv sync && cd ..

# Frontend build (CRITICAL — dist/ is gitignored)
cd frontend && npm install && npm run build && cd ..
