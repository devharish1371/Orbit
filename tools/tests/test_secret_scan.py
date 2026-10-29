import base64
import json
from pathlib import Path

from tools.secret_scan import findings


def test_templates_and_documentation_are_allowed() -> None:
    assert findings(Path(".env.tools.example"), "SUPABASE_SERVICE_ROLE_KEY=\n") == []
    assert findings(Path("README.md"), "sb_secret and service_role are never committed.") == []


def test_secret_material_is_detected_without_returning_the_value() -> None:
    value = "sb_" + "secret_" + "a" * 30
    assert findings(Path("oops.ts"), value) == ["Supabase secret key"]
    assert findings(Path(".env.tools"), "") == ["sensitive filename"]


def test_privileged_legacy_jwt_is_detected() -> None:
    encode = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip("=")
    token = ".".join([encode({"alg": "HS256"}), encode({"role": "service_role"}), "fake-signature"])
    assert findings(Path("oops.ts"), token) == ["privileged JWT"]


def test_account_tokens_and_database_passwords_are_detected() -> None:
    assert findings(Path('oops.txt'), 'sb' + 'p_' + 'a' * 40) == ['Supabase account token']
    uri = 'postgresql' + '://account:' + 'dummy-value' + '@host/database'
    assert findings(Path('oops.txt'), uri) == ['Database password in URI']
