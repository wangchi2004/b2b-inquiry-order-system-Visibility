# Customer Shipping Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working local desktop version of the customer express settlement app, using the real customer and price Excel formats already inspected.

**Architecture:** Create a new Python desktop application under `customer_shipping_settlement/` without disturbing the existing web project in the repository root. Keep business logic in small service and utility modules so fee calculation, Excel import, backup, and settlement summaries can be tested without launching the GUI.

**Tech Stack:** Python 3, PySide6, SQLite, openpyxl, pytest, PyInstaller.

---

## File Structure

Create these files:

- `customer_shipping_settlement/requirements.txt`: runtime and test dependencies.
- `customer_shipping_settlement/README.md`: local run, test, and build instructions.
- `customer_shipping_settlement/app/__init__.py`: package marker.
- `customer_shipping_settlement/app/main.py`: application entry point.
- `customer_shipping_settlement/app/config.py`: data directories and file paths.
- `customer_shipping_settlement/app/database/schema.sql`: SQLite schema.
- `customer_shipping_settlement/app/database/connection.py`: database connection and initialization.
- `customer_shipping_settlement/app/repositories/customer_repository.py`: customer SQL operations.
- `customer_shipping_settlement/app/repositories/price_repository.py`: shipping price SQL operations.
- `customer_shipping_settlement/app/repositories/shipment_repository.py`: shipment SQL operations.
- `customer_shipping_settlement/app/services/customer_service.py`: customer validation and import persistence.
- `customer_shipping_settlement/app/services/price_service.py`: price validation and import persistence.
- `customer_shipping_settlement/app/services/shipment_service.py`: shipment creation and fee snapshot behavior.
- `customer_shipping_settlement/app/services/settlement_service.py`: daily and monthly summaries.
- `customer_shipping_settlement/app/services/excel_import_service.py`: customer and price workbook parsing.
- `customer_shipping_settlement/app/services/excel_export_service.py`: customer, daily, and monthly exports.
- `customer_shipping_settlement/app/services/backup_service.py`: automatic, manual, and restore backups.
- `customer_shipping_settlement/app/utils/phone.py`: phone cleaning and last-4 helpers.
- `customer_shipping_settlement/app/utils/shipping_fee.py`: pure shipping fee calculation.
- `customer_shipping_settlement/app/ui/main_window.py`: main shell with left navigation.
- `customer_shipping_settlement/app/ui/shipment_page.py`: shipment entry page.
- `customer_shipping_settlement/app/ui/customer_page.py`: customer management page.
- `customer_shipping_settlement/app/ui/price_page.py`: price management page.
- `customer_shipping_settlement/app/ui/daily_settlement_page.py`: daily settlement page.
- `customer_shipping_settlement/app/ui/monthly_settlement_page.py`: monthly settlement page.
- `customer_shipping_settlement/app/ui/import_export_page.py`: import/export page.
- `customer_shipping_settlement/app/ui/backup_page.py`: backup and restore page.
- `customer_shipping_settlement/tests/test_phone.py`: phone helper tests.
- `customer_shipping_settlement/tests/test_shipping_fee.py`: fee calculation tests.
- `customer_shipping_settlement/tests/test_excel_import.py`: real-format workbook parser tests.
- `customer_shipping_settlement/tests/test_repositories.py`: SQLite persistence tests.
- `customer_shipping_settlement/tests/test_settlement.py`: summary query tests.

## Task 1: Project Skeleton

**Files:**

- Create: `customer_shipping_settlement/requirements.txt`
- Create: `customer_shipping_settlement/README.md`
- Create: package directories and empty `__init__.py` files.

- [ ] **Step 1: Create directories**

Run:

```bash
mkdir -p customer_shipping_settlement/app/{database,repositories,services,ui,utils} customer_shipping_settlement/tests
touch customer_shipping_settlement/app/__init__.py
```

Expected: directories exist.

- [ ] **Step 2: Add dependencies**

Write `customer_shipping_settlement/requirements.txt`:

```text
PySide6>=6.7
openpyxl>=3.1
pytest>=8.0
pyinstaller>=6.0
```

- [ ] **Step 3: Add README**

Write `customer_shipping_settlement/README.md`:

