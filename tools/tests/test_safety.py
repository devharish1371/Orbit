"""Safety acceptance uses disposable identities; no real tokens or alerts are sent."""
from datetime import datetime,timedelta,timezone
import uuid
import pytest
from tools.tests.test_plans import rpc
pytestmark=pytest.mark.integration

def draft(**extra):
 body=dict(p_id=str(uuid.uuid4()),p_request=str(uuid.uuid4()),p_version=None,p_action='start',p_destination='Disposable destination',p_deadline=(datetime.now(timezone.utc)+timedelta(minutes=20)).isoformat(),p_share=False)
 body.update(extra);return body

def action(b,body,verb,version=1,actor=0,**extra):
 return rpc(b,actor,'save_safety_journey',p_id=body['p_id'],p_version=version,p_request=str(uuid.uuid4()),p_action=verb,**extra)

def close(b,body,version=1):
 r=action(b,body,'cancel',version);assert r.status_code==200

def test_private_owner_identity_idempotence_and_cross_couple(backend):
 b=backend;body=draft();first=rpc(b,0,'save_safety_journey',**body);assert first.status_code==200,first.text
 assert first.json()['state']=='active' and not first.json()['share_overdue']
 assert rpc(b,0,'save_safety_journey',**body).json()['version']==1
 assert rpc(b,0,'save_safety_journey',**dict(body,p_destination='Different')).status_code>=400
 for actor in (1,2,3):
  assert b.rest(b.clients[actor],'GET','safety_journeys',id='eq.'+body['p_id']).json()==[]
  assert action(b,body,'cancel',actor=actor).status_code>=400
 assert rpc(b,0,'save_safety_journey',**draft(),p_expected_user=b.users[1]).status_code>=400
 assert rpc(b,0,'save_safety_journey',**draft(),p_expected_couple=b.couples[1]).status_code>=400
 assert b.rest(b.clients[0],'PATCH','safety_journeys',{'share_overdue':True},id='eq.'+body['p_id']).status_code>=400
 close(b,body)

def test_extend_checkin_stale_actions_and_exact_request_retry(backend):
 b=backend;body=draft();assert rpc(b,0,'save_safety_journey',**body).status_code==200
 extended=action(b,body,'extend',p_deadline=(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat());assert extended.json()['version']==2
 assert action(b,body,'check_in',1).status_code>=400
 request=dict(p_id=body['p_id'],p_version=2,p_request=str(uuid.uuid4()),p_action='check_in')
 assert rpc(b,0,'save_safety_journey',**request).json()['state']=='checked_in'
 assert rpc(b,0,'save_safety_journey',**request).json()['version']==3
 assert action(b,body,'extend',3,p_deadline=(datetime.now(timezone.utc)+timedelta(hours=2)).isoformat()).status_code>=400


def test_deadline_validation_and_one_active_timer(backend):
 b=backend
 for change in ({'p_destination':' '},{'p_deadline':None},{'p_deadline':'infinity'},{'p_deadline':datetime.now(timezone.utc).isoformat()},{'p_deadline':(datetime.now(timezone.utc)+timedelta(days=2)).isoformat()},{'p_share':None}):
  assert rpc(b,0,'save_safety_journey',**draft(**change)).status_code>=400
 body=draft();assert rpc(b,0,'save_safety_journey',**body).status_code==200
 assert rpc(b,0,'save_safety_journey',**draft()).status_code>=400
 assert action(b,body,'extend',p_deadline=body['p_deadline']).status_code>=400
 close(b,body)


def test_scoped_overdue_queue_consent_privacy_version_and_expiry(backend):
 b=backend;body=draft(p_share=True)
 with b.db() as db:db.execute("update public.members set share_mode='live',notify_prefs=notify_prefs-'safety' where couple_id=%s",(b.couples[0],))
 assert rpc(b,0,'save_safety_journey',**body).status_code==200
 assert len(b.rest(b.clients[1],'GET','safety_journeys',id='eq.'+body['p_id']).json())==1
 with b.db() as db:
  db.execute("update public.safety_journeys set deadline=now()-interval '1 minute' where id=%s",(body['p_id'],))
  assert db.execute('select orbit_private.enqueue_safety_journeys_for(%s)',(b.couples[0],)).fetchone()[0]==0
  db.execute("update public.members set notify_prefs=notify_prefs||'{\"safety\":true}'::jsonb where user_id=%s",(b.users[1],))
  db.execute("update public.members set share_mode='paused' where user_id=%s",(b.users[0],))
  assert db.execute('select orbit_private.enqueue_safety_journeys_for(%s)',(b.couples[0],)).fetchone()[0]==0
 assert b.rest(b.clients[1],'GET','safety_journeys',id='eq.'+body['p_id']).json()==[]
 with b.db() as db:
  db.execute("update public.members set share_mode='surprise' where user_id=%s",(b.users[0],))
  assert db.execute('select orbit_private.enqueue_safety_journeys_for(%s)',(b.couples[0],)).fetchone()[0]==0
  db.execute("update public.members set share_mode='live' where user_id=%s",(b.users[0],))
  assert db.execute('select orbit_private.enqueue_safety_journeys_for(%s)',(b.couples[0],)).fetchone()[0]==1
  assert db.execute('select orbit_private.enqueue_safety_journeys_for(%s)',(b.couples[0],)).fetchone()[0]==0
  jobs=db.execute("select id,record from orbit_private.notification_jobs where source_table='safety_journeys' and record->>'journey_id'=%s",(body['p_id'],)).fetchall()
  assert len(jobs)==1 and set(jobs[0][1])=={'journey_id','couple_id','user_id','version','expires_at'}
  db.execute("update orbit_private.notification_jobs set status='dry_run' where id=%s",(jobs[0][0],))
 assert rpc(b,0,'safety_journey_delivery',p_id=body['p_id']).json()['status']=='dry_run'
 assert rpc(b,1,'safety_journey_delivery',p_id=body['p_id']).status_code>=400
 assert action(b,body,'check_in').status_code==200
 assert rpc(b,0,'safety_journey_delivery',p_id=body['p_id']).json()['status']=='closed'
 # Restore disposable policy to avoid affecting independent acceptance tests.
 with b.db() as db:db.execute("update public.members set share_mode='live',notify_prefs=notify_prefs-'safety' where couple_id=%s",(b.couples[0],))

def test_concurrent_extend_and_checkin_serialize_without_duplicate_active_state(backend):
 from concurrent.futures import ThreadPoolExecutor
 b=backend;body=draft();assert rpc(b,0,'save_safety_journey',**body).status_code==200
 with ThreadPoolExecutor(max_workers=2) as pool:
  extension=pool.submit(action,b,body,'extend',p_deadline=(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat())
  checkin=pool.submit(action,b,body,'check_in')
  codes=[extension.result().status_code,checkin.result().status_code]
 assert codes.count(200)==1 and all(code<500 for code in codes)
 row=b.rest(b.clients[0],'GET','safety_journeys',id='eq.'+body['p_id']).json()[0]
 assert row['version']==2
 if row['state']=='active':close(b,body,2)
