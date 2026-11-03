"""M6 scenarios use disposable couples; no real partner data or notifications."""
from datetime import datetime,timezone
import uuid
import pytest
pytestmark=pytest.mark.integration

def create(backend,actor=0,**values):
    body={'id':str(uuid.uuid4()),'channel':'moment','kind':'text','body':'Disposable note','ttl_hours':24}
    body.update(values)
    return backend.clients[actor].client.post('/rest/v1/rpc/create_shared_post',json={'p_post':body})

def test_saved_text_styles_are_backwards_compatible_validated_and_immutable(backend):
    legacy=create(backend).json()
    assert legacy['note_style']=='ink'
    for style in ('ink','glow','paper'):
        response=create(backend,note_style=style)
        assert response.status_code==200 and response.json()['note_style']==style
        row=response.json()
        partner=backend.rest(backend.clients[1],'GET','posts',id='eq.'+row['id']).json()
        assert partner[0]['note_style']==style
        assert backend.rest(backend.clients[1],'PATCH','posts',{'note_style':'paper'},id='eq.'+row['id']).status_code>=400
    assert create(backend,note_style='unvalidated-style').status_code>=400
    assert create(backend,actor=2,note_style='glow').status_code>=400

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

def test_chat_reply_reference_is_scoped_and_does_not_retain_expired_content(backend):
    original=create(backend,channel='chat',body='Original disposable text').json()
    reply=create(backend,actor=1,channel='chat',body='A reply',reply_to_id=original['id'],keep=True)
    assert reply.status_code==200 and reply.json()['reply_to_id']==original['id']
    assert reply.json()['body']=='A reply'
    assert create(backend,reply_to_id=original['id']).status_code>=400
    assert create(backend,actor=3,channel='chat',reply_to_id=original['id']).status_code>=400
    moment=create(backend).json()
    assert create(backend,channel='chat',reply_to_id=moment['id']).status_code>=400
    with backend.db() as db: db.execute("update public.posts set expires_at=now()-interval '1 second' where id=%s",(original['id'],))
    assert create(backend,channel='chat',reply_to_id=original['id']).status_code>=400
    assert backend.rest(backend.clients[1],'GET','posts',id='eq.'+original['id']).json()==[]
    with backend.db() as db: db.execute('delete from public.posts where id=%s',(original['id'],))
    kept=backend.rest(backend.clients[0],'GET','posts',id='eq.'+reply.json()['id']).json()[0]
    assert kept['reply_to_id']==original['id'] and kept['body']=='A reply'


def test_recent_chat_edit_is_author_only_versioned_idempotent_and_preserves_expiry(backend):
    row=create(backend,channel='chat',body='A typo').json()
    args={'p_id':row['id'],'p_body':'A correction','p_expected_version':0}
    for actor in [1,2,3]: assert backend.clients[actor].client.post('/rest/v1/rpc/edit_chat_post',json=args).status_code>=400
    result=backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json=args)
    assert result.status_code==200
    edited=result.json()
    assert edited['body']=='A correction' and edited['edit_version']==1 and edited['edited_at']
    assert edited['created_at']==row['created_at'] and edited['expires_at']==row['expires_at'] and edited['keep']==row['keep']
    again=backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json=args)
    assert again.status_code==200 and again.json()['edit_version']==1 and again.json()['edited_at']==edited['edited_at']
    conflict=backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json={**args,'p_body':'Stale overwrite'})
    assert conflict.status_code>=400 and 'EDIT_CONFLICT' in conflict.text
    assert backend.rest(backend.clients[0],'PATCH','posts',{'body':'Direct edit'},id='eq.'+row['id']).status_code>=400
    assert backend.rest(backend.clients[0],'PATCH','posts',{'reply_to_id':row['id']},id='eq.'+row['id']).status_code>=400
    moment=create(backend).json()
    assert backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json={**args,'p_id':moment['id']}).status_code>=400


