import pytest

from app.database.connection import connect, initialize_database
from app.services.customer_service import (
    deactivate_customer,
    get_customer,
    import_customers,
    update_customer,
)
from app.services.price_service import import_prices, list_prices, save_price


def test_update_and_deactivate_customer(tmp_path):
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
            }
        ],
        duplicate_mode="update",
    )
    customer_id = conn.execute("SELECT id FROM customers").fetchone()["id"]

    update_customer(
        conn,
        customer_id,
        {
            "name": "王驰改",
            "phone": "18624090228",
            "province": "吉林省",
            "city": "长春",
            "address": "新地址",
            "remark": "新备注",
        },
    )
    updated = get_customer(conn, customer_id)
    assert updated["name"] == "王驰改"
    assert updated["phone"] == "18624090228"
    assert updated["phone_last4"] == "0228"
    assert updated["province"] == "吉林省"

    deactivate_customer(conn, customer_id)
    deactivated = get_customer(conn, customer_id)
    assert deactivated["is_active"] == 0


def test_update_customer_rejects_duplicate_phone(tmp_path):
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
    customer_id = conn.execute(
        "SELECT id FROM customers WHERE phone = ?", ("18624090227",)
    ).fetchone()["id"]

    with pytest.raises(ValueError, match="电话已存在"):
        update_customer(
            conn,
            customer_id,
            {
                "name": "王驰",
                "phone": "13404421942",
                "province": "辽宁省",
                "city": "沈阳",
                "address": "",
                "remark": "",
            },
        )


def test_list_and_save_prices(tmp_path):
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

    save_price(
        conn,
        {
            "province": "辽宁省",
            "price_1kg": 2.2,
            "price_2kg": 2.6,
            "price_3kg": 3.1,
            "price_4kg": 4.1,
            "price_5kg": 5.1,
            "price_6kg": 6.6,
            "over_base_weight_kg": 1.0,
            "over_base_price": 3.1,
            "over_additional_unit_kg": 1.0,
            "over_additional_price": 1.1,
            "remark": "调价",
        },
    )

    prices = list_prices(conn)
    assert len(prices) == 1
    assert prices[0]["province"] == "辽宁省"
    assert prices[0]["price_1kg"] == 2.2
    assert prices[0]["remark"] == "调价"
