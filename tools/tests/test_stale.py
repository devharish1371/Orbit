from __future__ import annotations
from datetime import datetime, timezone
import pytest

pytestmark = pytest.mark.integration


def test_location_upsert_stale_dedupe_and_resume(backend) -> None:
    row={'user_id':backend.users[0],'couple_id':backend.couples[0],'lat':13,'lng':80,'recorded_at':datetime.now(timezone.utc).isoformat()}
    for _ in range(2):
        response=backend.clients[0].client.post('/rest/v1/live_location?on_conflict=user_id',json=row,headers={'Prefer':'resolution=merge-duplicates,return=representation'})
        assert response.status_code in (200,201)
    with backend.db() as db:
        # The production trigger always uses server time. Owner-only timestamp setup
        # is transactional and restored before commit; no bypass exists in app code.
        db.execute('alter table public.live_location disable trigger trg_ll_write')
        db.execute("update public.live_location set updated_at=now()-interval '31 minutes' where user_id=%s",(backend.users[0],))
        db.execute('alter table public.live_location enable trigger trg_ll_write')
        db.execute('select orbit_private.check_stale_members()')
        db.execute('select orbit_private.check_stale_members()')
        count=db.execute("select count(*) from public.events where user_id=%s and type='sharing_stopped'",(backend.users[0],)).fetchone()[0]
        assert count == 1
    response=backend.clients[0].client.post('/rest/v1/live_location?on_conflict=user_id',json=row,headers={'Prefer':'resolution=merge-duplicates,return=representation'})
    assert response.status_code in (200,201)
    with backend.db() as db:
        assert db.execute("select count(*) from public.events where user_id=%s and type='sharing_resumed'",(backend.users[0],)).fetchone()[0] == 1
        assert db.execute('select stale_notified from public.members where user_id=%s',(backend.users[0],)).fetchone() == (False,)


def test_pause_rejects_location_and_surprise_requires_fuzzed_data(backend) -> None:
    actor=backend.clients[0]
    member='eq.'+backend.users[0]
    row={'user_id':backend.users[0],'couple_id':backend.couples[0],'lat':13.01,'lng':80.01,'recorded_at':datetime.now(timezone.utc).isoformat()}
    assert backend.rest(actor,'PATCH','members',{'share_mode':'paused'},user_id=member).status_code == 200
    try:
        assert backend.rest(actor,'PATCH','live_location',row,user_id=member).status_code >= 400
        assert backend.rest(actor,'PATCH','members',{'share_mode':'surprise'},user_id=member).status_code == 200
        assert backend.rest(actor,'PATCH','live_location',row,user_id=member).status_code >= 400
        assert backend.rest(actor,'PATCH','live_location',{**row,'fuzzed':True,'speed_mps':None,'heading':None},user_id=member).status_code == 200
    finally:
        assert backend.rest(actor,'PATCH','members',{'share_mode':'live'},user_id=member).status_code == 200
