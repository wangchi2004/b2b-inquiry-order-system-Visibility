#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v brew >/dev/null 2>&1; then
  echo "未找到 Homebrew。请先安装 Homebrew: https://brew.sh/"
  exit 1
fi

PYTHON=""

BREW_PREFIX="$(brew --prefix)"

for candidate in \
  "$BREW_PREFIX/opt/python@3.12/bin/python3.12" \
  "$BREW_PREFIX/bin/python3.12" \
  "$BREW_PREFIX/bin/python3" \
  "/usr/local/opt/python@3.12/bin/python3.12" \
  "/usr/local/bin/python3.12" \
  "/usr/local/bin/python3"
do
  if [ -x "$candidate" ]; then
    PYTHON="$candidate"
    break
  fi
done

if [ -z "$PYTHON" ]; then
  echo "正在安装 Homebrew Python 3.12 ..."
  HOMEBREW_NO_AUTO_UPDATE=1 brew install python@3.12
  PYTHON="$(brew --prefix)/opt/python@3.12/bin/python3.12"
fi

if [ ! -x "$PYTHON" ]; then
  echo "未找到可用的 Homebrew Python。请运行：HOMEBREW_NO_AUTO_UPDATE=1 brew install python@3.12"
  exit 1
fi

echo "使用 Python: $PYTHON"
"$PYTHON" --version

VENV_DIR="$HOME/customer_shipping_venv"

rm -rf "$VENV_DIR"
"$PYTHON" -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/python" -m pip install -r requirements.txt

echo
echo "Mac 运行环境已创建完成。下一步运行："
echo "./run_mac.sh"
