#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

VENV_DIR="$HOME/customer_shipping_venv"

if [ ! -x "$VENV_DIR/bin/python" ]; then
  echo "未找到 $VENV_DIR，请先运行：./setup_mac.sh"
  exit 1
fi

"$VENV_DIR/bin/python" -m app.main
