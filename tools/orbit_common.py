"""Shared, deliberately quiet configuration and authenticated API helpers."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import httpx
import psycopg
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


def settings(*keys: str) -> dict[str, str]:
    values = {k: v or '' for k, v in dotenv_values(ROOT / '.env.tools').items()}
    missing = [k for k in keys if not values.get(k) or '<' in values[k] or 'XXXXX' in values[k]]
    if missing:
        raise ValueError('Fill .env.tools locally: ' + ', '.join(missing))
    return values


def phone_email(phone: str) -> str:
    digits = re.sub(r'[\s()-]', '', phone)
    if not re.fullmatch(r'\+[1-9]\d{7,14}', digits):
        raise ValueError('Phone must use E.164 format, for example +91 followed by ten digits.')
    return 'u' + digits[1:] + '@example.com'


def normalized_email(email: str) -> str:
    value = email.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
        raise ValueError('Use a valid email address.')
    return value


def database() -> psycopg.Connection:
    return psycopg.connect(settings('SUPABASE_DB_URL')['SUPABASE_DB_URL'], sslmode='require', connect_timeout=15)


class Api:
    def __init__(self, url: str, key: str, jwt: str | None = None) -> None:
        self.url = url.rstrip('/')
        self.headers = {'apikey': key}
        if jwt:
            self.headers['Authorization'] = 'Bearer ' + jwt
        elif key.startswith('eyJ'):
            self.headers['Authorization'] = 'Bearer ' + key
        self.client = httpx.Client(base_url=self.url, headers=self.headers, timeout=30)

    def request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        # Any is confined to httpx's heterogeneous request keyword arguments.
        result = self.client.request(method, path, **kwargs)
        if result.is_error:
            # Never include response bodies/DSNs/headers; these can contain submitted data.
            try:
                data = result.json()
                code = str(data.get('code') or data.get('error_code') or '')
            except ValueError:
                code = ''
            raise RuntimeError(f'API request failed: HTTP {result.status_code}, code {code}')
        return result

    def close(self) -> None:
        self.client.close()


def admin_api() -> Api:
    v = settings('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
    return Api(v['SUPABASE_URL'], v['SUPABASE_SERVICE_ROLE_KEY'])


def password_minimum() -> int:
    """Read the hosted policy; never lower it or send a candidate password."""
    v = settings('SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF')
    response = httpx.get(
        'https://api.supabase.com/v1/projects/' + v['SUPABASE_PROJECT_REF'] + '/config/auth',
        headers={'Authorization': 'Bearer ' + v['SUPABASE_ACCESS_TOKEN']}, timeout=25,
    )
    if not response.is_success:
        raise RuntimeError('Could not read the hosted password policy; HTTP ' + str(response.status_code))
    return max(6, int(response.json().get('password_min_length', 6)))
