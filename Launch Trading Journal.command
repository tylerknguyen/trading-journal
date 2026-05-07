#!/usr/bin/env bash
# macOS double-click launcher for the Trading Journal app.
# Save with the .command extension so Finder runs it in Terminal on double-click.
# If you get "permission denied", run once: chmod +x "Launch Trading Journal.command"

set -e

# Resolve the directory that contains this script (handles symlinks too)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

clear
cat <<'BANNER'

  ============================================
   Trading Journal - http://127.0.0.1:5173
  ============================================

BANNER

# 1. Find a usable Python 3 (prefer 3.11 if available since the Webull SDK supports 3.8-3.11)
PYTHON_BIN=""
for candidate in python3.11 python3.10 python3.9 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PYTHON_BIN="$candidate"
    break
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  echo "Could not find Python 3. Install it from https://www.python.org/downloads/macos/ or run:"
  echo "  brew install python@3.11"
  echo
  read -n1 -r -p "Press any key to close..."
  exit 1
fi

# 2. Create venv on first run, install deps
if [ ! -x ".venv/bin/python" ]; then
  echo "Creating local Python environment ($PYTHON_BIN)..."
  "$PYTHON_BIN" -m venv .venv
  echo "Installing dependencies (first run only)..."
  ./.venv/bin/python -m pip install --upgrade pip >/dev/null 2>&1 || true
  ./.venv/bin/python -m pip install -r requirements.txt
fi

# 3. Open the browser once the server is actually listening (with a 20s timeout)
(
  for _ in $(seq 1 50); do
    if curl -s --max-time 1 http://127.0.0.1:5173/api/health >/dev/null; then
      open "http://127.0.0.1:5173/"
      break
    fi
    sleep 0.4
  done
) &

echo "Server starting. The app will open in your browser shortly."
echo "Press Ctrl+C to stop the server."
echo

# 4. Run the server in the foreground so Ctrl+C cleanly stops it
exec ./.venv/bin/python server.py
