from app.services.backup_service import list_backups


def test_list_backups_returns_db_files_newest_first(tmp_path):
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    old = backup_dir / "backup_2026-06-12.db"
    new = backup_dir / "manual_backup_2026-06-13_090000.db"
    ignored = backup_dir / "notes.txt"
    old.write_bytes(b"old")
    new.write_bytes(b"new")
    ignored.write_text("ignore", encoding="utf-8")

    backups = list_backups(backup_dir)

    assert backups == [new, old]
