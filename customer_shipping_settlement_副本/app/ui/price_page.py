import sqlite3

from PySide6.QtWidgets import (
    QDoubleSpinBox,
    QFormLayout,
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

from app.services.price_service import list_prices, save_price


class PricePage(QWidget):
    def __init__(self, conn: sqlite3.Connection):
        super().__init__()
        self.conn = conn
        self.selected_province = ""

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)

        title = QLabel("快递价格")
        title.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(title)

        self.table = QTableWidget(0, 11)
        self.table.setHorizontalHeaderLabels([
            "省份", "1kg", "2kg", "3kg", "4kg", "5kg", "6kg",
            "超重首重kg", "超重首重价", "续重单位kg", "续重价",
        ])
        self.table.cellClicked.connect(self.select_price)
        layout.addWidget(self.table, 2)

        form = QFormLayout()
        self.province_edit = QLineEdit()
        self.price_1kg = self._spin()
        self.price_2kg = self._spin()
        self.price_3kg = self._spin()
        self.price_4kg = self._spin()
        self.price_5kg = self._spin()
        self.price_6kg = self._spin()
        self.over_base_weight = self._spin(1.0)
        self.over_base_price = self._spin()
        self.over_unit = self._spin(1.0)
        self.over_price = self._spin()
        self.remark_edit = QLineEdit()
        form.addRow("省份", self.province_edit)
        form.addRow("1kg价格", self.price_1kg)
        form.addRow("2kg价格", self.price_2kg)
        form.addRow("3kg价格", self.price_3kg)
        form.addRow("4kg价格", self.price_4kg)
        form.addRow("5kg价格", self.price_5kg)
        form.addRow("6kg价格", self.price_6kg)
        form.addRow("超重首重kg", self.over_base_weight)
        form.addRow("超重首重价格", self.over_base_price)
        form.addRow("续重单位kg", self.over_unit)
        form.addRow("续重价格", self.over_price)
        form.addRow("备注", self.remark_edit)
        layout.addLayout(form)

        actions = QHBoxLayout()
        save_button = QPushButton("保存价格")
        save_button.clicked.connect(self.save)
        actions.addWidget(save_button)
        actions.addStretch(1)
        layout.addLayout(actions)

        self.refresh()

    def _spin(self, value: float = 0.0) -> QDoubleSpinBox:
        spin = QDoubleSpinBox()
        spin.setRange(0, 99999)
        spin.setDecimals(2)
        spin.setValue(value)
        return spin

    def refresh(self) -> None:
        rows = list_prices(self.conn)
        self.table.setRowCount(len(rows))
        for row_index, row in enumerate(rows):
            values = [
                row["province"], row["price_1kg"], row["price_2kg"], row["price_3kg"],
                row["price_4kg"], row["price_5kg"], row["price_6kg"],
                row["over_base_weight_kg"], row["over_base_price"],
                row["over_additional_unit_kg"], row["over_additional_price"],
            ]
            for col, value in enumerate(values):
                self.table.setItem(row_index, col, QTableWidgetItem("" if value is None else str(value)))

    def select_price(self, row: int, _column: int) -> None:
        self.selected_province = self.table.item(row, 0).text()
        price_rows = [price for price in list_prices(self.conn) if price["province"] == self.selected_province]
        if not price_rows:
            return
        price = price_rows[0]
        self.province_edit.setText(price["province"])
        self.price_1kg.setValue(price["price_1kg"] or 0)
        self.price_2kg.setValue(price["price_2kg"] or 0)
        self.price_3kg.setValue(price["price_3kg"] or 0)
        self.price_4kg.setValue(price["price_4kg"] or 0)
        self.price_5kg.setValue(price["price_5kg"] or 0)
        self.price_6kg.setValue(price["price_6kg"] or 0)
        self.over_base_weight.setValue(price["over_base_weight_kg"] or 1)
        self.over_base_price.setValue(price["over_base_price"] or 0)
        self.over_unit.setValue(price["over_additional_unit_kg"] or 1)
        self.over_price.setValue(price["over_additional_price"] or 0)
        self.remark_edit.setText(price["remark"] or "")

    def save(self) -> None:
        if not self.province_edit.text().strip():
            QMessageBox.warning(self, "缺少省份", "请输入省份")
            return
        try:
            save_price(
                self.conn,
                {
                    "province": self.province_edit.text().strip(),
                    "price_1kg": self.price_1kg.value(),
                    "price_2kg": self.price_2kg.value(),
                    "price_3kg": self.price_3kg.value(),
                    "price_4kg": self.price_4kg.value(),
                    "price_5kg": self.price_5kg.value(),
                    "price_6kg": self.price_6kg.value(),
                    "over_base_weight_kg": self.over_base_weight.value(),
                    "over_base_price": self.over_base_price.value(),
                    "over_additional_unit_kg": self.over_unit.value(),
                    "over_additional_price": self.over_price.value(),
                    "remark": self.remark_edit.text().strip(),
                },
            )
            self.refresh()
        except Exception as exc:
            QMessageBox.critical(self, "保存失败", str(exc))
