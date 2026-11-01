"""Hosted refresh tests use disposable couples and never send FCM or real-user requests."""
from datetime import datetime, timedelta, timezone
import pytest

pytestmark = pytest.mark.integration


def request(backend, actor=0, target=1):
    return backend.clients[actor].client.post('/rest/v1/rpc/request_location_refresh', json={'p_user_id': backend.users[target]})


def test_refresh_is_mutual_private_bounded_and_deduplicated(backend):
    first = request(backend)
    assert first.status_code == 200
    row = first.json()
    assert row['user_id'] == backend.users[1]
    assert datetime.fromisoformat(row['expires_at']) - datetime.fromisoformat(row['requested_at']) == timedelta(minutes=2)
    assert request(backend).json()['requested_at'] == row['requested_at']
    assert request(backend, actor=1, target=0).status_code == 200
    for actor in (0, 1):
        rows = backend.rest(backend.clients[actor], 'GET', 'location_refresh').json()
        assert {r['user_id'] for r in rows} == set(backend.users[:2])
    for actor in (2, 3):
        assert backend.rest(backend.clients[actor], 'GET', 'location_refresh').json() == []
        assert request(backend, actor=actor).status_code >= 400
    assert request(backend, target=3).status_code >= 400
    assert request(backend, target=0).status_code == 200
    assert backend.rest(backend.clients[0], 'PATCH', 'location_refresh', {'expires_at': (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()}, user_id='eq.'+backend.users[1]).status_code >= 400
    assert backend.rest(backend.clients[0], 'POST', 'location_refresh', row).status_code >= 400


def test_refresh_cannot_resume_or_cross_privacy_generations(backend):
    user = backend.users[1]
    try:
        before = request(backend).json()
        backend.rest(backend.clients[1], 'PATCH', 'members', {'share_mode': 'paused'}, user_id='eq.'+user).raise_for_status()
        assert request(backend).status_code >= 400
        backend.rest(backend.clients[1], 'PATCH', 'members', {'share_mode': 'surprise'}, user_id='eq.'+user).raise_for_status()
        response = request(backend)
        assert response.status_code == 200
        assert response.json()['location_epoch'] > before['location_epoch']
        member = backend.rest(backend.clients[1], 'GET', 'members', user_id='eq.'+user).json()[0]
        assert member['share_mode'] == 'surprise'
        assert response.json()['location_epoch'] == member['location_epoch']
    finally:
        backend.rest(backend.clients[1], 'PATCH', 'members', {'share_mode': 'live'}, user_id='eq.'+user)
