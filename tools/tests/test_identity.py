import pytest
from tools.orbit_common import normalized_email, phone_email


def test_phone_normalization() -> None:
    assert phone_email('+91 (98765) 43210') == 'u919876543210@example.com'


def test_email_otp_identity_normalization() -> None:
    assert normalized_email('  Person@Example.com ') == 'person@example.com'
    with pytest.raises(ValueError):
        normalized_email('not-an-email')


@pytest.mark.parametrize('phone', ['9876543210', '+000000000', '+91invalid', '+1', '+1234567890123456'])
def test_invalid_phones(phone: str) -> None:
    with pytest.raises(ValueError):
        phone_email(phone)
