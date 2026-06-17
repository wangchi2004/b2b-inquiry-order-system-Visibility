import pytest

from app.utils.shipping_fee import PriceRule, calculate_shipping_fee


def sample_rule():
    return PriceRule(
        province="辽宁省",
        price_1kg=2.1,
        price_2kg=2.5,
        price_3kg=3.0,
        price_4kg=4.0,
        price_5kg=5.0,
        price_6kg=6.5,
        over_base_weight_kg=1.0,
        over_base_price=3.0,
        over_additional_unit_kg=1.0,
        over_additional_price=1.0,
    )


@pytest.mark.parametrize(
    ("actual_weight", "billing_weight", "fee"),
    [
        (0.7, 1, 2.1),
        (1.0, 1, 2.1),
        (1.5, 2, 2.5),
        (5.5, 6, 6.5),
        (6.0, 6, 6.5),
        (6.1, 7, 9.0),
    ],
)
def test_calculates_fee(actual_weight, billing_weight, fee):
    result = calculate_shipping_fee(actual_weight, sample_rule())
    assert result.billing_weight_kg == billing_weight
    assert result.shipping_fee == fee


def test_rejects_zero_weight():
    with pytest.raises(ValueError, match="重量必须大于0"):
        calculate_shipping_fee(0, sample_rule())


def test_rejects_missing_tier_price():
    rule = sample_rule()
    rule.price_2kg = None
    with pytest.raises(ValueError, match="缺少2kg价格"):
        calculate_shipping_fee(1.5, rule)
