from dataclasses import asdict, dataclass
from math import ceil
from typing import Optional


@dataclass
class PriceRule:
    province: str
    price_1kg: Optional[float]
    price_2kg: Optional[float]
    price_3kg: Optional[float]
    price_4kg: Optional[float]
    price_5kg: Optional[float]
    price_6kg: Optional[float]
    over_base_weight_kg: float
    over_base_price: Optional[float]
    over_additional_unit_kg: float
    over_additional_price: Optional[float]

    def snapshot(self) -> dict:
        return asdict(self)


@dataclass
class ShippingFeeResult:
    actual_weight_kg: float
    billing_weight_kg: int
    shipping_fee: float
    price_snapshot: dict


def calculate_shipping_fee(actual_weight_kg: float, rule: PriceRule) -> ShippingFeeResult:
    if actual_weight_kg <= 0:
        raise ValueError("重量必须大于0")

    billing_weight = ceil(actual_weight_kg)
    tier_prices = {
        1: rule.price_1kg,
        2: rule.price_2kg,
        3: rule.price_3kg,
        4: rule.price_4kg,
        5: rule.price_5kg,
        6: rule.price_6kg,
    }

    if billing_weight <= 6:
        price = tier_prices[billing_weight]
        if price is None:
            raise ValueError(f"该省份缺少{billing_weight}kg价格")
        fee = float(price)
    else:
        if rule.over_base_price is None or rule.over_additional_price is None:
            raise ValueError("该省份缺少6kg以上价格")
        if rule.over_base_weight_kg <= 0 or rule.over_additional_unit_kg <= 0:
            raise ValueError("价格规则重量单位必须大于0")
        extra_units = ceil(
            (actual_weight_kg - rule.over_base_weight_kg)
            / rule.over_additional_unit_kg
        )
        fee = float(rule.over_base_price) + extra_units * float(
            rule.over_additional_price
        )

    return ShippingFeeResult(
        actual_weight_kg=actual_weight_kg,
        billing_weight_kg=billing_weight,
        shipping_fee=round(fee, 2),
        price_snapshot=rule.snapshot(),
    )
