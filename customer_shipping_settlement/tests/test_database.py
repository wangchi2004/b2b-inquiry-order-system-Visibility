from app.database.connection import connect, initialize_database


def test_initialize_database_creates_core_tables(tmp_path):
    db_path = tmp_path / "app.db"
    conn = connect(db_path)
    initialize_database(conn)

    table_names = {
        row["name"]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }

    assert "customers" in table_names
    assert "shipping_prices" in table_names
    assert "shipments" in table_names
    assert "import_logs" in table_names
