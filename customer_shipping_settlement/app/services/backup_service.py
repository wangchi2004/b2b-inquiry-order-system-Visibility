import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional


def _today() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d_%H%M%S")


def run_startup_backup(
    db_path: Path, backup_dir: Path, today: Optional[str] = None
) -> Optional[Path]:
    if not db_path.exists():
        return None

    backup_dir.mkdir(parents=True, exist_ok=True)
    date_text = today or _today()
    backup_path = backup_dir / f"backup_{date_text}.db"
    if not backup_path.exists():
        shutil.copy2(db_path, backup_path)
    return backup_path


def list_backups(backup_dir: Path) -> list:
    if not backup_dir.exists():
        return []
    return sorted(
        [path for path in backup_dir.iterdir() if path.is_file() and path.suffix == ".db"],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def create_manual_backup(
    db_path: Path, backup_dir: Path, timestamp: Optional[str] = None
) -> Path:
    if not db_path.exists():
        raise FileNotFoundError(f"数据库文件不存在: {db_path}")

    backup_dir.mkdir(parents=True, exist_ok=True)
    time_text = timestamp or _timestamp()
    backup_path = backup_dir / f"manual_backup_{time_text}.db"
    shutil.copy2(db_path, backup_path)
    return backup_path


def restore_backup(
    db_path: Path,
    selected_backup: Path,
    backup_dir: Path,
    timestamp: Optional[str] = None,
) -> Path:
    if not selected_backup.exists():
        raise FileNotFoundError(f"备份文件不存在: {selected_backup}")

    backup_dir.mkdir(parents=True, exist_ok=True)
    time_text = timestamp or _timestamp()
    before_restore = backup_dir / f"restore_before_{time_text}.db"
    if db_path.exists():
        shutil.copy2(db_path, before_restore)
    shutil.copy2(selected_backup, db_path)
    return before_restore
