import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


APP_NAME = "CustomerShippingSettlement"
PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class AppPaths:
    local_data_dir: Path
    database_path: Path
    backup_dir: Path
    export_dir: Path
    log_dir: Path


def build_paths(
    platform_name: Optional[str] = None,
    frozen: Optional[bool] = None,
) -> AppPaths:
    env_dir = os.environ.get("CUSTOMER_SHIPPING_DATA_DIR")
    if env_dir:
        local_data_dir = Path(env_dir)
    else:
        platform = platform_name or sys.platform
        is_frozen = getattr(sys, "frozen", False) if frozen is None else frozen
        if platform.startswith("win"):
            base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
            local_data_dir = base / APP_NAME
        elif is_frozen:
            local_data_dir = Path.home() / "Library" / "Application Support" / APP_NAME
        else:
            local_data_dir = PROJECT_ROOT / "data"

    return AppPaths(
        local_data_dir=local_data_dir,
        database_path=local_data_dir / "app.db",
        backup_dir=local_data_dir / "backups",
        export_dir=local_data_dir / "exports",
        log_dir=local_data_dir / "logs",
    )


PATHS = build_paths()
LOCAL_DATA_DIR = PATHS.local_data_dir
DATABASE_PATH = PATHS.database_path
BACKUP_DIR = PATHS.backup_dir
EXPORT_DIR = PATHS.export_dir
LOG_DIR = PATHS.log_dir
