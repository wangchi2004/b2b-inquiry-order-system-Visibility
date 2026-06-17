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

CREATE INDEX IF NOT EXISTS idx_customers_phone_last4
ON customers(phone_last4);

CREATE INDEX IF NOT EXISTS idx_customers_name
ON customers(name);

CREATE INDEX IF NOT EXISTS idx_customers_phone
ON customers(phone);

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

CREATE INDEX IF NOT EXISTS idx_shipments_date
ON shipments(ship_date);

CREATE INDEX IF NOT EXISTS idx_shipments_customer
ON shipments(customer_id);

CREATE INDEX IF NOT EXISTS idx_shipments_province
ON shipments(province);

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
