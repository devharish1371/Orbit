"""Planning acceptance uses only disposable couples and never sends notifications."""
from datetime import datetime, timedelta, timezone
import uuid
import pytest
pytestmark = pytest.mark.integration

def rpc(b, actor, name, **body):
    identity={'p_expected_user':b.users[actor], 'p_expected_couple':b.couples[1 if actor==3 else 0]}
    identity.update(body)
    return b.clients[actor].client.post('/rest/v1/rpc/'+name, json=identity)

def draft(**extra):
    result=dict(p_id=str(uuid.uuid4()),p_version=None,p_title='Disposable picnic',p_notes='Only a test',p_venue='A park',p_starts_at=(datetime.now(timezone.utc)+timedelta(days=1)).isoformat(),p_timezone='Asia/Kolkata')
    result.update(extra);return result

def test_plan_owner_confirmation_version_and_idempotent_retry(backend):
    b=backend;body=draft(); first=rpc(b,0,'save_plan',**body)
    assert first.status_code==200 and first.json()['accepted_by']==[b.users[0]]
    assert rpc(b,0,'save_plan',**body).json()['id']==body['p_id']
    assert rpc(b,0,'save_plan',**dict(body,p_title='Different payload')).status_code>=400
    for actor in (2,3):
        assert b.rest(b.clients[actor],'GET','plans',id='eq.'+body['p_id']).json()==[]
        assert rpc(b,actor,'respond_plan',p_id=body['p_id'],p_version=1,p_accept=True).status_code>=400
    assert rpc(b,1,'save_plan',**dict(body,p_version=1)).status_code>=400
    confirmed=rpc(b,1,'respond_plan',p_id=body['p_id'],p_version=1,p_accept=True)
    assert set(confirmed.json()['accepted_by'])==set(b.users[:2])
    edited=rpc(b,0,'save_plan',**dict(body,p_version=1,p_title='New date'))
    assert edited.json()['version']==2 and edited.json()['accepted_by']==[b.users[0]]
    for version in (None,1):
        assert rpc(b,1,'respond_plan',p_id=body['p_id'],p_version=version,p_accept=True).status_code>=400
        assert rpc(b,1,'set_plan_reminder',p_id=body['p_id'],p_version=version,p_minutes=30).status_code>=400
    assert rpc(b,1,'respond_plan',p_id=body['p_id'],p_version=2,p_accept=False).json()['cancelled']
    assert rpc(b,0,'save_plan',**dict(body,p_version=3)).status_code>=400

def test_plans_reject_invalid_dates_identity_and_direct_writes(backend):
    b=backend
    for values in ({'p_title':' '},{'p_starts_at':None},{'p_starts_at':'infinity'},{'p_starts_at':'2020-01-01T00:00:00Z'},{'p_timezone':'Mars/Orbit'}):
        assert rpc(b,0,'save_plan',**draft(**values)).status_code>=400
    assert rpc(b,0,'save_plan',**draft(),p_expected_user=b.users[1]).status_code>=400
    assert rpc(b,0,'save_plan',**draft(),p_expected_couple=b.couples[1]).status_code>=400
    assert b.rest(b.clients[0],'POST','plans',dict(id=str(uuid.uuid4()),couple_id=b.couples[0],created_by=b.users[0],title='Bypass',starts_at=datetime.now(timezone.utc).isoformat(),timezone='UTC')).status_code>=400

