"""M7 disclosure boundaries use disposable users and never send a real partner alert."""
from datetime import datetime, timedelta, timezone
import uuid
import pytest

pytestmark = pytest.mark.integration

def rpc(backend, actor, name, **body):
    return backend.clients[actor].client.post('/rest/v1/rpc/'+name, json=body)

def test_capsule_is_hidden_until_server_unlock_and_open_is_recipient_only(backend):
    identity=str(uuid.uuid4())
    body=dict(p_id=identity,p_title='Disposable future',p_body='Hidden until tomorrow',p_unlock_at=(datetime.now(timezone.utc)+timedelta(days=1)).isoformat())
    created=rpc(backend,0,'create_capsule',**body)
    assert created.status_code==200 and created.json()['author_id']==backend.users[0]
    assert rpc(backend,0,'create_capsule',**body).json()['id']==identity
    for actor in (1,2,3):
        assert backend.rest(backend.clients[actor],'GET','capsules',id='eq.'+identity).json()==[]
        assert rpc(backend,actor,'open_capsule',p_id=identity).status_code>=400
    assert rpc(backend,1,'cancel_capsule',p_id=identity).status_code>=400
    with backend.db() as db: db.execute("update public.capsules set unlock_at=now()-interval '1 minute',notified_at=now() where id=%s",(identity,))
    assert len(backend.rest(backend.clients[1],'GET','capsules',id='eq.'+identity).json())==1
    opened=rpc(backend,1,'open_capsule',p_id=identity)
    assert opened.status_code==200 and opened.json()['opened_at']
    assert rpc(backend,1,'open_capsule',p_id=identity).json()['opened_at']==opened.json()['opened_at']
    assert rpc(backend,0,'open_capsule',p_id=identity).status_code>=400
    assert rpc(backend,0,'cancel_capsule',p_id=identity).status_code>=400

def test_capsule_validation_and_cancellation(backend):
    body=dict(p_id=str(uuid.uuid4()),p_title='Disposable',p_body='Note',p_unlock_at=(datetime.now(timezone.utc)+timedelta(days=1)).isoformat())
    assert rpc(backend,2,'create_capsule',**body).status_code>=400
    assert rpc(backend,0,'create_capsule',**dict(body,p_title=' ')).status_code>=400
    assert rpc(backend,0,'create_capsule',**dict(body,p_unlock_at='2020-01-01T00:00:00Z')).status_code>=400
    assert rpc(backend,0,'create_capsule',**body).status_code==200
    assert rpc(backend,0,'cancel_capsule',p_id=body['p_id']).status_code==204

def test_daily_answer_is_server_dated_immutable_and_reciprocally_private(backend):
    daily=rpc(backend,0,'daily_question')
    assert daily.status_code==200 and 0<=daily.json()['question_idx']<60
    day=daily.json()['day']
    assert rpc(backend,2,'daily_question').status_code>=400
    assert rpc(backend,0,'answer_daily_question',p_answer=' ').status_code>=400
    first=rpc(backend,0,'answer_daily_question',p_answer='Disposable first answer')
    assert first.status_code==200 and first.json()['day']==day
    assert rpc(backend,0,'answer_daily_question',p_answer='Cannot change after looking').json()['answer']=='Disposable first answer'
    assert backend.rest(backend.clients[1],'GET','question_answers',day='eq.'+day).json()==[]
    forged={'couple_id':backend.couples[0],'user_id':backend.users[1],'day':day,'question_idx':0,'answer':'Forged'}
    assert backend.rest(backend.clients[1],'POST','question_answers',forged).status_code>=400
    assert rpc(backend,1,'answer_daily_question',p_answer='Disposable second answer').status_code==200
    for actor in (0,1):
        answers=backend.rest(backend.clients[actor],'GET','question_answers',day='eq.'+day).json()
        assert len(answers)==2 and {a['question_idx'] for a in answers}=={daily.json()['question_idx']}
    for actor in (2,3): assert backend.rest(backend.clients[actor],'GET','question_answers',day='eq.'+day).json()==[]
    notices=backend.rest(backend.clients[0],'GET','events',type='eq.question_ready').json()
    assert len(notices)==1 and 'answer' not in notices[0]['payload']

def test_permanent_recap_counts_survive_removing_post_and_stay_scoped(backend):
    post=backend.post()
    with backend.db() as db:
        summary=db.execute('select moments_shared from public.daily_summary where user_id=%s order by day desc limit 1',(backend.users[0],)).fetchone()
        assert summary[0]>=1
        db.execute('delete from public.posts where id=%s',(post['id'],))
        assert db.execute('select moments_shared from public.daily_summary where user_id=%s order by day desc limit 1',(backend.users[0],)).fetchone()==summary
    recap=rpc(backend,0,'week_recap')
    assert recap.status_code==200 and recap.json()['recorded_km']>=0
    assert rpc(backend,2,'week_recap').status_code>=400
    assert rpc(backend,3,'week_recap').json()['moments']==0