```markdown
# 客户快递自动结算软件

本项目是离线本地桌面软件，优先支持 Windows。数据保存在本机 SQLite，支持客户 Excel 导入、价格 Excel 导入、发货录入、每日结算、月度结算和自动备份。

## Run

```bash
python -m app.main
```

## Test

```bash
pytest
```
```

- [ ] **Step 4: Commit**

```bash
git add customer_shipping_settlement/requirements.txt customer_shipping_settlement/README.md customer_shipping_settlement/app/__init__.py
git commit -m "chore: scaffold shipping settlement app"
```

## Task 2: Phone Utilities

**Files:**

- Create: `customer_shipping_settlement/app/utils/phone.py`
- Test: `customer_shipping_settlement/tests/test_phone.py`

- [ ] **Step 1: Write failing tests**

```python
from app.utils.phone import clean_phone, phone_last4


def test_clean_phone_keeps_digits_only():
    assert clean_phone("电话: 186-2409-0227") == "18624090227"


def test_phone_last4_returns_last_four_digits():
    assert phone_last4("18624090227") == "0227"


def test_phone_last4_handles_short_values():
    assert phone_last4("123") == "123"
```

- [ ] **Step 2: Run tests and confirm failure**

Run from `customer_shipping_settlement/`:

```bash
pytest tests/test_phone.py -v
```

Expected: import fails because `app.utils.phone` does not exist.

- [ ] **Step 3: Implement utility**

```python
import re


def clean_phone(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\D+", "", str(value))


def phone_last4(phone: str) -> str:
    return phone[-4:]
```

- [ ] **Step 4: Verify**

```bash
pytest tests/test_phone.py -v
```

Expected: 3 passed.

## Task 3: Shipping Fee Calculator

**Files:**

- Create: `customer_shipping_settlement/app/utils/shipping_fee.py`
- Test: `customer_shipping_settlement/tests/test_shipping_fee.py`

- [ ] **Step 1: Write failing tests**

```python
import pytest

from app.utils.shipping_fee import PriceRule, calculate_shipping_fee


def sample_rule():
    return PriceRule(
        province="辽宁省",
        price_1kg=2.1,
        price_2kg=2.5,
        price_3kg=3.0,
        price_4kg=4.0,
        price_5kg=5.0,
        price_6kg=6.5,
        over_base_weight_kg=1.0,
        over_base_price=3.0,
        over_additional_unit_kg=1.0,
        over_additional_price=1.0,
    )


@pytest.mark.parametrize(
    ("actual_weight", "billing_weight", "fee"),
    [
        (0.7, 1, 2.1),
        (1.0, 1, 2.1),
        (1.5, 2, 2.5),
        (5.5, 6, 6.5),
        (6.0, 6, 6.5),
        (6.1, 7, 9.0),
    ],
)
def test_calculates_fee(actual_weight, billing_weight, fee):
    result = calculate_shipping_fee(actual_weight, sample_rule())
    assert result.billing_weight_kg == billing_weight
    assert result.shipping_fee == fee


def test_rejects_zero_weight():
    with pytest.raises(ValueError, match="重量必须大于0"):
        calculate_shipping_fee(0, sample_rule())


def test_rejects_missing_tier_price():
    rule = sample_rule()
    rule.price_2kg = None
    with pytest.raises(ValueError, match="缺少2kg价格"):
        calculate_shipping_fee(1.5, rule)
```

- [ ] **Step 2: Implement calculator**

```python
from dataclasses import asdict, dataclass
from math import ceil


@dataclass
class PriceRule:
    province: str
    price_1kg: float | None
    price_2kg: float | None
    price_3kg: float | None
    price_4kg: float | None
    price_5kg: float | None
    price_6kg: float | None
    over_base_weight_kg: float
    over_base_price: float | None
    over_additional_unit_kg: float
    over_additional_price: float | None

    def snapshot(self) -> dict:
        return asdict(self)


@dataclass
class ShippingFeeResult:
    actual_weight_kg: float
    billing_weight_kg: int
    shipping_fee: float
    price_snapshot: dict


def calculate_shipping_fee(actual_weight_kg: float, rule: PriceRule) -> ShippingFeeResult:
    if actual_weight_kg <= 0:
        raise ValueError("重量必须大于0")

    billing_weight = ceil(actual_weight_kg)
    tier_prices = {
        1: rule.price_1kg,
        2: rule.price_2kg,
        3: rule.price_3kg,
        4: rule.price_4kg,
        5: rule.price_5kg,
        6: rule.price_6kg,
    }

    if billing_weight <= 6:
        price = tier_prices[billing_weight]
        if price is None:
            raise ValueError(f"该省份缺少{billing_weight}kg价格")
        fee = float(price)
    else:
        if rule.over_base_price is None or rule.over_additional_price is None:
            raise ValueError("该省份缺少6kg以上价格")
        extra_units = ceil((actual_weight_kg - rule.over_base_weight_kg) / rule.over_additional_unit_kg)
        fee = float(rule.over_base_price) + extra_units * float(rule.over_additional_price)

    return ShippingFeeResult(
        actual_weight_kg=actual_weight_kg,
        billing_weight_kg=billing_weight,
        shipping_fee=round(fee, 2),
        price_snapshot=rule.snapshot(),
    )
```

