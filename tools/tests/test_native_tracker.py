from __future__ import annotations
from datetime import datetime,timedelta,timezone
import uuid
import pytest
pytestmark=pytest.mark.integration

def fix(**values):
    result={'client_id':str(uuid.uuid4()),'lat':13.08,'lng':80.27,'accuracy_m':10,'speed_mps':1.2,'heading':90,'battery_pct':14,'charging':False,'history':True,'recorded_at':datetime.now(timezone.utc).isoformat()}
    result.update(values);return result

def member(backend):
    return backend.rest(backend.clients[0],'GET','members',user_id='eq.'+backend.users[0]).json()[0]

def send(backend,epoch,fixes,transitions=None,actor=0,**extra):
    return backend.clients[actor].client.post('/rest/v1/rpc/submit_locations',json={'p_epoch':epoch,'p_fixes':fixes,'p_transitions':transitions or [],**extra})

def test_native_ingest_is_retry_safe_and_does_not_regress_latest(backend):
    epoch=member(backend)['location_epoch'];row=fix()
    for _ in range(2):assert send(backend,epoch,[row]).status_code==200
    history=backend.rest(backend.clients[0],'GET','location_history',client_id='eq.'+row['client_id']).json()
    assert len(history)==1
    older=fix(lat=12,recorded_at=(datetime.now(timezone.utc)-timedelta(hours=1)).isoformat())
    assert send(backend,epoch,[older]).status_code==200
    live=backend.rest(backend.clients[0],'GET','live_location',user_id='eq.'+backend.users[0]).json()[0]
    assert live['lat']==row['lat']

def test_native_ingest_privacy_generations_and_surprise_blur(backend):
    epoch=member(backend)['location_epoch']
    assert backend.rest(backend.clients[0],'PATCH','members',{'location_epoch':0},user_id='eq.'+backend.users[0]).status_code>=400
    try:
        backend.rest(backend.clients[0],'PATCH','members',{'share_mode':'paused'},user_id='eq.'+backend.users[0])
        assert send(backend,epoch,[fix()]).status_code>=400
        backend.rest(backend.clients[0],'PATCH','members',{'share_mode':'surprise'},user_id='eq.'+backend.users[0])
        assert send(backend,epoch,[fix()]).status_code>=400
        current=member(backend)['location_epoch'];row=fix()
        assert send(backend,current,[row]).status_code==200
        live=backend.rest(backend.clients[0],'GET','live_location',user_id='eq.'+backend.users[0]).json()[0]
        assert live['fuzzed'] and live['lat']!=row['lat'] and live['speed_mps'] is None and live['heading'] is None
        assert backend.rest(backend.clients[0],'GET','location_history',client_id='eq.'+row['client_id']).json()==[]
    finally:backend.rest(backend.clients[0],'PATCH','members',{'share_mode':'live'},user_id='eq.'+backend.users[0])

def test_native_ingest_rejects_strangers_and_invalid_batches(backend):
    epoch=member(backend)['location_epoch']
    assert send(backend,epoch,[fix()],actor=2).status_code>=400
    assert send(backend,None,[fix()]).status_code>=400
    assert send(backend,epoch,[fix(client_id=None)]).status_code>=400
    assert send(backend,epoch,[fix(lat=91)]).status_code>=400
    assert send(backend,epoch,[fix(recorded_at=(datetime.now(timezone.utc)+timedelta(hours=1)).isoformat())]).status_code>=400
    assert send(backend,epoch,[fix() for _ in range(101)]).status_code>=400

def test_native_geofence_and_low_battery_events_are_atomic_and_deduplicated(backend):
    user=backend.users[0];epoch=member(backend)['location_epoch']
    result=backend.rest(backend.clients[0],'POST','places',{'couple_id':backend.couples[0],'name':'Native fixture','lat':13.08,'lng':80.27,'radius_m':150,'created_by':user})
    assert result.status_code==201
    place=result.json()[0]['id'];row=fix();transition={'id':str(uuid.uuid4()),'place_id':place,'inside':True,'recorded_at':row['recorded_at']}
    for _ in range(2):assert send(backend,epoch,[row],[transition],p_low_battery=True).status_code==200
    assert len(backend.rest(backend.clients[0],'GET','events',id='eq.'+transition['id']).json())==1
    presence=backend.rest(backend.clients[0],'GET','place_presence',place_id='eq.'+place,user_id='eq.'+user).json()
    assert len(presence)==1 and presence[0]['inside']
    low=backend.rest(backend.clients[0],'GET','events',user_id='eq.'+user,type='eq.low_battery').json()
    assert len(low)==1
