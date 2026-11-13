#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v node >/dev/null || { echo "Node.js 22.12+ is required."; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm is required. Install it with: npm install -g pnpm"; exit 1; }
command -v python3 >/dev/null || { echo "Python 3.12+ is required."; exit 1; }

pnpm install

python3 -m venv services/flask-api/venv
services/flask-api/venv/bin/python -m pip install --upgrade pip
services/flask-api/venv/bin/python -m pip install -r services/flask-api/requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "Install complete. Fill .env, then run: pnpm dev"
