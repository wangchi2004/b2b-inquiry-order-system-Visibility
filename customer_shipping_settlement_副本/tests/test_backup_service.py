from pathlib import Path

from app.services.backup_service import (
    create_manual_backup,
    restore_backup,
    run_startup_backup,
)


def write_db(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def test_startup_backup_creates_one_backup_per_day(tmp_path):
    db_path = tmp_path / "app.db"
    backup_dir = tmp_path / "backups"
    write_db(db_path, b"first database")

    first = run_startup_backup(db_path, backup_dir, today="2026-06-12")
    write_db(db_path, b"changed database")
    second = run_startup_backup(db_path, backup_dir, today="2026-06-12")

    assert first == backup_dir / "backup_2026-06-12.db"
    assert second == first
    assert first.read_bytes() == b"first database"


def test_startup_backup_skips_missing_database(tmp_path):
    db_path = tmp_path / "missing.db"
    backup_dir = tmp_path / "backups"

    result = run_startup_backup(db_path, backup_dir, today="2026-06-12")

    assert result is None
    assert not backup_dir.exists()


def test_create_manual_backup_uses_timestamp(tmp_path):
    db_path = tmp_path / "app.db"
    backup_dir = tmp_path / "backups"
    write_db(db_path, b"database")

    backup_path = create_manual_backup(
        db_path, backup_dir, timestamp="2026-06-12_213045"
    )

    assert backup_path == backup_dir / "manual_backup_2026-06-12_213045.db"
    assert backup_path.read_bytes() == b"database"


def test_restore_backup_replaces_database_and_saves_current_copy(tmp_path):
    db_path = tmp_path / "app.db"
    backup_dir = tmp_path / "backups"
    selected_backup = backup_dir / "backup_2026-06-12.db"
    write_db(db_path, b"current database")
    write_db(selected_backup, b"backup database")

    before_restore = restore_backup(
        db_path,
        selected_backup,
        backup_dir,
        timestamp="2026-06-12_220000",
    )

    assert before_restore == backup_dir / "restore_before_2026-06-12_220000.db"
    assert before_restore.read_bytes() == b"current database"
    assert db_path.read_bytes() == b"backup database"
