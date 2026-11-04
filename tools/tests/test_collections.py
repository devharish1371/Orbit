"""Shared collections use disposable members only; no real partner contact."""
from concurrent.futures import ThreadPoolExecutor
import uuid
import pytest
from tools.tests.test_posts import create
pytestmark = pytest.mark.integration

def rpc(b,actor,name,**values):
    args=dict(p_expected_user=b.users[actor],p_expected_couple=b.couples[1 if actor==3 else 0]);args.update(values)
    return b.clients[actor].client.post('/rest/v1/rpc/'+name,json=args)
def collection(b,actor=0):
    body=dict(p_id=str(uuid.uuid4()),p_version=None,p_name='Collection '+uuid.uuid4().hex[:8],p_tone='iris',p_archived=False)
    result=rpc(b,actor,'save_memory_collection',**body);assert result.status_code==200
    return result.json(),body
def link(b,c,p,actor=0,add=True,**extra):
    body=dict(p_collection=c['id'],p_version=c['version'],p_post=p['id'],p_kept_at=p['kept_at'],p_add=add);body.update(extra)
    return rpc(b,actor,'set_collection_post',**body)
def index(b,actor=0):return b.clients[actor].client.post('/rest/v1/rpc/memory_collections_index',json={}).json()

def test_collection_scope_owner_versions_identity_and_direct_writes(backend):
    b=backend;c,body=collection(b)
    assert rpc(b,0,'save_memory_collection',**body).json()['id']==c['id']
    for actor in (2,3):
        assert b.rest(b.clients[actor],'GET','memory_collections',id='eq.'+c['id']).json()==[]
        assert not any(v['id']==c['id'] for v in index(b,actor))
        assert rpc(b,actor,'save_memory_collection',**dict(body,p_version=1,p_name='Wrong member')).status_code>=400
    assert rpc(b,1,'save_memory_collection',**dict(body,p_version=1,p_name='Partner rename')).status_code>=400
    assert rpc(b,0,'save_memory_collection',**dict(body,p_version=1,p_expected_user=b.users[1])).status_code>=400
    changed=rpc(b,0,'save_memory_collection',**dict(body,p_version=1,p_name='Renamed '+uuid.uuid4().hex[:8])).json()
    assert changed['version']==2
    assert rpc(b,0,'save_memory_collection',**dict(body,p_version=1,p_name='Stale edit')).status_code>=400
    assert b.rest(b.clients[0],'POST','memory_collections',dict(id=str(uuid.uuid4()),couple_id=b.couples[0],created_by=b.users[0],name='Bypass',tone='iris')).status_code>=400
    for values in ({'p_name':' '},{'p_name':'x'*65},{'p_tone':'invalid'},{'p_archived':None}):
        assert rpc(b,0,'save_memory_collection',**dict(body,**values)).status_code>=400

def test_shared_organizing_never_duplicates_media_or_changes_keep_quota(backend):
    b=backend;c,_=collection(b);identity=str(uuid.uuid4());path=b.upload(post_id=identity)
    result=create(b,id=identity,kind='photo',media_path=path,keep=True);assert result.status_code==200;p=result.json()
    before=b.clients[0].client.post('/rest/v1/rpc/storage_summary',json={}).json()
    assert link(b,c,p,1).status_code==204
    assert link(b,c,p,1).status_code==204
    assert next(v for v in index(b) if v['id']==c['id'])['kept_count']==1
    after=b.clients[0].client.post('/rest/v1/rpc/storage_summary',json={}).json()
    assert after['total_bytes']==before['total_bytes'] and after['kept_bytes']==before['kept_bytes'] and after['files']==before['files']
    assert link(b,c,p,0,False).status_code==204
    assert next(v for v in index(b) if v['id']==c['id'])['kept_count']==0
    assert b.rest(b.clients[0],'GET','posts',id='eq.'+p['id']).json()[0]['keep']
    assert b.rest(b.clients[1],'POST','collection_posts',dict(collection_id=c['id'],post_id=p['id'],couple_id=b.couples[0],added_by=b.users[1],kept_at=p['kept_at'])).status_code>=400

