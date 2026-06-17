import json

import pytest

from app.database.connection import connect, initialize_database
from app.services.customer_service import import_customers
from app.services.price_service import import_prices
from app.services.shipment_service import (
    create_shipment,
    delete_shipment,
    update_shipment_weight,
)


def seed_customer_and_price(conn):
    import_customers(
        conn,
        [
            {
                "name": "王驰",
                "phone": "18624090227",
                "phone_last4": "0227",
                "province": "辽宁省",
                "city": "沈阳",
                "address": "测试地址",
                "remark": "",
            }
        ],
        duplicate_mode="update",
    )
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
    return conn.execute("SELECT id FROM customers WHERE phone = ?", ("18624090227",)).fetchone()[
        "id"
    ]


def test_create_shipment_saves_customer_and_price_snapshot(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    customer_id = seed_customer_and_price(conn)

    shipment_id = create_shipment(
        conn,
        customer_id=customer_id,
        actual_weight_kg=1.5,
        ship_date="2026-06-12",
        remark="测试发货",
    )

    shipment = conn.execute("SELECT * FROM shipments WHERE id = ?", (shipment_id,)).fetchone()
    snapshot = json.loads(shipment["price_snapshot"])
    assert shipment["customer_name"] == "王驰"
    assert shipment["customer_phone"] == "18624090227"
    assert shipment["province"] == "辽宁省"
    assert shipment["city"] == "沈阳"
    assert shipment["address"] == "测试地址"
    assert shipment["actual_weight_kg"] == 1.5
    assert shipment["billing_weight_kg"] == 2
    assert shipment["shipping_fee"] == 2.5
    assert shipment["remark"] == "测试发货"
    assert snapshot["province"] == "辽宁省"
    assert snapshot["price_2kg"] == 2.5


def test_create_shipment_uses_saved_fee_after_price_changes(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    customer_id = seed_customer_and_price(conn)

    shipment_id = create_shipment(
        conn,
        customer_id=customer_id,
        actual_weight_kg=1.5,
        ship_date="2026-06-12",
    )
    import_prices(
        conn,
        [
            {
                "province": "辽宁省",
                "price_1kg": 9.0,
                "price_2kg": 9.0,
                "price_3kg": 9.0,
                "price_4kg": 9.0,
                "price_5kg": 9.0,
                "price_6kg": 9.0,
                "over_base_weight_kg": 1.0,
                "over_base_price": 9.0,
                "over_additional_unit_kg": 1.0,
                "over_additional_price": 9.0,
                "remark": "",
            }
        ],
    )

    shipment = conn.execute("SELECT * FROM shipments WHERE id = ?", (shipment_id,)).fetchone()
    snapshot = json.loads(shipment["price_snapshot"])
    assert shipment["shipping_fee"] == 2.5
    assert snapshot["price_2kg"] == 2.5


def test_create_shipment_rejects_missing_price_rule(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    import_customers(
        conn,
        [
            {
                "name": "客户",
                "phone": "13800000000",
                "phone_last4": "0000",
                "province": "未知省",
                "city": "",
                "address": "",
                "remark": "",
            }
        ],
        duplicate_mode="update",
    )
    customer_id = conn.execute("SELECT id FROM customers WHERE phone = ?", ("13800000000",)).fetchone()[
        "id"
    ]

    with pytest.raises(ValueError, match="该省份没有价格规则"):
        create_shipment(conn, customer_id=customer_id, actual_weight_kg=1.0, ship_date="2026-06-12")


def test_create_shipment_rejects_inactive_customer(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    customer_id = seed_customer_and_price(conn)
    conn.execute("UPDATE customers SET is_active = 0 WHERE id = ?", (customer_id,))
    conn.commit()

    with pytest.raises(ValueError, match="客户不存在或已停用"):
        create_shipment(conn, customer_id=customer_id, actual_weight_kg=1.0, ship_date="2026-06-12")


def test_update_shipment_weight_recalculates_fee_and_snapshot(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    customer_id = seed_customer_and_price(conn)
    shipment_id = create_shipment(
        conn,
        customer_id=customer_id,
        actual_weight_kg=1.5,
        ship_date="2026-06-12",
    )

    update_shipment_weight(conn, shipment_id, 5.5)

    shipment = conn.execute("SELECT * FROM shipments WHERE id = ?", (shipment_id,)).fetchone()
    snapshot = json.loads(shipment["price_snapshot"])
    assert shipment["actual_weight_kg"] == 5.5
    assert shipment["billing_weight_kg"] == 6
    assert shipment["shipping_fee"] == 6.5
    assert snapshot["price_6kg"] == 6.5


def test_delete_shipment_soft_deletes_record(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    customer_id = seed_customer_and_price(conn)
    shipment_id = create_shipment(
        conn,
        customer_id=customer_id,
        actual_weight_kg=1.5,
        ship_date="2026-06-12",
    )

    delete_shipment(conn, shipment_id)

    shipment = conn.execute("SELECT * FROM shipments WHERE id = ?", (shipment_id,)).fetchone()
    assert shipment["is_deleted"] == 1