def test_ideas_private_visibility_author_rights_and_no_geofence_pin(backend):
    b=backend;identity=str(uuid.uuid4());body=dict(p_id=identity,p_version=None,p_kind='place',p_title='Disposable café',p_notes='Try this someday',p_private=True,p_archived=False)
    with b.db() as db: before=db.execute('select count(*) from public.places where couple_id=%s',(b.couples[0],)).fetchone()[0]
    assert rpc(b,0,'save_date_idea',**body).status_code==200
    assert rpc(b,0,'save_date_idea',**body).json()['id']==identity
    for actor in (1,2,3):assert b.rest(b.clients[actor],'GET','date_ideas',id='eq.'+identity).json()==[]
    shared=rpc(b,0,'save_date_idea',**dict(body,p_private=False,p_version=1));assert shared.status_code==200
    assert len(b.rest(b.clients[1],'GET','date_ideas',id='eq.'+identity).json())==1
    assert rpc(b,1,'save_date_idea',**dict(body,p_version=2)).status_code>=400
    assert rpc(b,1,'delete_date_idea',p_id=identity,p_version=2).status_code>=400
    assert rpc(b,0,'delete_date_idea',p_id=identity,p_version=1).status_code>=400
    assert rpc(b,0,'delete_date_idea',p_id=identity,p_version=2).status_code==204
    with b.db() as db: assert db.execute('select count(*) from public.places where couple_id=%s',(b.couples[0],)).fetchone()[0]==before

def test_personal_reminder_optin_and_scoped_queue_are_versioned_and_deduped(backend):
    b=backend;body=draft(p_starts_at=(datetime.now(timezone.utc)+timedelta(minutes=20)).isoformat());plan=rpc(b,0,'save_plan',**body).json()
    assert rpc(b,0,'set_plan_reminder',p_id=plan['id'],p_version=1,p_minutes=30).json()['user_id']==b.users[0]
    assert b.rest(b.clients[1],'GET','plan_reminders',plan_id='eq.'+plan['id']).json()==[]
    with b.db() as db: assert db.execute('select orbit_private.enqueue_plan_reminders_for(%s)',(b.couples[0],)).fetchone()[0]==0
    assert rpc(b,1,'respond_plan',p_id=plan['id'],p_version=1,p_accept=True).status_code==200
    with b.db() as db:
        db.execute('select orbit_private.enqueue_plan_reminders_for(%s)',(b.couples[0],))
        db.execute('select orbit_private.enqueue_plan_reminders_for(%s)',(b.couples[0],))
        jobs=db.execute("select record from orbit_private.notification_jobs where source_table='plan_reminders' and record->>'plan_id'=%s",(plan['id'],)).fetchall()
        assert len(jobs)==1 and jobs[0][0]['user_id']==b.users[0] and jobs[0][0]['version']==1
        assert set(jobs[0][0])=={'plan_id','couple_id','user_id','version','expires_at'}
        db.execute("update orbit_private.notification_jobs set status='dry_run' where source_table='plan_reminders' and record->>'plan_id'=%s",(plan['id'],))
    assert rpc(b,0,'set_plan_reminder',p_id=plan['id'],p_version=1,p_minutes=None).status_code==200
    assert rpc(b,0,'set_plan_reminder',p_id=plan['id'],p_version=1,p_minutes=7).status_code>=400
    assert rpc(b,0,'save_plan',**dict(body,p_version=1,p_title='Changed')).json()['version']==2
    with b.db() as db: assert db.execute('select orbit_private.enqueue_plan_reminders_for(%s)',(b.couples[0],)).fetchone()[0]==0

def test_concurrent_archive_and_remove_resolve_as_a_stale_write_not_a_deadlock(backend):
    from concurrent.futures import ThreadPoolExecutor
    b=backend
    for _ in range(3):
        body=dict(p_id=str(uuid.uuid4()),p_version=None,p_kind='idea',p_title='Concurrent disposable idea',p_notes='',p_private=False,p_archived=False)
        assert rpc(b,0,'save_date_idea',**body).status_code==200
        with ThreadPoolExecutor(max_workers=2) as workers:
            update=workers.submit(rpc,b,0,'save_date_idea',**dict(body,p_version=1,p_archived=True))
            remove=workers.submit(rpc,b,0,'delete_date_idea',p_id=body['p_id'],p_version=1)
            statuses=[update.result().status_code,remove.result().status_code]
        assert any(code in (200,204) for code in statuses) and all(code<500 for code in statuses)
        remaining=b.rest(b.clients[0],'GET','date_ideas',id='eq.'+body['p_id']).json()
        assert not remaining or (remaining[0]['version']==2 and remaining[0]['archived'])
