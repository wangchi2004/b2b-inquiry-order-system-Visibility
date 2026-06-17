from app.database.connection import connect, initialize_database
from app.services.excel_import_service import parse_customer_workbook, parse_price_workbook
from app.services.customer_service import import_customers
from app.services.price_service import import_prices


CUSTOMER_FILE = "/Users/chiwang/Desktop/会员资料_加省份完成.xlsx"
PRICE_FILE = "/Users/chiwang/Downloads/9月20政策调价1.6.xlsx"


def test_import_customers_inserts_and_updates_by_phone(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)

    first_result = import_customers(
        conn,
        [
            {
                "name": "王驰",
                "phone": "18624090227",
                "phone_last4": "0227",
                "province": "辽宁省",
                "city": "沈阳",
                "address": "",
                "remark": "",
            }
        ],
        duplicate_mode="update",
    )
    second_result = import_customers(
        conn,
        [
            {
                "name": "王驰改",
                "phone": "18624090227",
                "phone_last4": "0227",
                "province": "吉林省",
                "city": "长春",
                "address": "",
                "remark": "",
            }
        ],
        duplicate_mode="update",
    )

    customer = conn.execute("SELECT * FROM customers WHERE phone = ?", ("18624090227",)).fetchone()
    assert first_result == {"inserted": 1, "updated": 0, "skipped": 0}
    assert second_result == {"inserted": 0, "updated": 1, "skipped": 0}
    assert customer["name"] == "王驰改"
    assert customer["province"] == "吉林省"


def test_import_customers_can_skip_duplicates(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)

    row = {
        "name": "王驰",
        "phone": "18624090227",
        "phone_last4": "0227",
        "province": "辽宁省",
        "city": "沈阳",
        "address": "",
        "remark": "",
    }
    import_customers(conn, [row], duplicate_mode="update")
    result = import_customers(conn, [dict(row, name="王驰改")], duplicate_mode="skip")

    customer = conn.execute("SELECT * FROM customers WHERE phone = ?", ("18624090227",)).fetchone()
    assert result == {"inserted": 0, "updated": 0, "skipped": 1}
    assert customer["name"] == "王驰"


def test_import_prices_inserts_and_updates_by_province(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)

    first = {
        "province": "辽宁省",
        "price_1kg": 2.1,
        "price_2kg": 2.5,
        "price_3kg": 3.0,
        "price_4kg": 4.0,
        "price_5kg": 5.0,
        "price_6kg": 6.5,
        "over_base_weight_kg": 1.0,
        "over_base_price": 3.0,
        "over_additional_unit_kg": 1.0,
        "over_additional_price": 1.0,
        "remark": "",
    }

    first_result = import_prices(conn, [first])
    second_result = import_prices(conn, [dict(first, price_1kg=2.2)])

    price = conn.execute("SELECT * FROM shipping_prices WHERE province = ?", ("辽宁省",)).fetchone()
    assert first_result == {"inserted": 1, "updated": 0}
    assert second_result == {"inserted": 0, "updated": 1}
    assert price["price_1kg"] == 2.2


def test_import_real_workbooks_into_sqlite(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)

    customers = parse_customer_workbook(CUSTOMER_FILE)
    prices = parse_price_workbook(PRICE_FILE)
    unique_phone_count = len({row["phone"] for row in customers})
    duplicate_row_count = len(customers) - unique_phone_count
    customer_result = import_customers(conn, customers, duplicate_mode="update")
    price_result = import_prices(conn, prices)

    customer_count = conn.execute("SELECT COUNT(*) AS count FROM customers").fetchone()
    price_count = conn.execute("SELECT COUNT(*) AS count FROM shipping_prices").fetchone()

    assert len(customers) == 14191
    assert unique_phone_count == 13529
    assert duplicate_row_count == 662
    assert customer_result["inserted"] == unique_phone_count
    assert customer_result["updated"] == duplicate_row_count
    assert price_result["inserted"] == 25
    assert customer_count["count"] == unique_phone_count
    assert price_count["count"] == price_result["inserted"]
