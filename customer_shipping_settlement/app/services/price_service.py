import sqlite3
from datetime import datetime

from app.utils.shipping_fee import PriceRule


def list_prices(conn: sqlite3.Connection) -> list:
    return conn.execute(
        """
        SELECT *
        FROM shipping_prices
        ORDER BY province ASC
        """
    ).fetchall()


def get_price_rule(conn: sqlite3.Connection, province: str) -> PriceRule:
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


def save_price(conn: sqlite3.Connection, row: dict) -> dict:
    return import_prices(conn, [row])


def import_prices(conn: sqlite3.Connection, rows: list) -> dict:
    result = {"inserted": 0, "updated": 0}

    for row in rows:
        existing = conn.execute(
            "SELECT id FROM shipping_prices WHERE province = ?", (row["province"],)
        ).fetchone()
        now = datetime.now().isoformat(timespec="seconds")
        values = {
            "province": row["province"],
            "price_1kg": row.get("price_1kg"),
            "price_2kg": row.get("price_2kg"),
            "price_3kg": row.get("price_3kg"),
            "price_4kg": row.get("price_4kg"),
            "price_5kg": row.get("price_5kg"),
            "price_6kg": row.get("price_6kg"),
            "over_base_weight_kg": row.get("over_base_weight_kg", 1.0),
            "over_base_price": row.get("over_base_price"),
            "over_additional_unit_kg": row.get("over_additional_unit_kg", 1.0),
            "over_additional_price": row.get("over_additional_price"),
            "remark": row.get("remark", ""),
            "now": now,
        }

        if existing:
            conn.execute(
                """
                UPDATE shipping_prices
                SET price_1kg = :price_1kg,
                    price_2kg = :price_2kg,
                    price_3kg = :price_3kg,
                    price_4kg = :price_4kg,
                    price_5kg = :price_5kg,
                    price_6kg = :price_6kg,
                    over_base_weight_kg = :over_base_weight_kg,
                    over_base_price = :over_base_price,
                    over_additional_unit_kg = :over_additional_unit_kg,
                    over_additional_price = :over_additional_price,
                    remark = :remark,
                    updated_at = :now
                WHERE province = :province
                """,
                values,
            )
            result["updated"] += 1
        else:
            conn.execute(
                """
                INSERT INTO shipping_prices (
                    province, price_1kg, price_2kg, price_3kg, price_4kg,
                    price_5kg, price_6kg, over_base_weight_kg,
                    over_base_price, over_additional_unit_kg,
                    over_additional_price, remark, created_at, updated_at
                )
                VALUES (
                    :province, :price_1kg, :price_2kg, :price_3kg, :price_4kg,
                    :price_5kg, :price_6kg, :over_base_weight_kg,
                    :over_base_price, :over_additional_unit_kg,
                    :over_additional_price, :remark, :now, :now
                )
                """,
                values,
            )
            result["inserted"] += 1

    conn.commit()
    return result
