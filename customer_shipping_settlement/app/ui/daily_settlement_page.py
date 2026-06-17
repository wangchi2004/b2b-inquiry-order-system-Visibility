import sqlite3
from datetime import date

from PySide6.QtWidgets import (
    QDateEdit,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from app.config import EXPORT_DIR
from app.services.excel_export_service import export_daily_settlement
from app.services.settlement_service import get_daily_settlement


class DailySettlementPage(QWidget):
    def __init__(self, conn: sqlite3.Connection):
        super().__init__()
        self.conn = conn

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)

        title = QLabel("每日结算")
        title.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(title)

        controls = QHBoxLayout()
        self.date_input = QDateEdit()
        self.date_input.setCalendarPopup(True)
        self.date_input.setDate(date.today())
        refresh_button = QPushButton("查询")
        refresh_button.clicked.connect(self.refresh)
        export_button = QPushButton("导出 Excel")
        export_button.clicked.connect(self.export_excel)
        controls.addWidget(QLabel("日期"))
        controls.addWidget(self.date_input)
        controls.addWidget(refresh_button)
        controls.addWidget(export_button)
        controls.addStretch(1)
        layout.addLayout(controls)

        self.total_label = QLabel("总件数 0 / 总重量 0 / 总快递费 0")
        layout.addWidget(self.total_label)

        self.detail_table = QTableWidget(0, 7)
        self.detail_table.setHorizontalHeaderLabels(["ID", "姓名", "电话", "省份", "实际重量", "结算重量", "快递费"])
        layout.addWidget(self.detail_table, 2)

        self.province_table = QTableWidget(0, 5)
        self.province_table.setHorizontalHeaderLabels(["省份", "件数", "总实际重量", "总结算重量", "总快递费"])
        layout.addWidget(self.province_table, 1)
        self.refresh()

    def refresh(self) -> None:
        ship_date = self.date_input.date().toString("yyyy-MM-dd")
        settlement = get_daily_settlement(self.conn, ship_date)
        totals = settlement["totals"]
        self.total_label.setText(
            f"总件数 {totals['shipment_count']} / 总实际重量 {totals['total_actual_weight']} / "
            f"总结算重量 {totals['total_billing_weight']} / 总快递费 {totals['total_fee']}"
        )

        details = settlement["details"]
        self.detail_table.setRowCount(len(details))
        for row_index, row in enumerate(details):
            values = [
                row["id"],
                row["customer_name"],
                row["customer_phone"],
                row["province"],
                row["actual_weight_kg"],
                row["billing_weight_kg"],
                row["shipping_fee"],
            ]
            for col, value in enumerate(values):
                self.detail_table.setItem(row_index, col, QTableWidgetItem(str(value or "")))

        summary = settlement["province_summary"]
        self.province_table.setRowCount(len(summary))
        for row_index, row in enumerate(summary):
            values = [
                row["province"],
                row["shipment_count"],
                row["total_actual_weight"],
                row["total_billing_weight"],
                row["total_fee"],
            ]
            for col, value in enumerate(values):
                self.province_table.setItem(row_index, col, QTableWidgetItem(str(value or "")))

    def export_excel(self) -> None:
        ship_date = self.date_input.date().toString("yyyy-MM-dd")
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        path = EXPORT_DIR / f"每日结算_{ship_date}.xlsx"
        export_daily_settlement(self.conn, ship_date, path)
        self.total_label.setText(f"{self.total_label.text()} / 已导出：{path}")
