import re


def clean_phone(value: object) -> str:
    if value is None:
        return ""
    return re.sub(r"\D+", "", str(value))


def phone_last4(phone: str) -> str:
    return phone[-4:]
