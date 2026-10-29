"""Live tests use disposable identities, never the permanent couple accounts."""
from __future__ import annotations

import io
import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterator
from urllib.parse import quote

import httpx
import psycopg
import pytest
from PIL import Image

from tools.orbit_common import Api, settings


def pytest_addoption(parser) -> None:
    parser.addoption('--run-integration', action='store_true', help='Use the configured hosted Supabase project and disposable test data.')


@dataclass
class Backend:
    url: str
    public_key: str
    fn_secret: str
    db_url: str
    admin: Api
    users: list[str] = field(default_factory=list)
    clients: list[Api] = field(default_factory=list)
    couples: list[str] = field(default_factory=list)
    paths: list[str] = field(default_factory=list)

    def db(self) -> psycopg.Connection:
        return psycopg.connect(self.db_url, sslmode='require', connect_timeout=15)

    def rest(self, client: Api, method: str, table: str, body=None, **params) -> httpx.Response:
        return client.client.request(method, '/rest/v1/' + table, json=body, params=params, headers={'Prefer': 'return=representation'})

    def post(self, actor: int = 0, **values) -> dict:
        body = {'id': str(uuid.uuid4()), 'couple_id': self.couples[0], 'author_id': self.users[actor], 'channel': 'moment', 'kind': 'text', 'body': 'disposable integration post'}
        body.update(values)
        response = self.rest(self.clients[actor], 'POST', 'posts', body)
        assert response.status_code == 201, 'Post setup failed: HTTP ' + str(response.status_code)
        return response.json()[0]

    def upload(self, actor: int = 0, *, post_id: str | None = None, avatar: bool = False) -> str:
        name = ('avatar_' if avatar else '') + (post_id or str(uuid.uuid4())) + '.png'
        path = self.couples[0] + '/' + self.users[actor] + '/' + name
        data = io.BytesIO()
        Image.new('RGB', (2, 2), '#7c5cff').save(data, format='PNG')
        response = self.clients[actor].client.post('/storage/v1/object/media/' + path, content=data.getvalue(), headers={'Content-Type': 'image/png'})
        assert response.status_code == 200, 'Upload setup failed: HTTP ' + str(response.status_code)
        self.paths.append(path)
        return path

    def retention(self, *, authorized: bool = True) -> httpx.Response:
        return httpx.post(self.url + '/functions/v1/retention', headers={'x-orbit-secret': self.fn_secret} if authorized else {}, timeout=120)


@pytest.fixture(scope='session')
def backend(request) -> Iterator[Backend]:
    if not request.config.getoption('--run-integration'):
        pytest.skip('Explicit --run-integration required for hosted tests')
    v = settings('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL', 'ORBIT_FN_SECRET')
    admin = Api(v['SUPABASE_URL'], v['SUPABASE_SERVICE_ROLE_KEY'])
    b = Backend(v['SUPABASE_URL'], v['SUPABASE_ANON_KEY'], v['ORBIT_FN_SECRET'], v['SUPABASE_DB_URL'], admin)
    try:
        for index in range(4):
            email = f'orbit-test-{uuid.uuid4().hex}-{index}@example.com'
            password = secrets.token_urlsafe(24)
            response = admin.request('POST', '/auth/v1/admin/users', json={'email': email, 'password': password, 'email_confirm': True})
            b.users.append(response.json()['id'])
            public = Api(b.url, b.public_key)
            try:
                session = public.request('POST', '/auth/v1/token?grant_type=password', json={'email': email, 'password': password}).json()
                b.clients.append(Api(b.url, b.public_key, session['access_token']))
            finally:
                public.close()
        b.couples = [str(uuid.uuid4()), str(uuid.uuid4())]
        with b.db() as db:
            for couple in b.couples:
                db.execute("insert into public.couples(id,name) values(%s,'Disposable integration fixture')", (couple,))
            for actor, couple in [(0, b.couples[0]), (1, b.couples[0]), (3, b.couples[1])]:
                db.execute('insert into public.members(user_id,couple_id,display_name) values(%s,%s,%s)', (b.users[actor], couple, 'Test ' + str(actor)))
        yield b
    finally:
        # Storage deletion ALWAYS uses the API, even in test teardown.
        if b.paths:
            admin.request('DELETE', '/storage/v1/object/media', json={'prefixes': b.paths})
        with b.db() as db:
            db.execute('delete from public.media_gc where path=any(%s)', (b.paths,))
            db.execute('delete from public.couples where id=any(%s::uuid[])', (b.couples,))
        for user_id in b.users:
            admin.request('DELETE', '/auth/v1/admin/users/' + user_id)
        for client in b.clients:
            client.close()
        admin.close()
