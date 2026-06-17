# Customer Shipping Settlement Design

## Goal

Build a Windows-first offline desktop application for customer express shipment settlement. The app imports existing customer and price Excel files, stores all data in local SQLite, calculates shipping fees from customer province and parcel weight, and exports daily and monthly settlement workbooks.

## Confirmed Inputs

### Customer Workbook

Source file used for V1 design:

`/Users/chiwang/Desktop/会员资料_加省份完成.xlsx`

Primary sheet:

`拆分结果_加省份`

Columns:

| Excel Column | App Field |
| --- | --- |
| 省份 | province |
| 地名 | city |
| 姓名 | name |
| 电话（必填） | phone |

Import behavior:

- Clean phone numbers by keeping digits only.
- Generate `phone_last4` from the cleaned phone.
- Skip rows missing phone, name, or province.
- Use phone as the duplicate key.
- Let the operator choose skip duplicates or update duplicates.
- Treat `需人工核对省份` as reference data, not automatic customer master data.

### Price Workbook

Source file used for V1 design:

`/Users/chiwang/Downloads/9月20政策调价1.6.xlsx`

Primary sheet:

`价格`

Price rows start at row 6. Mapping:

| Excel Column | App Field |
| --- | --- |
| B | province |
| C | price_1kg |
| D | price_2kg |
| E | price_3kg |
| F | price_4kg |
| G | price_5kg |
| H | price_6kg |
| I | over_base_price |
| J | over_additional_price |

Defaults:

- `over_base_weight_kg = 1`
- `over_additional_unit_kg = 1`

Import stops when the parser reaches section labels such as `首重1KG`, `二、备注说明`, or rows without a province and without price data.

Some provinces only have a 1kg price in the current workbook. The app may import those partial rules, but it must block shipment saving when the requested weight needs a missing price.

## Shipping Calculation

The official V1 rule is confirmed:

`billing_weight_kg = ceil(actual_weight_kg)`

For shipments at or below 6kg:

- `billing_weight_kg <= 1`: use `price_1kg`
- `billing_weight_kg = 2`: use `price_2kg`
- `billing_weight_kg = 3`: use `price_3kg`
- `billing_weight_kg = 4`: use `price_4kg`
- `billing_weight_kg = 5`: use `price_5kg`
- `billing_weight_kg = 6`: use `price_6kg`

For shipments above 6kg:

`shipping_fee = over_base_price + ceil((actual_weight_kg - over_base_weight_kg) / over_additional_unit_kg) * over_additional_price`

Examples:

| Actual Weight | Billing Rule |
| --- | --- |
| 0.7kg | use 1kg price |
| 1.0kg | use 1kg price |
| 1.5kg | use 2kg price |
| 5.5kg | use 6kg price |
| 6.0kg | use 6kg price |
| 6.1kg | use over-6kg rule |

When saving a shipment, persist the actual weight, billing weight, calculated fee, and a JSON price snapshot. Later price changes must not affect historical shipments.

## Architecture

Use a local Python desktop app:

- UI: PySide6
- Database: SQLite
- Excel import/export: openpyxl
- Packaging: PyInstaller
- Tests: pytest

Layering:

- UI pages handle widgets and operator workflows.
- Services hold business rules and validation.
- Repositories own SQL reads and writes.
- Utilities hold pure functions for phone cleaning, date handling, and fee calculation.

## Database

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    phone_last4 TEXT NOT NULL,
    province TEXT NOT NULL,
    city TEXT,
    address TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    remark TEXT
);

CREATE INDEX IF NOT EXISTS idx_customers_phone_last4 ON customers(phone_last4);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE TABLE IF NOT EXISTS shipping_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    province TEXT NOT NULL UNIQUE,
    price_1kg REAL,
    price_2kg REAL,
    price_3kg REAL,
    price_4kg REAL,
    price_5kg REAL,
    price_6kg REAL,
    over_base_weight_kg REAL NOT NULL DEFAULT 1,
    over_base_price REAL,
    over_additional_unit_kg REAL NOT NULL DEFAULT 1,
    over_additional_price REAL,
    remark TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK(over_base_weight_kg > 0),
    CHECK(over_additional_unit_kg > 0)
);

CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ship_date TEXT NOT NULL,
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    province TEXT NOT NULL,
    city TEXT,
    address TEXT,
    actual_weight_kg REAL NOT NULL,
    billing_weight_kg INTEGER NOT NULL,
    shipping_fee REAL NOT NULL,
    price_snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    remark TEXT,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    CHECK(actual_weight_kg > 0),
    CHECK(billing_weight_kg > 0),
    CHECK(shipping_fee >= 0),
    FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(ship_date);
CREATE INDEX IF NOT EXISTS idx_shipments_customer ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_province ON shipments(province);

CREATE TABLE IF NOT EXISTS import_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    sheet_name TEXT,
    total_rows INTEGER NOT NULL,
    inserted_count INTEGER NOT NULL,
    updated_count INTEGER NOT NULL,
    skipped_count INTEGER NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    detail TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

## Pages

### Shipment Entry

Default landing page for daily work:

- Phone last-4 search input.
- Matching customer table.
- Selected customer details.
- Weight input.
- Calculated billing weight and fee.
- Save shipment button.
- Today's shipment table with edit and delete actions.

### Customer Management

- Search by phone last 4, full phone, name, province, and active status.
- Add, edit, deactivate, and delete customers.
- Import customer Excel.
- Export customer Excel.

### Shipping Price Management

- Import the real price Excel format.
- View and edit province prices.
- Export price table.
- Edits affect only future shipments.

### Daily Settlement

- Query by date.
- Show total count, actual weight, billing weight, and fee.
- Show shipment details.
- Show province summary.
- Export daily settlement Excel.

### Monthly Settlement

- Query by month.
- Show monthly totals.
- Show date summary.
- Show province summary.
- Show monthly details.
- Export monthly settlement Excel.

### Backup And Restore

- Automatic backup on startup.
- One automatic backup per day named `backup_YYYY-MM-DD.db`.
- Manual backup named `manual_backup_YYYY-MM-DD_HHMMSS.db`.
- Restore from backup after creating a restore-before backup.

## V1 Scope

Included:

- Offline Windows desktop app.
- Local SQLite database.
- Customer import/export.
- Price import/export.
- Shipment entry.
- Daily and monthly settlement.
- Excel export.
- Automatic and manual backups.

Excluded:

- Permission system.
- Cloud sync.
- Express carrier APIs.
- Waybill printing.
- Mobile app.
- Multi-store aggregation.

