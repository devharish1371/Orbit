"""Phone-copy ledger tests use disposable couples, never send partner notifications."""
import uuid
import pytest
pytestmark = pytest.mark.integration

def rpc(b, actor, name, **values):
    return b.clients[actor].client.post('/rest/v1/rpc/'+name,json=dict(p_expected_user=b.users[actor],p_expected_couple=b.couples[1 if actor==3 else 0],**values))

def device(b, actor=0, enabled=True):
    identity=str(uuid.uuid4())
    result=rpc(b,actor,'set_keepsake_device',p_device=identity,p_enabled=enabled)
    assert result.status_code==200
    return identity

def kept(b):
    row=b.post()
    result=b.rest(b.clients[0],'PATCH','posts',{'keep':True},id='eq.'+row['id'])
    assert result.status_code==200
    return result.json()[0]

def ack(b,row,phone,actor=0,**changes):
    payload=dict(p_device=phone,p_post=row['id'],p_revision=row['archive_revision'],p_bytes=row['media_bytes'],p_sha256='a'*64)
    payload.update(changes)
    return rpc(b,actor,'ack_keepsake_copy',**payload)

def test_receipts_only_for_current_own_phone_and_current_kept_revision(backend):
    b=backend;row=kept(b);a=device(b);partner=device(b,1)
    assert ack(b,row,a).status_code==200
    assert ack(b,row,a).status_code==200
    assert ack(b,row,partner,1).status_code==200
    records=b.rest(b.clients[0],'GET','keepsake_receipts',post_id='eq.'+row['id']).json()
    assert {r['user_id'] for r in records}==set(b.users[:2])
    for actor in (2,3):
        assert b.rest(b.clients[actor],'GET','keepsake_receipts',post_id='eq.'+row['id']).json()==[]
        assert ack(b,row,a,actor).status_code>=400
    for changes in ({'p_revision':None},{'p_revision':1},{'p_bytes':1},{'p_sha256':'bad'},{'p_device':None}):
        assert ack(b,row,a,**changes).status_code>=400
    assert ack(b,row,a,1).status_code>=400
    assert b.rest(b.clients[0],'POST','keepsake_receipts',dict(post_id=row['id'],user_id=b.users[1],couple_id=b.couples[0],device_id=a,revision=2,bytes=0,sha256='a'*64)).status_code>=400

def test_device_replacement_disable_and_unkeep_invalidate_evidence(backend):
    b=backend;row=kept(b);old=device(b);assert ack(b,row,old).status_code==200
    current=device(b)
    assert b.rest(b.clients[0],'GET','keepsake_receipts',post_id='eq.'+row['id']).json()==[]
    assert ack(b,row,old).status_code>=400
    assert ack(b,row,current).status_code==200
    removed=b.rest(b.clients[1],'PATCH','posts',{'keep':False},id='eq.'+row['id']).json()[0]
    assert removed['archive_revision']>row['archive_revision']
    assert b.rest(b.clients[0],'GET','keepsake_receipts',post_id='eq.'+row['id']).json()==[]
    assert ack(b,row,current).status_code>=400
    rekept=b.rest(b.clients[0],'PATCH','posts',{'keep':True},id='eq.'+row['id']).json()[0]
    assert ack(b,row,current).status_code>=400
    assert ack(b,rekept,current).status_code==200
    assert rpc(b,0,'set_keepsake_device',p_device=current,p_enabled=False).status_code==200
    assert ack(b,rekept,current).status_code>=400
    assert b.rest(b.clients[0],'GET','keepsake_receipts',post_id='eq.'+row['id']).json()==[]

def test_forget_only_removes_own_receipt_and_rejects_changed_identity(backend):
    b=backend;row=kept(b);a=device(b);p=device(b,1)
    assert ack(b,row,a).status_code==200 and ack(b,row,p,1).status_code==200
    assert rpc(b,0,'forget_keepsake_copy',p_device=a,p_post=row['id']).status_code==204
    records=b.rest(b.clients[0],'GET','keepsake_receipts',post_id='eq.'+row['id']).json()
    assert [r['user_id'] for r in records]==[b.users[1]]
    result=b.clients[0].client.post('/rest/v1/rpc/set_keepsake_device',json=dict(p_expected_user=b.users[1],p_expected_couple=b.couples[0],p_device=a,p_enabled=True))
    assert result.status_code>=400
    assert b.rest(b.clients[0],'DELETE','keepsake_receipts',post_id='eq.'+row['id']).status_code>=400
