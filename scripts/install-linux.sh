#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v node >/dev/null || { echo "Node.js 22+ is required."; exit 1; }
command -v npm >/dev/null || { echo "npm is required."; exit 1; }
command -v python3 >/dev/null || { echo "Python 3.12+ is required."; exit 1; }

npm install
npm --prefix ReactDash install
npm --prefix capacitor-wrapper install

python3 -m venv backend/venv
backend/venv/bin/python -m pip install --upgrade pip
backend/venv/bin/python -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "Install complete. Fill .env, then run: npm run dev"
