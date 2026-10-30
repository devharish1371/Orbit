"""M6 scenarios use disposable couples; no real partner data or notifications."""
from datetime import datetime,timezone
import uuid
import pytest
pytestmark=pytest.mark.integration

def create(backend,actor=0,**values):
    body={'id':str(uuid.uuid4()),'channel':'moment','kind':'text','body':'Disposable note','ttl_hours':24}
    body.update(values)
    return backend.clients[actor].client.post('/rest/v1/rpc/create_shared_post',json={'p_post':body})

def test_post_rpc_derives_identity_and_is_idempotent_with_atomic_keep(backend):
    identity=str(uuid.uuid4())
    result=create(backend,id=identity,author_id=backend.users[1],couple_id=backend.couples[1],keep=True)
    assert result.status_code==200
    row=result.json();assert row['author_id']==backend.users[0] and row['couple_id']==backend.couples[0] and row['keep'] and row['expires_at'] is None
    again=create(backend,id=identity,body='Do not overwrite')
    assert again.status_code==200 and again.json()['body']=='Disposable note'
    assert create(backend,actor=2).status_code>=400
    assert create(backend,body=' ').status_code>=400
    assert create(backend,kind='voice',duration=121).status_code>=400
    assert create(backend,place_id=str(uuid.uuid4())).status_code>=400

def test_uploaded_photo_and_thumbnail_are_visible_to_partner_and_bytes_are_authoritative(backend):
    post_id=str(uuid.uuid4());path=backend.upload(post_id=post_id)
    result=create(backend,id=post_id,kind='photo',body='Photo fixture',media_path=path,width=2,height=2)
    assert result.status_code==200 and result.json()['media_bytes']>0
    signed=backend.clients[1].client.post('/storage/v1/object/sign/media/'+path,json={'expiresIn':60})
    assert signed.status_code==200
    wrong=backend.clients[3].client.post('/storage/v1/object/sign/media/'+path,json={'expiresIn':60})
    assert wrong.status_code>=400
    # Even the uploader cannot remove an attachment from an existing visible post.
    backend.clients[0].client.request('DELETE','/storage/v1/object/media',json={'prefixes':[path]})
    assert backend.admin.client.get('/storage/v1/object/authenticated/media/'+path).status_code==200

def test_author_only_unsend_hides_content_and_queues_api_file_cleanup(backend):
    post_id=str(uuid.uuid4());path=backend.upload(post_id=post_id)
    assert create(backend,id=post_id,kind='photo',media_path=path,keep=True).status_code==200
    comment=backend.rest(backend.clients[1],'POST','comments',{'post_id':post_id,'couple_id':backend.couples[0],'author_id':backend.users[1],'body':'Disposable reply'})
    assert comment.status_code==201
    with backend.db() as db:revision=db.execute('select social_revision from public.couples where id=%s',(backend.couples[0],)).fetchone()[0]
    assert backend.clients[1].client.post('/rest/v1/rpc/request_unsend',json={'p_id':post_id}).status_code>=400
    assert backend.clients[0].client.post('/rest/v1/rpc/request_unsend',json={'p_id':post_id}).status_code==200
    for client in backend.clients[:2]:
        assert backend.rest(client,'GET','posts',id='eq.'+post_id).json()==[]
        assert backend.rest(client,'GET','comments',post_id='eq.'+post_id).json()==[]
    with backend.db() as db:assert db.execute('select social_revision from public.couples where id=%s',(backend.couples[0],)).fetchone()[0]>revision
    assert backend.retention().status_code==200
    assert backend.admin.client.get('/storage/v1/object/authenticated/media/'+path).status_code!=200

def test_expired_posts_and_new_partner_media_urls_are_hidden_before_cleanup(backend):
    post_id=str(uuid.uuid4());path=backend.upload(post_id=post_id)
    assert create(backend,id=post_id,kind='photo',media_path=path).status_code==200
    with backend.db() as db:db.execute("update public.posts set expires_at=now()-interval '1 minute' where id=%s",(post_id,))
    assert backend.rest(backend.clients[1],'GET','posts',id='eq.'+post_id).json()==[]
    assert backend.clients[1].client.post('/storage/v1/object/sign/media/'+path,json={'expiresIn':60}).status_code>=400
    assert backend.rest(backend.clients[1],'POST','comments',{'post_id':post_id,'couple_id':backend.couples[0],'author_id':backend.users[1],'body':'Too late'}).status_code>=400

def test_comments_are_moments_only_and_reaction_replacement_is_atomic(backend):
    moment=create(backend).json();chat=create(backend,channel='chat').json()
    assert backend.rest(backend.clients[1],'POST','comments',{'post_id':chat['id'],'couple_id':backend.couples[0],'author_id':backend.users[1],'body':'No chat comments'}).status_code>=400
    for emoji in ['❤️','😂']:
        assert backend.clients[1].client.post('/rest/v1/rpc/set_post_reaction',json={'p_id':moment['id'],'p_emoji':emoji}).status_code==204
    rows=backend.rest(backend.clients[0],'GET','reactions',post_id='eq.'+moment['id']).json()
    assert len(rows)==1 and rows[0]['emoji']=='😂' and rows[0]['user_id']==backend.users[1]
    assert backend.clients[2].client.post('/rest/v1/rpc/set_post_reaction',json={'p_id':moment['id'],'p_emoji':'❤️'}).status_code>=400
    assert backend.clients[1].client.post('/rest/v1/rpc/set_post_reaction',json={'p_id':moment['id']}).status_code==204
    assert backend.rest(backend.clients[0],'GET','reactions',post_id='eq.'+moment['id']).json()==[]

def test_storage_summary_is_scoped_and_default_expiry_is_stamped_by_server(backend):
    row=create(backend,ttl_hours=None).json()
    expiry=datetime.fromisoformat(row['expires_at']);created=datetime.fromisoformat(row['created_at'])
    assert abs((expiry-created).total_seconds()-7*86400)<2
    own=backend.clients[0].client.post('/rest/v1/rpc/storage_summary',json={})
    assert own.status_code==200 and own.json()['quota_bytes']==300*1024*1024
    assert own.json()['total_bytes']>=own.json()['kept_bytes']>=0
    assert backend.clients[2].client.post('/rest/v1/rpc/storage_summary',json={}).status_code>=400
