import sqlite3
from datetime import date

from PySide6.QtWidgets import (
    QDoubleSpinBox,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from app.services.customer_service import search_customers
from app.services.settlement_service import get_daily_settlement
from app.services.shipment_service import create_shipment


class ShipmentPage(QWidget):
    def __init__(self, conn: sqlite3.Connection):
        super().__init__()
        self.conn = conn
        self.selected_customer_id = None

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)

        title = QLabel("发货录入")
        title.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(title)

        search_row = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("输入电话后4位")
        self.search_input.returnPressed.connect(self.search)
        search_button = QPushButton("搜索")
        search_button.clicked.connect(self.search)
        search_row.addWidget(self.search_input)
        search_row.addWidget(search_button)
        layout.addLayout(search_row)

        self.customer_table = QTableWidget(0, 5)
        self.customer_table.setHorizontalHeaderLabels(["ID", "姓名", "电话", "省份", "城市"])
        self.customer_table.cellClicked.connect(self.select_customer)
        layout.addWidget(self.customer_table, 2)

        form = QGridLayout()
        self.selected_label = QLabel("未选择客户")
        self.weight_input = QDoubleSpinBox()
        self.weight_input.setRange(0.01, 9999)
        self.weight_input.setDecimals(2)
        self.weight_input.setSingleStep(0.1)
        save_button = QPushButton("保存发货")
        save_button.clicked.connect(self.save_shipment)
        form.addWidget(QLabel("选中客户"), 0, 0)
        form.addWidget(self.selected_label, 0, 1)
        form.addWidget(QLabel("重量 kg"), 1, 0)
        form.addWidget(self.weight_input, 1, 1)
        form.addWidget(save_button, 1, 2)
        layout.addLayout(form)

        layout.addWidget(QLabel("今日发货记录"))
        self.today_table = QTableWidget(0, 7)
        self.today_table.setHorizontalHeaderLabels(["ID", "姓名", "电话", "省份", "实际重量", "结算重量", "快递费"])
        layout.addWidget(self.today_table, 2)
        self.refresh_today()

    def search(self) -> None:
        rows = search_customers(self.conn, phone_last4=self.search_input.text().strip())
        self.customer_table.setRowCount(len(rows))
        for row_index, row in enumerate(rows):
            values = [row["id"], row["name"], row["phone"], row["province"], row["city"]]
            for col, value in enumerate(values):
                self.customer_table.setItem(row_index, col, QTableWidgetItem(str(value or "")))

    def select_customer(self, row: int, _column: int) -> None:
        self.selected_customer_id = int(self.customer_table.item(row, 0).text())
        name = self.customer_table.item(row, 1).text()
        phone = self.customer_table.item(row, 2).text()
        province = self.customer_table.item(row, 3).text()
        self.selected_label.setText(f"{name} / {phone} / {province}")

    def save_shipment(self) -> None:
        if self.selected_customer_id is None:
            QMessageBox.warning(self, "缺少客户", "请先选择客户")
            return
        try:
            create_shipment(
                self.conn,
                customer_id=self.selected_customer_id,
                actual_weight_kg=float(self.weight_input.value()),
                ship_date=date.today().isoformat(),
            )
            self.weight_input.setValue(0.01)
            self.refresh_today()
        except Exception as exc:
            QMessageBox.critical(self, "保存失败", str(exc))

    def refresh_today(self) -> None:
        settlement = get_daily_settlement(self.conn, date.today().isoformat())
        rows = settlement["details"]
        self.today_table.setRowCount(len(rows))
        for row_index, row in enumerate(rows):
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
                self.today_table.setItem(row_index, col, QTableWidgetItem(str(value or "")))
