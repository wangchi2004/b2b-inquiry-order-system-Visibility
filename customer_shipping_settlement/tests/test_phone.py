from app.utils.phone import clean_phone, phone_last4


def test_clean_phone_keeps_digits_only():
    assert clean_phone("电话: 186-2409-0227") == "18624090227"


def test_phone_last4_returns_last_four_digits():
    assert phone_last4("18624090227") == "0227"


def test_phone_last4_handles_short_values():
    assert phone_last4("123") == "123"
