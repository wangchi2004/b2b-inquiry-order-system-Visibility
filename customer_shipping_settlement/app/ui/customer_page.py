import sqlite3

from PySide6.QtWidgets import (
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

from app.services.customer_service import (
    deactivate_customer,
    get_customer,
    search_customers,
    update_customer,
)


class CustomerPage(QWidget):
    def __init__(self, conn: sqlite3.Connection):
        super().__init__()
        self.conn = conn
        self.selected_customer_id = None

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(12)

        title = QLabel("客户管理")
        title.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(title)

        search_row = QHBoxLayout()
        self.last4_input = QLineEdit()
        self.last4_input.setPlaceholderText("电话后4位")
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("姓名")
        self.phone_input = QLineEdit()
        self.phone_input.setPlaceholderText("完整电话")
        search_button = QPushButton("搜索")
        search_button.clicked.connect(self.refresh)
        search_row.addWidget(self.last4_input)
        search_row.addWidget(self.name_input)
        search_row.addWidget(self.phone_input)
        search_row.addWidget(search_button)
        layout.addLayout(search_row)

        self.table = QTableWidget(0, 8)
        self.table.setHorizontalHeaderLabels(["ID", "姓名", "电话", "后4位", "省份", "城市", "地址", "状态"])
        self.table.cellClicked.connect(self.select_customer)
        layout.addWidget(self.table, 2)

        form = QFormLayout()
        self.name_edit = QLineEdit()
        self.phone_edit = QLineEdit()
        self.province_edit = QLineEdit()
        self.city_edit = QLineEdit()
        self.address_edit = QLineEdit()
        self.remark_edit = QLineEdit()
        form.addRow("姓名", self.name_edit)
        form.addRow("电话", self.phone_edit)
        form.addRow("省份", self.province_edit)
        form.addRow("城市", self.city_edit)
        form.addRow("地址", self.address_edit)
        form.addRow("备注", self.remark_edit)
        layout.addLayout(form)

        actions = QHBoxLayout()
        save_button = QPushButton("保存修改")
        save_button.clicked.connect(self.save)
        deactivate_button = QPushButton("停用客户")
        deactivate_button.clicked.connect(self.deactivate)
        actions.addWidget(save_button)
        actions.addWidget(deactivate_button)
        actions.addStretch(1)
        layout.addLayout(actions)

        self.refresh()

    def refresh(self) -> None:
        rows = search_customers(
            self.conn,
            phone_last4=self.last4_input.text().strip(),
            name=self.name_input.text().strip(),
            phone=self.phone_input.text().strip(),
            active_only=False,
        )
        self.table.setRowCount(len(rows))
        for row_index, row in enumerate(rows):
            values = [
                row["id"],
                row["name"],
                row["phone"],
                row["phone_last4"],
                row["province"],
                row["city"],
                row["address"],
                "启用" if row["is_active"] else "停用",
            ]
            for col, value in enumerate(values):
                self.table.setItem(row_index, col, QTableWidgetItem(str(value or "")))

    def select_customer(self, row: int, _column: int) -> None:
        self.selected_customer_id = int(self.table.item(row, 0).text())
        customer = get_customer(self.conn, self.selected_customer_id)
        self.name_edit.setText(customer["name"] or "")
        self.phone_edit.setText(customer["phone"] or "")
        self.province_edit.setText(customer["province"] or "")
        self.city_edit.setText(customer["city"] or "")
        self.address_edit.setText(customer["address"] or "")
        self.remark_edit.setText(customer["remark"] or "")

    def save(self) -> None:
        if self.selected_customer_id is None:
            QMessageBox.warning(self, "缺少客户", "请先选择客户")
            return
        try:
            update_customer(
                self.conn,
                self.selected_customer_id,
                {
                    "name": self.name_edit.text().strip(),
                    "phone": self.phone_edit.text().strip(),
                    "province": self.province_edit.text().strip(),
                    "city": self.city_edit.text().strip(),
                    "address": self.address_edit.text().strip(),
                    "remark": self.remark_edit.text().strip(),
                },
            )
            self.refresh()
        except Exception as exc:
            QMessageBox.critical(self, "保存失败", str(exc))

    def deactivate(self) -> None:
        if self.selected_customer_id is None:
            QMessageBox.warning(self, "缺少客户", "请先选择客户")
            return
        deactivate_customer(self.conn, self.selected_customer_id)
        self.refresh()
