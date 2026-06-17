# 客户快递自动结算软件

本项目是离线本地桌面软件，优先支持 Windows。数据保存在本机 SQLite，支持客户 Excel 导入、价格 Excel 导入、发货录入、每日结算、月度结算和自动备份。

## Run

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m app.main
```

如果 macOS 本地源码运行遇到 Qt platform plugin 提示，优先在 Windows 打包环境验证；本项目目标平台是 Windows，本地源码运行依赖当前 Python/PySide6 的 Qt 插件兼容性。

## macOS Run

macOS 自带的 Command Line Tools Python 可能无法加载图形界面插件。遇到 `Could not find the Qt platform plugin "cocoa"` 时，使用 Homebrew Python。脚本会把虚拟环境建在无空格路径 `~/customer_shipping_venv`，避免 Qt 插件从带空格路径加载失败：

```bash
chmod +x setup_mac.sh run_mac.sh
./setup_mac.sh
./run_mac.sh
```

## Test

```bash
.venv/bin/python -m pytest tests -v
```

## Windows Build

在 Windows 电脑上双击或运行：

```bat
build_windows.bat
```

打包产物在：

```text
dist\
```

默认数据目录：

```text
%LOCALAPPDATA%\CustomerShippingSettlement\
```

也可以通过环境变量覆盖：

```bat
set CUSTOMER_SHIPPING_DATA_DIR=D:\CustomerShippingData
```
