import sys
from pathlib import Path

import PySide6
from PySide6.QtCore import QCoreApplication
from PySide6.QtWidgets import QApplication

from app.config import BACKUP_DIR, DATABASE_PATH
from app.database.connection import connect, initialize_database
from app.services.backup_service import run_startup_backup
from app.ui.main_window import MainWindow


def main() -> int:
    conn = connect(DATABASE_PATH)
    initialize_database(conn)
    run_startup_backup(DATABASE_PATH, BACKUP_DIR)

    qt_plugins = Path(PySide6.__file__).resolve().parent / "Qt" / "plugins"
    QCoreApplication.addLibraryPath(str(qt_plugins))

    app = QApplication(sys.argv)
    window = MainWindow(conn)
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
