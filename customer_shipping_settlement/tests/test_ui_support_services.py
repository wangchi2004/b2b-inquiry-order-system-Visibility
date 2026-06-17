from app.database.connection import connect, initialize_database
from app.services.customer_service import import_customers, search_customers
from app.services.price_service import get_price_rule, import_prices


def test_search_customers_by_phone_last4_name_and_full_phone(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    import_customers(
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
            },
            {
                "name": "王静",
                "phone": "13404421942",
                "phone_last4": "1942",
                "province": "吉林省",
                "city": "镇赉",
                "address": "",
                "remark": "",
            },
        ],
        duplicate_mode="update",
    )

    by_last4 = search_customers(conn, phone_last4="0227")
    by_name = search_customers(conn, name="王")
    by_phone = search_customers(conn, phone="13404421942")

    assert [row["name"] for row in by_last4] == ["王驰"]
    assert [row["name"] for row in by_name] == ["王静", "王驰"]
    assert [row["name"] for row in by_phone] == ["王静"]


def test_get_price_rule_returns_dataclass(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    import_prices(
        conn,
        [
            {
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
        ],
    )

    rule = get_price_rule(conn, "辽宁省")

    assert rule.province == "辽宁省"
    assert rule.price_2kg == 2.5
