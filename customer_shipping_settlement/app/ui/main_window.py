import sqlite3

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QListWidget,
    QListWidgetItem,
    QHBoxLayout,
    QMainWindow,
    QStackedWidget,
    QWidget,
)

from app.ui.backup_page import BackupPage
from app.ui.customer_page import CustomerPage
from app.ui.daily_settlement_page import DailySettlementPage
from app.ui.import_export_page import ImportExportPage
from app.ui.monthly_settlement_page import MonthlySettlementPage
from app.ui.price_page import PricePage
from app.ui.shipment_page import ShipmentPage


class MainWindow(QMainWindow):
    def __init__(self, conn: sqlite3.Connection):
        super().__init__()
        self.conn = conn
        self.setWindowTitle("客户快递自动结算软件")
        self.resize(1200, 760)

        root = QWidget()
        layout = QHBoxLayout(root)
        layout.setContentsMargins(0, 0, 0, 0)

        self.nav = QListWidget()
        self.nav.setFixedWidth(180)
        self.nav.setSpacing(2)
        layout.addWidget(self.nav)

        self.pages = QStackedWidget()
        layout.addWidget(self.pages, 1)

        self._add_page("发货录入", ShipmentPage(conn))
        self._add_page("客户管理", CustomerPage(conn))
        self._add_page("快递价格", PricePage(conn))
        self._add_page("每日结算", DailySettlementPage(conn))
        self._add_page("月度结算", MonthlySettlementPage(conn))
        self._add_page("Excel 导入导出", ImportExportPage(conn))
        self._add_page("备份恢复", BackupPage(conn))

        self.nav.currentRowChanged.connect(self.pages.setCurrentIndex)
        self.nav.setCurrentRow(0)
        self.setCentralWidget(root)

    def _add_page(self, title: str, page: QWidget) -> None:
        item = QListWidgetItem(title)
        item.setTextAlignment(Qt.AlignCenter)
        self.nav.addItem(item)
        self.pages.addWidget(page)