- [ ] **Step 3: Verify**

```bash
pytest tests/test_shipping_fee.py -v
```

Expected: all tests pass.

## Task 4: SQLite Schema And Connection

**Files:**

- Create: `customer_shipping_settlement/app/config.py`
- Create: `customer_shipping_settlement/app/database/schema.sql`
- Create: `customer_shipping_settlement/app/database/connection.py`

- [ ] **Step 1: Add schema**

Copy the SQL from `docs/superpowers/specs/2026-06-12-customer-shipping-settlement-design.md` into `app/database/schema.sql`.

- [ ] **Step 2: Add config**

```python
from pathlib import Path


APP_NAME = "CustomerShippingSettlement"
PROJECT_ROOT = Path(__file__).resolve().parents[1]
LOCAL_DATA_DIR = PROJECT_ROOT / "data"
DATABASE_PATH = LOCAL_DATA_DIR / "app.db"
BACKUP_DIR = LOCAL_DATA_DIR / "backups"
EXPORT_DIR = LOCAL_DATA_DIR / "exports"
LOG_DIR = LOCAL_DATA_DIR / "logs"
```

- [ ] **Step 3: Add connection manager**

```python
import sqlite3
from pathlib import Path


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize_database(conn: sqlite3.Connection, schema_path: Path) -> None:
    sql = schema_path.read_text(encoding="utf-8")
    conn.executescript(sql)
    conn.commit()
```

## Task 5: Excel Import Parsers

**Files:**

- Create: `customer_shipping_settlement/app/services/excel_import_service.py`
- Test: `customer_shipping_settlement/tests/test_excel_import.py`

- [ ] **Step 1: Write tests against real files**

```python
from pathlib import Path

from app.services.excel_import_service import parse_customer_workbook, parse_price_workbook


CUSTOMER_FILE = Path("/Users/chiwang/Desktop/会员资料_加省份完成.xlsx")
PRICE_FILE = Path("/Users/chiwang/Downloads/9月20政策调价1.6.xlsx")


def test_parse_customer_workbook_reads_known_first_row():
    rows = parse_customer_workbook(CUSTOMER_FILE)
    first = rows[0]
    assert first["province"] == "辽宁省"
    assert first["city"] == "沈阳"
    assert first["name"] == "王驰"
    assert first["phone"] == "18624090227"
    assert first["phone_last4"] == "0227"


def test_parse_price_workbook_reads_liaoning_rule():
    rows = parse_price_workbook(PRICE_FILE)
    liaoning = next(row for row in rows if row["province"] == "辽宁省")
    assert liaoning["price_1kg"] == 2.1
    assert liaoning["price_2kg"] == 2.5
    assert liaoning["price_6kg"] == 6.5
    assert liaoning["over_base_price"] == 3
    assert liaoning["over_additional_price"] == 1
```

- [ ] **Step 2: Implement parsers**

