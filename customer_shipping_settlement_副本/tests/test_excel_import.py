from pathlib import Path

from app.services.excel_import_service import parse_customer_workbook, parse_price_workbook


CUSTOMER_FILE = Path("/Users/chiwang/Desktop/会员资料_加省份完成.xlsx")
PRICE_FILE = Path("/Users/chiwang/Downloads/9月20政策调价1.6.xlsx")


def test_parse_customer_workbook_reads_known_first_row():
    rows = parse_customer_workbook(CUSTOMER_FILE)
    first = rows[0]
    assert first["province"] == "辽宁省"
    assert first["city"] == "沈阳"
    assert first["name"] == "王驰"
    assert first["phone"] == "18624090227"
    assert first["phone_last4"] == "0227"


def test_parse_price_workbook_reads_liaoning_rule():
    rows = parse_price_workbook(PRICE_FILE)
    liaoning = next(row for row in rows if row["province"] == "辽宁省")
    assert liaoning["price_1kg"] == 2.1
    assert liaoning["price_2kg"] == 2.5
    assert liaoning["price_6kg"] == 6.5
    assert liaoning["over_base_price"] == 3
    assert liaoning["over_additional_price"] == 1
