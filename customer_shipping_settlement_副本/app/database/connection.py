import sqlite3
from pathlib import Path
from typing import Optional


DEFAULT_SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialize_database(
    conn: sqlite3.Connection, schema_path: Optional[Path] = None
) -> None:
    path = schema_path or DEFAULT_SCHEMA_PATH
    sql = path.read_text(encoding="utf-8")
    conn.executescript(sql)
    conn.commit()
