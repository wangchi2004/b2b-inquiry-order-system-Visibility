from app.database.connection import connect, initialize_database
from app.services.customer_service import import_customers
from app.services.price_service import import_prices
from app.services.shipment_service import create_shipment
from app.services.settlement_service import (
    get_daily_settlement,
    get_monthly_settlement,
)


def seed_data(conn):
    import_customers(
        conn,
        [
            {
                "name": "辽宁客户",
                "phone": "18624090227",
                "phone_last4": "0227",
                "province": "辽宁省",
                "city": "沈阳",
                "address": "辽宁地址",
                "remark": "",
            },
            {
                "name": "吉林客户",
                "phone": "13404421942",
                "phone_last4": "1942",
                "province": "吉林省",
                "city": "镇赉",
                "address": "吉林地址",
                "remark": "",
            },
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
            },
            {
                "province": "吉林省",
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
            },
        ],
    )
    customers = {
        row["province"]: row["id"]
        for row in conn.execute("SELECT id, province FROM customers").fetchall()
    }
    create_shipment(conn, customers["辽宁省"], 1.5, "2026-06-12", "辽宁当天")
    create_shipment(conn, customers["吉林省"], 5.5, "2026-06-12", "吉林当天")
    deleted_id = create_shipment(conn, customers["辽宁省"], 1.0, "2026-06-12", "删除记录")
    create_shipment(conn, customers["辽宁省"], 6.1, "2026-06-13", "辽宁次日")
    conn.execute("UPDATE shipments SET is_deleted = 1 WHERE id = ?", (deleted_id,))
    conn.commit()


def test_get_daily_settlement_returns_totals_details_and_province_summary(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    seed_data(conn)

    settlement = get_daily_settlement(conn, "2026-06-12")

    assert settlement["totals"] == {
        "shipment_count": 2,
        "total_actual_weight": 7.0,
        "total_billing_weight": 8,
        "total_fee": 9.0,
    }
    assert [row["customer_name"] for row in settlement["details"]] == ["辽宁客户", "吉林客户"]
    assert settlement["province_summary"] == [
        {
            "province": "吉林省",
            "shipment_count": 1,
            "total_actual_weight": 5.5,
            "total_billing_weight": 6,
            "total_fee": 6.5,
        },
        {
            "province": "辽宁省",
            "shipment_count": 1,
            "total_actual_weight": 1.5,
            "total_billing_weight": 2,
            "total_fee": 2.5,
        },
    ]


def test_get_monthly_settlement_returns_date_and_province_summaries(tmp_path):
    conn = connect(tmp_path / "app.db")
    initialize_database(conn)
    seed_data(conn)

    settlement = get_monthly_settlement(conn, "2026-06")

    assert settlement["totals"] == {
        "shipment_count": 3,
        "total_actual_weight": 13.1,
        "total_billing_weight": 15,
        "total_fee": 18.0,
    }
    assert settlement["date_summary"] == [
        {
            "ship_date": "2026-06-12",
            "shipment_count": 2,
            "total_actual_weight": 7.0,
            "total_billing_weight": 8,
            "total_fee": 9.0,
        },
        {
            "ship_date": "2026-06-13",
            "shipment_count": 1,
            "total_actual_weight": 6.1,
            "total_billing_weight": 7,
            "total_fee": 9.0,
        },
    ]
    assert settlement["province_summary"] == [
        {
            "province": "辽宁省",
            "shipment_count": 2,
            "total_actual_weight": 7.6,
            "total_billing_weight": 9,
            "total_fee": 11.5,
        },
        {
            "province": "吉林省",
            "shipment_count": 1,
            "total_actual_weight": 5.5,
            "total_billing_weight": 6,
            "total_fee": 6.5,
        },
    ]
