import sqlite3
from datetime import datetime


def _money(value: object) -> float:
    return round(float(value or 0), 2)


def _weight(value: object) -> float:
    return round(float(value or 0), 3)


def _row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)


def _totals(rows: list) -> dict:
    return {
        "shipment_count": len(rows),
        "total_actual_weight": _weight(sum(row["actual_weight_kg"] for row in rows)),
        "total_billing_weight": int(sum(row["billing_weight_kg"] for row in rows)),
        "total_fee": _money(sum(row["shipping_fee"] for row in rows)),
    }


def get_daily_settlement(conn: sqlite3.Connection, ship_date: str) -> dict:
    details = [
        _row_to_dict(row)
        for row in conn.execute(
            """
            SELECT *
            FROM shipments
            WHERE ship_date = ?
              AND is_deleted = 0
            ORDER BY created_at ASC, id ASC
            """,
            (ship_date,),
        ).fetchall()
    ]

    province_summary = [
        {
            "province": row["province"],
            "shipment_count": row["shipment_count"],
            "total_actual_weight": _weight(row["total_actual_weight"]),
            "total_billing_weight": int(row["total_billing_weight"] or 0),
            "total_fee": _money(row["total_fee"]),
        }
        for row in conn.execute(
            """
            SELECT province,
                   COUNT(*) AS shipment_count,
                   SUM(actual_weight_kg) AS total_actual_weight,
                   SUM(billing_weight_kg) AS total_billing_weight,
                   SUM(shipping_fee) AS total_fee
            FROM shipments
            WHERE ship_date = ?
              AND is_deleted = 0
            GROUP BY province
            ORDER BY total_fee DESC, province ASC
            """,
            (ship_date,),
        ).fetchall()
    ]

    return {
        "ship_date": ship_date,
        "totals": _totals(details),
        "details": details,
        "province_summary": province_summary,
    }


def get_monthly_settlement(conn: sqlite3.Connection, month: str) -> dict:
    start_date = f"{month}-01"
    year = int(month[:4])
    month_number = int(month[5:7])
    if month_number == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month_number + 1:02d}-01"

    details = [
        _row_to_dict(row)
        for row in conn.execute(
            """
            SELECT *
            FROM shipments
            WHERE ship_date >= ?
              AND ship_date < ?
              AND is_deleted = 0
            ORDER BY ship_date ASC, created_at ASC, id ASC
            """,
            (start_date, end_date),
        ).fetchall()
    ]

    date_summary = [
        {
            "ship_date": row["ship_date"],
            "shipment_count": row["shipment_count"],
            "total_actual_weight": _weight(row["total_actual_weight"]),
            "total_billing_weight": int(row["total_billing_weight"] or 0),
            "total_fee": _money(row["total_fee"]),
        }
        for row in conn.execute(
            """
            SELECT ship_date,
                   COUNT(*) AS shipment_count,
                   SUM(actual_weight_kg) AS total_actual_weight,
                   SUM(billing_weight_kg) AS total_billing_weight,
                   SUM(shipping_fee) AS total_fee
            FROM shipments
            WHERE ship_date >= ?
              AND ship_date < ?
              AND is_deleted = 0
            GROUP BY ship_date
            ORDER BY ship_date ASC
            """,
            (start_date, end_date),
        ).fetchall()
    ]

    province_summary = [
        {
            "province": row["province"],
            "shipment_count": row["shipment_count"],
            "total_actual_weight": _weight(row["total_actual_weight"]),
            "total_billing_weight": int(row["total_billing_weight"] or 0),
            "total_fee": _money(row["total_fee"]),
        }
        for row in conn.execute(
            """
            SELECT province,
                   COUNT(*) AS shipment_count,
                   SUM(actual_weight_kg) AS total_actual_weight,
                   SUM(billing_weight_kg) AS total_billing_weight,
                   SUM(shipping_fee) AS total_fee
            FROM shipments
            WHERE ship_date >= ?
              AND ship_date < ?
              AND is_deleted = 0
            GROUP BY province
            ORDER BY total_fee DESC, province ASC
            """,
            (start_date, end_date),
        ).fetchall()
    ]

    datetime.strptime(month, "%Y-%m")
    return {
        "month": month,
        "totals": _totals(details),
        "date_summary": date_summary,
        "province_summary": province_summary,
        "details": details,
    }
