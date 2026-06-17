import sqlite3
from datetime import datetime

from app.utils.phone import clean_phone, phone_last4


def get_customer(conn: sqlite3.Connection, customer_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()
    if row is None:
        raise ValueError("客户不存在")
    return row


def search_customers(
    conn: sqlite3.Connection,
    phone_last4: str = "",
    name: str = "",
    phone: str = "",
    active_only: bool = True,
    limit: int = 200,
) -> list:
    clauses = []
    params = {}
    if active_only:
        clauses.append("is_active = 1")
    if phone_last4:
        clauses.append("phone_last4 = :phone_last4")
        params["phone_last4"] = phone_last4
    if name:
        clauses.append("name LIKE :name")
        params["name"] = f"%{name}%"
    if phone:
        clauses.append("phone = :phone")
        params["phone"] = phone

    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    params["limit"] = limit
    return conn.execute(
        f"""
        SELECT *
        FROM customers
        {where}
        ORDER BY updated_at DESC, id DESC
        LIMIT :limit
        """,
        params,
    ).fetchall()


def update_customer(conn: sqlite3.Connection, customer_id: int, data: dict) -> None:
    phone = clean_phone(data["phone"])
    duplicate = conn.execute(
        "SELECT id FROM customers WHERE phone = ? AND id != ?", (phone, customer_id)
    ).fetchone()
    if duplicate is not None:
        raise ValueError("电话已存在")

    now = datetime.now().isoformat(timespec="seconds")
    conn.execute(
        """
        UPDATE customers
        SET name = :name,
            phone = :phone,
            phone_last4 = :phone_last4,
            province = :province,
            city = :city,
            address = :address,
            remark = :remark,
            updated_at = :now
        WHERE id = :id
        """,
        {
            "id": customer_id,
            "name": data["name"],
            "phone": phone,
            "phone_last4": phone_last4(phone),
            "province": data["province"],
            "city": data.get("city", ""),
            "address": data.get("address", ""),
            "remark": data.get("remark", ""),
            "now": now,
        },
    )
    conn.commit()


def deactivate_customer(conn: sqlite3.Connection, customer_id: int) -> None:
    now = datetime.now().isoformat(timespec="seconds")
    conn.execute(
        "UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?",
        (now, customer_id),
    )
    conn.commit()


def import_customers(
    conn: sqlite3.Connection, rows: list, duplicate_mode: str = "skip"
) -> dict:
    if duplicate_mode not in ("skip", "update"):
        raise ValueError("duplicate_mode must be 'skip' or 'update'")

    result = {"inserted": 0, "updated": 0, "skipped": 0}

    for row in rows:
        existing = conn.execute(
            "SELECT id FROM customers WHERE phone = ?", (row["phone"],)
        ).fetchone()
        if existing and duplicate_mode == "skip":
            result["skipped"] += 1
            continue

        now = datetime.now().isoformat(timespec="seconds")
        values = {
            "name": row["name"],
            "phone": row["phone"],
            "phone_last4": row["phone_last4"],
            "province": row["province"],
            "city": row.get("city", ""),
            "address": row.get("address", ""),
            "remark": row.get("remark", ""),
            "now": now,
        }

        if existing:
            conn.execute(
                """
                UPDATE customers
                SET name = :name,
                    phone_last4 = :phone_last4,
                    province = :province,
                    city = :city,
                    address = :address,
                    remark = :remark,
                    updated_at = :now
                WHERE phone = :phone
                """,
                values,
            )
            result["updated"] += 1
        else:
            conn.execute(
                """
                INSERT INTO customers (
                    name, phone, phone_last4, province, city, address,
                    remark, created_at, updated_at
                )
                VALUES (
                    :name, :phone, :phone_last4, :province, :city, :address,
                    :remark, :now, :now
                )
                """,
                values,
            )
            result["inserted"] += 1

    conn.commit()
    return result
