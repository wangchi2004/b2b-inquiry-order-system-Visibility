import sqlite3

from PySide6.QtWidgets import (
    QFileDialog,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from app.config import BACKUP_DIR, DATABASE_PATH
from app.services.backup_service import (
    create_manual_backup,
    list_backups,
    restore_backup,
)


class BackupPage(QWidget):
    def __init__(self, conn: sqlite3.Connection):
        super().__init__()
        self.conn = conn
        self.backup_paths = []

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)

        title = QLabel("备份恢复")
        title.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(title)

        self.path_label = QLabel(f"数据库位置：{DATABASE_PATH}")
        self.path_label.setWordWrap(True)
        layout.addWidget(self.path_label)

        actions = QHBoxLayout()
        manual_button = QPushButton("手动备份")
        manual_button.clicked.connect(self.manual_backup)
        choose_button = QPushButton("从文件恢复")
        choose_button.clicked.connect(self.restore_from_file)
        refresh_button = QPushButton("刷新列表")
        refresh_button.clicked.connect(self.refresh)
        actions.addWidget(manual_button)
        actions.addWidget(choose_button)
        actions.addWidget(refresh_button)
        actions.addStretch(1)
        layout.addLayout(actions)

        self.list_widget = QListWidget()
        layout.addWidget(self.list_widget, 1)

        restore_selected_button = QPushButton("恢复选中备份")
        restore_selected_button.clicked.connect(self.restore_selected)
        layout.addWidget(restore_selected_button)

        self.status_label = QLabel("")
        self.status_label.setWordWrap(True)
        layout.addWidget(self.status_label)
        self.refresh()

    def refresh(self) -> None:
        self.backup_paths = list_backups(BACKUP_DIR)
        self.list_widget.clear()
        for path in self.backup_paths:
            item = QListWidgetItem(path.name)
            item.setToolTip(str(path))
            self.list_widget.addItem(item)

    def manual_backup(self) -> None:
        try:
            path = create_manual_backup(DATABASE_PATH, BACKUP_DIR)
            self.status_label.setText(f"手动备份完成：{path}")
            self.refresh()
        except Exception as exc:
            QMessageBox.critical(self, "备份失败", str(exc))

    def restore_selected(self) -> None:
        row = self.list_widget.currentRow()
        if row < 0 or row >= len(self.backup_paths):
            QMessageBox.warning(self, "缺少备份", "请先选择一个备份文件")
            return
        self._restore(self.backup_paths[row])

    def restore_from_file(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "选择备份数据库", "", "SQLite DB (*.db)")
        if path:
            self._restore(path)

    def _restore(self, path) -> None:
        answer = QMessageBox.question(
            self,
            "确认恢复",
            "恢复会覆盖当前数据库。恢复前会自动保存当前数据库，是否继续？",
        )
        if answer != QMessageBox.Yes:
            return
        try:
            self.conn.close()
            before_restore = restore_backup(DATABASE_PATH, path, BACKUP_DIR)
            self.status_label.setText(f"恢复完成，原数据库已保存为：{before_restore}\n请重启软件。")
            self.refresh()
        except Exception as exc:
            QMessageBox.critical(self, "恢复失败", str(exc))
