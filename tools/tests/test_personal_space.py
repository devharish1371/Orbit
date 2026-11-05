"""Voluntary statuses and real past-year keepsakes; disposable identities only."""
import uuid
from concurrent.futures import ThreadPoolExecutor
import pytest

pytestmark = pytest.mark.integration

def status(b, actor=0, **values):
    args=dict(p_expected_user=b.users[actor],p_expected_couple=b.couples[1 if actor==3 else 0],p_version=0,p_emoji='☕',p_message='Back soon',p_hours=1)
    args.update(values)
    return b.clients[actor].client.post('/rest/v1/rpc/set_member_status',json=args)

def test_status_ownership_expiry_clear_and_stale_device(backend):
    b=backend
    result=status(b);assert result.status_code==200
    item=result.json();assert item['version']==1
    assert b.rest(b.clients[1],'GET','member_status',user_id='eq.'+b.users[0]).json()[0]['message']=='Back soon'
    for actor in (2,3):
        assert b.rest(b.clients[actor],'GET','member_status',user_id='eq.'+b.users[0]).json()==[]
        assert status(b,actor,p_expected_user=b.users[0]).status_code>=400
    assert status(b,p_version=0,p_message='Old edit').status_code>=400
    assert status(b,1,p_expected_user=b.users[0],p_version=1).status_code>=400
    assert b.rest(b.clients[0],'PATCH','member_status',{'message':'Bypass'},user_id='eq.'+b.users[0]).status_code>=400
    assert b.rest(b.clients[1],'POST','member_status',dict(user_id=b.users[0],couple_id=b.couples[0],emoji='',message='Bypass',version=2)).status_code>=400
    with b.db() as db:db.execute("update public.member_status set expires_at=now()-interval '1 second' where user_id=%s",(b.users[0],))
    assert b.rest(b.clients[1],'GET','member_status',user_id='eq.'+b.users[0]).json()==[]
    assert b.rest(b.clients[0],'GET','member_status',user_id='eq.'+b.users[0]).json()[0]['version']==1
    cleared=status(b,p_version=1,p_emoji='',p_message='',p_hours=0);assert cleared.status_code==200
    assert cleared.json()['version']==2 and cleared.json()['expires_at'] is None
    assert b.rest(b.clients[1],'GET','member_status',user_id='eq.'+b.users[0]).json()==[]
    assert status(b,p_version=1).status_code>=400
    assert status(b,p_version=2,p_hours=24).json()['version']==3

def test_status_validation_server_deadline_and_concurrent_edit(backend):
    b=backend
    with b.db() as db:db.execute('delete from public.member_status where user_id=%s',(b.users[0],))
    for changes in ({'p_hours':2},{'p_hours':None},{'p_hours':0},{'p_emoji':'invalid'},{'p_message':'x'*81},{'p_message':'two\nlines'},{'p_emoji':'','p_message':' '},{'p_version':None}):
        assert status(b,**changes).status_code>=400
    with ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda msg:status(b,p_message=msg),('First','Second')))
    assert sorted(r.status_code for r in results)[0]==200 and sum(r.status_code==200 for r in results)==1
    item=next(r.json() for r in results if r.status_code==200)
    with b.db() as db:
        delta=db.execute('select extract(epoch from (%s::timestamptz-now()))',(item['expires_at'],)).fetchone()[0]
    assert 3500<delta<=3600

def test_on_this_day_server_timezone_retention_scope_and_pagination(backend):
    b=backend; ids=[str(uuid.uuid4()) for _ in range(31)]; excluded=[str(uuid.uuid4()) for _ in range(4)]
    with b.db() as db:
        db.execute("update public.couples set timezone='Pacific/Kiritimati' where id=%s",(b.couples[0],))
        # Four years earlier always preserves Feb 29; same wall-clock local date.
        for identity in ids:
            db.execute("insert into public.posts(id,couple_id,author_id,channel,kind,body,created_at) values(%s,%s,%s,'moment','text','Past year',date_trunc('day',now() at time zone 'Pacific/Kiritimati') at time zone 'Pacific/Kiritimati'-interval '4 years')",(identity,b.couples[0],b.users[0]))
        db.execute("update public.posts set created_at=(date_trunc('day',now() at time zone 'Pacific/Kiritimati')-interval '4 years') at time zone 'Pacific/Kiritimati' where id=any(%s::uuid[])",(ids,))
        db.execute('update public.posts set keep=true where id=any(%s::uuid[])',(ids,))
        for index,identity in enumerate(excluded):
            db.execute("insert into public.posts(id,couple_id,author_id,channel,kind,body,created_at) values(%s,%s,%s,'moment','text','Excluded',case when %s=0 then now() else (date_trunc('day',now() at time zone 'Pacific/Kiritimati')-interval '4 years'+case when %s=1 then interval '1 day' else interval '0 days' end) at time zone 'Pacific/Kiritimati' end)",(identity,b.couples[0],b.users[0],index,index))
        db.execute("update public.posts set created_at=(date_trunc('day',now() at time zone 'Pacific/Kiritimati')-interval '4 years'+case when id=%s then interval '1 day' else interval '0 days' end) at time zone 'Pacific/Kiritimati' where id=any(%s::uuid[])",(excluded[1],excluded[1:]))
        db.execute('update public.posts set keep=true where id=any(%s::uuid[])',(excluded[:2],))
        # Third unkept and fourth tombstoned must never surface.
        db.execute('update public.posts set keep=true where id=%s',(excluded[3],))
    assert b.clients[0].client.post('/rest/v1/rpc/request_unsend',json={'p_id':excluded[3]}).status_code==200
    def page(actor=0,**args):return b.clients[actor].client.post('/rest/v1/rpc/on_this_day_keepsakes',json=args)
    first=page().json();assert len(first)==30
    last=first[-1];second=page(p_before_created=last['created_at'],p_before_id=last['id']).json()
    assert len(second)==1 and {p['id'] for p in first+second}==set(ids)
    assert {p['id'] for p in page(1).json()}=={p['id'] for p in first}
    assert page(2).status_code>=400
    assert page(3).json()==[]
    assert page(p_before_id=last['id']).status_code>=400
    assert page(p_before_created='infinity',p_before_id=last['id']).status_code>=400
    assert b.rest(b.clients[1],'PATCH','posts',{'keep':False},id='eq.'+first[0]['id']).status_code==200
    assert first[0]['id'] not in {p['id'] for p in page().json()}

def test_expired_status_text_is_swept_without_reviving_stale_device_edits(backend):
    b=backend
    with b.db() as db:db.execute('delete from public.member_status where user_id=%s',(b.users[1],))
    assert status(b,1).status_code==200
    with b.db() as db:
        db.execute("update public.member_status set expires_at=now()-interval '1 second' where user_id=%s",(b.users[1],))
        db.execute('select orbit_private.expire_member_status()')
        item=db.execute('select emoji,message,expires_at,version from public.member_status where user_id=%s',(b.users[1],)).fetchone()
    assert item==('','',None,2)
    assert status(b,1,p_version=1).status_code>=400
    assert status(b,1,p_version=2).status_code==200