def test_unkeep_rekeep_and_unsend_hide_links_without_restoring_old_memberships(backend):
    b=backend;c,_=collection(b);p=create(b,keep=True).json();assert link(b,c,p).status_code==204
    assert b.rest(b.clients[1],'PATCH','posts',{'keep':False},id='eq.'+p['id']).status_code==200
    assert b.rest(b.clients[0],'GET','collection_posts',post_id='eq.'+p['id']).json()==[]
    assert next(v for v in index(b) if v['id']==c['id'])['kept_count']==0
    fresh=b.rest(b.clients[1],'PATCH','posts',{'keep':True},id='eq.'+p['id']).json()[0]
    assert link(b,c,p).status_code>=400
    assert b.rest(b.clients[0],'GET','collection_posts',post_id='eq.'+p['id']).json()==[]
    assert link(b,c,fresh).status_code==204
    assert b.clients[0].client.post('/rest/v1/rpc/request_unsend',json={'p_id':p['id']}).status_code==200
    assert b.rest(b.clients[1],'GET','collection_posts',post_id='eq.'+p['id']).json()==[]

def test_archive_restore_cursor_and_photo_filter_are_scoped_and_versioned(backend):
    b=backend;c,body=collection(b);ids=[str(uuid.uuid4()) for _ in range(31)]
    with b.db() as db:
        for identity in ids:db.execute("insert into public.posts(id,couple_id,author_id,channel,kind,body) values(%s,%s,%s,'moment','text','Page fixture')",(identity,b.couples[0],b.users[0]))
        db.execute('update public.posts set keep=true where id=any(%s::uuid[])',(ids,))
        db.execute('insert into public.collection_posts(collection_id,post_id,couple_id,added_by,kept_at) select %s,id,couple_id,author_id,kept_at from public.posts where id=any(%s::uuid[])',(c['id'],ids))
    def page(actor=0,**values):return b.clients[actor].client.post('/rest/v1/rpc/collection_keepsakes',json=dict(p_collection=c['id'],**values))
    first=page().json();assert len(first)==30
    last=first[-1];second=page(p_before_created=last['created_at'],p_before_id=last['id']).json()
    assert len(second)==1 and {p['id'] for p in first+second}==set(ids)
    assert page(p_photos=True).json()==[]
    assert page(p_before_id=last['id']).status_code>=400
    assert page(actor=3).status_code>=400
    archived=rpc(b,0,'save_memory_collection',**dict(body,p_version=1,p_archived=True)).json()
    assert archived['version']==2 and archived['archived']
    assert page().status_code>=400
    assert rpc(b,1,'save_memory_collection',**dict(body,p_version=2,p_archived=False)).status_code>=400
    restored=rpc(b,0,'save_memory_collection',**dict(body,p_version=2)).json()
    assert restored['version']==3 and len(page().json())==30
    assert next(v for v in index(b) if v['id']==c['id'])['kept_count']==31

def test_concurrent_archive_and_unkeep_never_deadlock_with_collection_writes(backend):
    b=backend
    for operation in ('archive','unkeep'):
        for _ in range(3):
            c,body=collection(b);p=create(b,keep=True).json();assert link(b,c,p).status_code==204
            with ThreadPoolExecutor(max_workers=2) as pool:
                change=pool.submit(rpc,b,0,'save_memory_collection',**dict(body,p_version=1,p_archived=True)) if operation=='archive' else pool.submit(b.rest,b.clients[0],'PATCH','posts',{'keep':False},id='eq.'+p['id'])
                organize=pool.submit(link,b,c,p,1,False)
                statuses=[change.result().status_code,organize.result().status_code]
            assert all(code<500 for code in statuses) and any(code<300 for code in statuses)