def test_chat_edit_window_expiry_unsend_and_validation_are_enforced(backend):
    row=create(backend,channel='chat').json()
    args={'p_id':row['id'],'p_body':'Changed','p_expected_version':0}
    for body in ['',' ',None,'x'*2001]: assert backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json={**args,'p_body':body}).status_code>=400
    assert backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json={**args,'p_expected_version':None}).status_code>=400
    with backend.db() as db: db.execute("update public.posts set created_at=now()-interval '16 minutes' where id=%s",(row['id'],))
    closed=backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json=args)
    assert closed.status_code>=400 and 'EDIT_WINDOW_CLOSED' in closed.text
    expired=create(backend,channel='chat').json()
    with backend.db() as db: db.execute("update public.posts set expires_at=now()-interval '1 second' where id=%s",(expired['id'],))
    assert backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json={**args,'p_id':expired['id']}).status_code>=400
    unsent=create(backend,channel='chat').json()
    assert backend.clients[0].client.post('/rest/v1/rpc/request_unsend',json={'p_id':unsent['id']}).status_code==200
    assert create(backend,channel='chat',reply_to_id=unsent['id']).status_code>=400
    assert backend.clients[0].client.post('/rest/v1/rpc/edit_chat_post',json={**args,'p_id':unsent['id']}).status_code>=400

def test_chat_pin_is_shared_bounded_and_stale_unpin_does_not_remove_replacement(backend):
    first=create(backend,channel='chat',ttl_hours=1).json()
    args={'p_post_id':first['id']}
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json=args).status_code==204
    pin=backend.rest(backend.clients[1],'GET','chat_pins').json()[0]
    assert pin['post_id']==first['id'] and pin['expires_at']==first['expires_at']
    assert backend.rest(backend.clients[3],'GET','chat_pins').json()==[]
    assert backend.clients[3].client.post('/rest/v1/rpc/set_chat_pin',json=args).status_code>=400
    assert backend.clients[2].client.post('/rest/v1/rpc/set_chat_pin',json=args).status_code>=400
    second=create(backend,channel='chat',keep=True).json()
    assert backend.clients[1].client.post('/rest/v1/rpc/set_chat_pin',json={'p_post_id':second['id']}).status_code==204
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json={**args,'p_remove':True}).status_code==204
    pin=backend.rest(backend.clients[0],'GET','chat_pins').json()[0]
    assert pin['post_id']==second['id']
    assert (datetime.fromisoformat(pin['expires_at'])-datetime.fromisoformat(pin['created_at'])).total_seconds()==86400
    assert backend.rest(backend.clients[0],'POST','chat_pins',{'couple_id':backend.couples[0],'post_id':first['id'],'created_by':backend.users[0],'expires_at':pin['expires_at']}).status_code>=400
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json={'p_post_id':second['id'],'p_remove':True}).status_code==204
    assert backend.rest(backend.clients[1],'GET','chat_pins').json()==[]


def test_chat_pin_hides_with_message_expiry_unsend_or_pin_timeout(backend):
    moment=create(backend).json()
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json={'p_post_id':moment['id']}).status_code>=400
    row=create(backend,channel='chat').json()
    args={'p_post_id':row['id']}
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json=args).status_code==204
    with backend.db() as db: db.execute("update public.chat_pins set expires_at=now()-interval '1 second' where couple_id=%s",(backend.couples[0],))
    assert backend.rest(backend.clients[1],'GET','chat_pins').json()==[]
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json=args).status_code==204
    with backend.db() as db: db.execute("update public.posts set expires_at=now()-interval '1 second' where id=%s",(row['id'],))
    assert backend.rest(backend.clients[1],'GET','chat_pins').json()==[]
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json=args).status_code>=400
    fresh=create(backend,channel='chat').json()
    assert backend.clients[0].client.post('/rest/v1/rpc/set_chat_pin',json={'p_post_id':fresh['id']}).status_code==204
    assert backend.clients[0].client.post('/rest/v1/rpc/request_unsend',json={'p_id':fresh['id']}).status_code==200
    assert backend.rest(backend.clients[1],'GET','chat_pins').json()==[]

def test_durable_draft_expected_identity_cannot_cross_an_account_switch(backend):
    assert create(backend,channel='chat',expected_author_id=backend.users[0],expected_couple_id=backend.couples[0]).status_code==200
    for values in [dict(expected_author_id=backend.users[1]),dict(expected_couple_id=backend.couples[1])]:
        response=create(backend,channel='chat',**values)
        assert response.status_code>=400 and 'DRAFT_ACCOUNT_CHANGED' in response.text