```python
from pathlib import Path

from openpyxl import load_workbook

from app.utils.phone import clean_phone, phone_last4


def parse_customer_workbook(path: Path) -> list[dict]:
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb["拆分结果_加省份"]
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        province, city, name, phone_value = row[:4]
        phone = clean_phone(phone_value)
        if not phone or not name or not province:
            continue
        rows.append(
            {
                "province": str(province).strip(),
                "city": "" if city is None else str(city).strip(),
                "name": str(name).strip(),
                "phone": phone,
                "phone_last4": phone_last4(phone),
                "address": "",
                "remark": "",
            }
        )
    return rows


def _number(value):
    if value is None or value == "":
        return None
    return float(value)


def parse_price_workbook(path: Path) -> list[dict]:
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb["价格"]
    rows = []
    for row in ws.iter_rows(min_row=6, values_only=True):
        province = row[1]
        if province in ("首重1KG", "二、备注说明"):
            break
        if province is None:
            continue
        rows.append(
            {
                "province": str(province).strip(),
                "price_1kg": _number(row[2]),
                "price_2kg": _number(row[3]),
                "price_3kg": _number(row[4]),
                "price_4kg": _number(row[5]),
                "price_5kg": _number(row[6]),
                "price_6kg": _number(row[7]),
                "over_base_weight_kg": 1.0,
                "over_base_price": _number(row[8]),
                "over_additional_unit_kg": 1.0,
                "over_additional_price": _number(row[9]),
                "remark": "",
            }
        )
    return rows
```

## Task 6: Repositories And Import Persistence

**Files:**

- Create repository files under `customer_shipping_settlement/app/repositories/`
- Create service files `customer_service.py` and `price_service.py`
- Test: `customer_shipping_settlement/tests/test_repositories.py`

- [ ] **Step 1: Implement customer upsert**

Use SQL:

```sql
INSERT INTO customers (name, phone, phone_last4, province, city, address, remark, created_at, updated_at)
VALUES (:name, :phone, :phone_last4, :province, :city, :address, :remark, :now, :now)
ON CONFLICT(phone) DO UPDATE SET
    name = excluded.name,
    phone_last4 = excluded.phone_last4,
    province = excluded.province,
    city = excluded.city,
    address = excluded.address,
    remark = excluded.remark,
    updated_at = excluded.updated_at;
```

- [ ] **Step 2: Implement price upsert**

Use SQL:

```sql
INSERT INTO shipping_prices (
    province, price_1kg, price_2kg, price_3kg, price_4kg, price_5kg, price_6kg,
    over_base_weight_kg, over_base_price, over_additional_unit_kg, over_additional_price,
    remark, created_at, updated_at
)
VALUES (
    :province, :price_1kg, :price_2kg, :price_3kg, :price_4kg, :price_5kg, :price_6kg,
    :over_base_weight_kg, :over_base_price, :over_additional_unit_kg, :over_additional_price,
    :remark, :now, :now
)
ON CONFLICT(province) DO UPDATE SET
    price_1kg = excluded.price_1kg,
    price_2kg = excluded.price_2kg,
    price_3kg = excluded.price_3kg,
    price_4kg = excluded.price_4kg,
    price_5kg = excluded.price_5kg,
    price_6kg = excluded.price_6kg,
    over_base_weight_kg = excluded.over_base_weight_kg,
    over_base_price = excluded.over_base_price,
    over_additional_unit_kg = excluded.over_additional_unit_kg,
    over_additional_price = excluded.over_additional_price,
    remark = excluded.remark,
    updated_at = excluded.updated_at;
```

- [ ] **Step 3: Add search queries**

Customer search SQL:

```sql
SELECT * FROM customers
WHERE is_active = 1
  AND (:phone_last4 IS NULL OR phone_last4 = :phone_last4)
  AND (:phone IS NULL OR phone = :phone)
  AND (:name IS NULL OR name LIKE '%' || :name || '%')
ORDER BY updated_at DESC, id DESC
LIMIT 200;
```

## Task 7: Shipment Service

**Files:**

- Create: `customer_shipping_settlement/app/services/shipment_service.py`
- Create: `customer_shipping_settlement/app/repositories/shipment_repository.py`

- [ ] **Step 1: Create shipment flow**

`ShipmentService.create_shipment(customer_id, actual_weight_kg, ship_date, remark)` must:

- Load active customer.
- Load price rule by customer province.
- Raise `ValueError("该省份没有价格规则")` when missing.
- Call `calculate_shipping_fee`.
- Save customer snapshot, actual weight, billing weight, fee, and JSON price snapshot.

- [ ] **Step 2: Save shipment SQL**

```sql
INSERT INTO shipments (
    ship_date, customer_id, customer_name, customer_phone, province, city, address,
    actual_weight_kg, billing_weight_kg, shipping_fee, price_snapshot,
    created_at, updated_at, remark
)
VALUES (
    :ship_date, :customer_id, :customer_name, :customer_phone, :province, :city, :address,
    :actual_weight_kg, :billing_weight_kg, :shipping_fee, :price_snapshot,
    :now, :now, :remark
);
```

