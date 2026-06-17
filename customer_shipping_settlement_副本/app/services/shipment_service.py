import json
import sqlite3
from datetime import datetime

from app.utils.shipping_fee import PriceRule, calculate_shipping_fee


def _load_active_customer(conn: sqlite3.Connection, customer_id: int) -> sqlite3.Row:
    customer = conn.execute(
        "SELECT * FROM customers WHERE id = ? AND is_active = 1", (customer_id,)
    ).fetchone()
    if customer is None:
        raise ValueError("客户不存在或已停用")
    return customer


def _load_price_rule(conn: sqlite3.Connection, province: str) -> PriceRule:
    row = conn.execute(
        "SELECT * FROM shipping_prices WHERE province = ?", (province,)
    ).fetchone()
    if row is None:
        raise ValueError("该省份没有价格规则")

    return PriceRule(
        province=row["province"],
        price_1kg=row["price_1kg"],
        price_2kg=row["price_2kg"],
        price_3kg=row["price_3kg"],
        price_4kg=row["price_4kg"],
        price_5kg=row["price_5kg"],
        price_6kg=row["price_6kg"],
        over_base_weight_kg=row["over_base_weight_kg"],
        over_base_price=row["over_base_price"],
        over_additional_unit_kg=row["over_additional_unit_kg"],
        over_additional_price=row["over_additional_price"],
    )


def create_shipment(
    conn: sqlite3.Connection,
    customer_id: int,
    actual_weight_kg: float,
    ship_date: str,
    remark: str = "",
) -> int:
    customer = _load_active_customer(conn, customer_id)
    price_rule = _load_price_rule(conn, customer["province"])
    fee_result = calculate_shipping_fee(actual_weight_kg, price_rule)
    now = datetime.now().isoformat(timespec="seconds")

    cursor = conn.execute(
        """
        INSERT INTO shipments (
            ship_date, customer_id, customer_name, customer_phone,
            province, city, address, actual_weight_kg, billing_weight_kg,
            shipping_fee, price_snapshot, created_at, updated_at, remark
        )
        VALUES (
            :ship_date, :customer_id, :customer_name, :customer_phone,
            :province, :city, :address, :actual_weight_kg, :billing_weight_kg,
            :shipping_fee, :price_snapshot, :created_at, :updated_at, :remark
        )
        """,
        {
            "ship_date": ship_date,
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "customer_phone": customer["phone"],
            "province": customer["province"],
            "city": customer["city"] or "",
            "address": customer["address"] or "",
            "actual_weight_kg": fee_result.actual_weight_kg,
            "billing_weight_kg": fee_result.billing_weight_kg,
            "shipping_fee": fee_result.shipping_fee,
            "price_snapshot": json.dumps(
                fee_result.price_snapshot, ensure_ascii=False, sort_keys=True
            ),
            "created_at": now,
            "updated_at": now,
            "remark": remark,
        },
    )
    conn.commit()
    return int(cursor.lastrowid)


def update_shipment_weight(
    conn: sqlite3.Connection, shipment_id: int, actual_weight_kg: float
) -> None:
    shipment = conn.execute(
        "SELECT * FROM shipments WHERE id = ? AND is_deleted = 0", (shipment_id,)
    ).fetchone()
    if shipment is None:
        raise ValueError("发货记录不存在或已删除")

    price_rule = _load_price_rule(conn, shipment["province"])
    fee_result = calculate_shipping_fee(actual_weight_kg, price_rule)
    now = datetime.now().isoformat(timespec="seconds")

    conn.execute(
        """
        UPDATE shipments
        SET actual_weight_kg = :actual_weight_kg,
            billing_weight_kg = :billing_weight_kg,
            shipping_fee = :shipping_fee,
            price_snapshot = :price_snapshot,
            updated_at = :updated_at
        WHERE id = :id
        """,
        {
            "id": shipment_id,
            "actual_weight_kg": fee_result.actual_weight_kg,
            "billing_weight_kg": fee_result.billing_weight_kg,
            "shipping_fee": fee_result.shipping_fee,
            "price_snapshot": json.dumps(
                fee_result.price_snapshot, ensure_ascii=False, sort_keys=True
            ),
            "updated_at": now,
        },
    )
    conn.commit()


def delete_shipment(conn: sqlite3.Connection, shipment_id: int) -> None:
    now = datetime.now().isoformat(timespec="seconds")
    conn.execute(
        """
        UPDATE shipments
        SET is_deleted = 1,
            updated_at = ?
        WHERE id = ?
        """,
        (now, shipment_id),
    )
    conn.commit()
