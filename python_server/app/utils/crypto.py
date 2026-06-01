import os
from cryptography.fernet import Fernet

_PREFIX = "enc:"


def _get_fernet() -> Fernet | None:
    key = os.getenv("FIELD_ENCRYPTION_KEY", "")
    if not key:
        return None
    return Fernet(key.encode())


def encrypt_field(value: str | None) -> str | None:
    """Encrypt a credential string. Returns value unchanged if no key is configured."""
    if not value:
        return value
    f = _get_fernet()
    if f is None:
        return value
    return _PREFIX + f.encrypt(value.encode()).decode()


def decrypt_field(value: str | None) -> str | None:
    """Decrypt a credential string. Handles legacy plaintext rows transparently."""
    if not value:
        return value
    if not value.startswith(_PREFIX):
        return value  # legacy plaintext — return as-is
    f = _get_fernet()
    if f is None:
        return value
    return f.decrypt(value[len(_PREFIX):].encode()).decode()