## Task 8: Settlement Queries

**Files:**

- Create: `customer_shipping_settlement/app/services/settlement_service.py`
- Test: `customer_shipping_settlement/tests/test_settlement.py`

- [ ] **Step 1: Daily details**

```sql
SELECT *
FROM shipments
WHERE ship_date = :ship_date
  AND is_deleted = 0
ORDER BY created_at ASC, id ASC;
```

- [ ] **Step 2: Daily province summary**

```sql
SELECT province,
       COUNT(*) AS shipment_count,
       SUM(actual_weight_kg) AS total_actual_weight,
       SUM(billing_weight_kg) AS total_billing_weight,
       SUM(shipping_fee) AS total_fee
FROM shipments
WHERE ship_date = :ship_date
  AND is_deleted = 0
GROUP BY province
ORDER BY total_fee DESC;
```

- [ ] **Step 3: Monthly date summary**

```sql
SELECT ship_date,
       COUNT(*) AS shipment_count,
       SUM(actual_weight_kg) AS total_actual_weight,
       SUM(billing_weight_kg) AS total_billing_weight,
       SUM(shipping_fee) AS total_fee
FROM shipments
WHERE ship_date >= :start_date
  AND ship_date < :end_date
  AND is_deleted = 0
GROUP BY ship_date
ORDER BY ship_date ASC;
```

## Task 9: Excel Exports

**Files:**

- Create: `customer_shipping_settlement/app/services/excel_export_service.py`

- [ ] **Step 1: Export customer workbook**

Create columns:

```text
客户ID, 姓名, 电话, 电话后4位, 省份, 城市, 地址, 状态, 备注, 创建时间, 更新时间
```

- [ ] **Step 2: Export daily settlement workbook**

Create sheets:

```text
每日总览
发货明细
省份汇总
```

- [ ] **Step 3: Export monthly settlement workbook**

Create sheets:

```text
月度总览
按日期汇总
按省份汇总
发货明细
```

## Task 10: Backup Service

**Files:**

- Create: `customer_shipping_settlement/app/services/backup_service.py`

- [ ] **Step 1: Implement startup backup**

Rules:

- If `app.db` does not exist, do nothing.
- If `backups/backup_YYYY-MM-DD.db` exists, do nothing.
- Otherwise copy `app.db` to that path.

- [ ] **Step 2: Implement manual backup**

Create `manual_backup_YYYY-MM-DD_HHMMSS.db`.

- [ ] **Step 3: Implement restore**

Before restore, copy current DB to `restore_before_YYYY-MM-DD_HHMMSS.db`, then replace `app.db` with the selected backup.

## Task 11: PySide6 UI

**Files:**

- Create all files under `customer_shipping_settlement/app/ui/`
- Create: `customer_shipping_settlement/app/main.py`

- [ ] **Step 1: Main window**

Create a left navigation list with pages:

```text
发货录入
客户管理
快递价格
每日结算
月度结算
Excel 导入导出
备份恢复
```

- [ ] **Step 2: Shipment page**

Include:

- phone last-4 input
- matching customer table
- selected customer details
- actual weight input
- calculated billing weight and fee
- save button
- today's shipment table

- [ ] **Step 3: Management and settlement pages**

Use simple `QTableWidget` or `QTableView` pages for V1. Prioritize correct workflows over visual polish.

## Task 12: Packaging

**Files:**

- Create: `customer_shipping_settlement/build_windows.spec`

- [ ] **Step 1: Verify tests**

```bash
pytest
```

Expected: all tests pass.

- [ ] **Step 2: Build Windows executable**

```bash
pyinstaller build_windows.spec
```

Expected: app starts on Windows without Python installed.

## Self-Review

Spec coverage:

- Customer import is covered by Tasks 2, 5, and 6.
- Price import and real price format are covered by Tasks 3, 5, and 6.
- Shipment calculation and history snapshots are covered by Tasks 3 and 7.
- Daily and monthly settlement are covered by Task 8.
- Excel exports are covered by Task 9.
- Backups are covered by Task 10.
- Desktop UI is covered by Task 11.
- Windows packaging is covered by Task 12.

Known implementation choice:

- The first implementation should live in `customer_shipping_settlement/` so it does not interfere with the existing web files in the repository root.

