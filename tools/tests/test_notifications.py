"""Notification security tests use disposable identities and never message real devices."""
import uuid
import httpx
import pytest
pytestmark=pytest.mark.integration

def test_attention_derives_actor_is_retry_safe_and_rate_limited(backend):
    def send(actor,kind,event_id):return backend.clients[actor].client.post('/rest/v1/rpc/send_attention',json={'p_type':kind,'p_id':event_id})
    event_id=str(uuid.uuid4())
    for _ in range(2):assert send(0,'nudge',event_id).status_code==200
    row=backend.rest(backend.clients[0],'GET','events',id='eq.'+event_id).json()[0]
    assert row['user_id']==backend.users[0] and row['couple_id']==backend.couples[0]
    assert send(0,'nudge',str(uuid.uuid4())).status_code>=400
    assert send(2,'sos',str(uuid.uuid4())).status_code>=400
    assert send(0,'sharing_stopped',str(uuid.uuid4())).status_code>=400
    assert backend.rest(backend.clients[0],'POST','events',{'couple_id':backend.couples[0],'user_id':backend.users[0],'type':'sos'}).status_code>=400

def test_notification_queue_and_dedupe_are_service_only_and_atomic(backend):
    for client in backend.clients[:3]:
        for name,body in [('claim_notification_jobs',{}),('reserve_notification',{'p_id':str(uuid.uuid4()),'p_key':'test'}),('finish_notification',{'p_id':str(uuid.uuid4()),'p_status':'sent'})]:
            assert client.client.post('/rest/v1/rpc/'+name,json=body).status_code>=400
    with backend.db() as db:
        ids=[str(uuid.uuid4()),str(uuid.uuid4())];key='disposable:'+str(uuid.uuid4())
        try:
            assert db.execute('select public.reserve_notification(%s,%s)',(ids[0],key)).fetchone()[0]
            assert db.execute('select public.reserve_notification(%s,%s)',(ids[0],key)).fetchone()[0]
            assert not db.execute('select public.reserve_notification(%s,%s)',(ids[1],key)).fetchone()[0]
            db.execute("update orbit_private.notification_dedupe set claimed_at=now()-interval '121 seconds' where key=%s",(key,))
            assert db.execute('select public.reserve_notification(%s,%s)',(ids[1],key)).fetchone()[0]
        finally:db.execute('delete from orbit_private.notification_dedupe where key=%s',(key,))

def test_notification_queue_copies_metadata_only_and_preferences_reject_non_booleans(backend):
    row=backend.post(body='private message content')
    with backend.db() as db:
        record=db.execute("select record from orbit_private.notification_jobs where record->>'id'=%s",(row['id'],)).fetchone()[0]
        assert 'body' not in record and 'media_path' not in record and 'lat' not in record
    result=backend.rest(backend.clients[0],'PATCH','members',{'notify_prefs':{'nudge':'yes'}},user_id='eq.'+backend.users[0])
    assert result.status_code>=400

def test_notify_endpoint_rejects_untrusted_requests_and_dry_runs_disposable_job(backend):
    endpoint=backend.url+'/functions/v1/notify'
    assert httpx.post(endpoint,json={},timeout=30).status_code==403
    assert httpx.post(endpoint,json={},headers={'x-orbit-secret':'wrong'},timeout=30).status_code==403
    # No tokens are registered for this disposable couple; this cannot reach a real phone.
    row=backend.post()
    with backend.db() as db:
        job=db.execute("select id from orbit_private.notification_jobs where record->>'id'=%s",(row['id'],)).fetchone()[0]
    response=httpx.post(endpoint,json={'job_id':str(job)},headers={'x-orbit-secret':backend.fn_secret},timeout=60)
    assert response.status_code==200 and 'error' not in response.json()
