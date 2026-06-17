import sqlite3

from PySide6.QtWidgets import (
    QFileDialog,
    QGridLayout,
    QLabel,
    QMessageBox,
    QPushButton,
    QWidget,
)

from app.config import EXPORT_DIR
from app.services.customer_service import import_customers
from app.services.excel_export_service import export_customers
from app.services.excel_import_service import parse_customer_workbook, parse_price_workbook
from app.services.price_service import import_prices


class ImportExportPage(QWidget):
    def __init__(self, conn: sqlite3.Connection):
        super().__init__()
        self.conn = conn

        layout = QGridLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setHorizontalSpacing(12)
        layout.setVerticalSpacing(12)

        title = QLabel("Excel 导入导出")
        title.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(title, 0, 0, 1, 2)

        import_customers_button = QPushButton("导入客户资料 Excel")
        import_customers_button.clicked.connect(self.import_customers_excel)
        layout.addWidget(import_customers_button, 1, 0)

        import_prices_button = QPushButton("导入快递价格 Excel")
        import_prices_button.clicked.connect(self.import_prices_excel)
        layout.addWidget(import_prices_button, 1, 1)

        export_customers_button = QPushButton("导出客户资料 Excel")
        export_customers_button.clicked.connect(self.export_customers_excel)
        layout.addWidget(export_customers_button, 2, 0)

        self.status = QLabel("请选择操作")
        self.status.setWordWrap(True)
        layout.addWidget(self.status, 3, 0, 1, 2)
        layout.setRowStretch(4, 1)

    def import_customers_excel(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "选择客户资料 Excel", "", "Excel (*.xlsx)")
        if not path:
            return
        try:
            rows = parse_customer_workbook(path)
            result = import_customers(self.conn, rows, duplicate_mode="update")
            self.status.setText(
                f"客户导入完成：新增 {result['inserted']}，更新 {result['updated']}，跳过 {result['skipped']}"
            )
        except Exception as exc:
            QMessageBox.critical(self, "导入失败", str(exc))

    def import_prices_excel(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, "选择快递价格 Excel", "", "Excel (*.xlsx)")
        if not path:
            return
        try:
            rows = parse_price_workbook(path)
            result = import_prices(self.conn, rows)
            self.status.setText(f"价格导入完成：新增 {result['inserted']}，更新 {result['updated']}")
        except Exception as exc:
            QMessageBox.critical(self, "导入失败", str(exc))

    def export_customers_excel(self) -> None:
        try:
            EXPORT_DIR.mkdir(parents=True, exist_ok=True)
            path = EXPORT_DIR / "客户资料.xlsx"
            export_customers(self.conn, path)
            self.status.setText(f"客户资料已导出：{path}")
        except Exception as exc:
            QMessageBox.critical(self, "导出失败", str(exc))
