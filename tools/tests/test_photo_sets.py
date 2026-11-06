"""Photo sets use disposable accounts and Storage API deletion only."""
import io
import uuid
from copy import deepcopy
import pytest
from PIL import Image
from tools.tests.test_phone_keepsakes import device, rpc

pytestmark = pytest.mark.integration

def draft(b, count=3):
    identity=str(uuid.uuid4()); photos=[]
    image=io.BytesIO();Image.new('RGB',(8,6),'#a57ad9').save(image,format='WEBP');data=image.getvalue()
    for index in range(count):
        asset=identity if index==0 else str(uuid.uuid4())
        root=f'{b.couples[0]}/{b.users[0]}/{identity}'+('' if index==0 else '_'+asset)
        for path in (root+'.webp',root+'_t.webp'):
            result=b.clients[0].client.post('/storage/v1/object/media/'+path,content=data,headers={'Content-Type':'image/webp'})
            assert result.status_code==200
            b.paths.append(path)
        photos.append(dict(id=asset,path=root+'.webp',thumb_path=root+'_t.webp',width=8,height=6,caption=f'Photo {index+1}',bytes=1,thumb_bytes=1))
    return dict(id=identity,expected_author_id=b.users[0],expected_couple_id=b.couples[0],channel='moment',body='Disposable photo set',keep=False,ttl_hours=24,photos=photos)

def create(b, payload, actor=0):
    return b.clients[actor].client.post('/rest/v1/rpc/create_photo_post',json={'p_post':payload})

def test_photo_set_is_one_idempotent_post_with_all_storage_bytes_and_private_files(backend):
    b=backend;payload=draft(b);result=create(b,payload)
    assert result.status_code==200, result.text
    row=result.json();photos=row['photo_items'];cover=photos[0]
    assert [p['caption'] for p in photos]==['Photo 1','Photo 2','Photo 3']
    assert row['media_bytes']==cover['bytes']>1
    assert row['extra_media_bytes']==sum(p['bytes'] for p in photos[1:])
    assert row['extra_thumb_bytes']==sum(p['thumb_bytes'] for p in photos[1:])
    assert create(b,payload).json()['id']==row['id']
    for actor in (0,1):
        assert b.clients[actor].client.post('/storage/v1/object/sign/media/'+photos[2]['path'],json={'expiresIn':60}).status_code==200
    for actor in (2,3):
        assert b.rest(b.clients[actor],'GET','posts',id='eq.'+row['id']).json()==[]
        assert b.clients[actor].client.post('/storage/v1/object/sign/media/'+photos[2]['path'],json={'expiresIn':60}).status_code>=400
        assert create(b,payload,actor).status_code>=400
    b.clients[0].client.request('DELETE','/storage/v1/object/media',json={'prefixes':[photos[2]['path']]})
    assert b.admin.client.get('/storage/v1/object/authenticated/media/'+photos[2]['path']).status_code==200
    assert b.rest(b.clients[0],'PATCH','posts',{'photo_items':[]},id='eq.'+row['id']).status_code>=400
    with b.db() as db:
        paths=[p[k] for p in photos for k in ('path','thumb_path')]
        db.execute("update storage.objects set created_at=now()-interval '25 hours' where bucket_id='media' and name=any(%s)",(paths,))
        assert db.execute('select * from public.claim_orphan_media(%s)',(paths,)).fetchall()==[]
    before=b.clients[0].client.post('/rest/v1/rpc/storage_summary',json={}).json()['kept_bytes']
    kept=b.rest(b.clients[1],'PATCH','posts',{'keep':True},id='eq.'+row['id']).json()[0]
    assert kept['keep'] and kept['expires_at'] is None
    after=b.clients[0].client.post('/rest/v1/rpc/storage_summary',json={}).json()['kept_bytes']
    assert after-before==sum(p['bytes']+p['thumb_bytes'] for p in photos)

def test_photo_sets_reject_bad_manifests_and_preserve_single_remaining_caption(backend):
    b=backend;payload=draft(b,2)
    for change in ('duplicate','foreign','missing','caption','dimensions','cover','oversized','nonarray'):
        bad=deepcopy(payload)
        if change=='duplicate':bad['photos'][1]['id']=bad['photos'][0]['id']
        if change=='foreign':bad['photos'][1]['path']=bad['photos'][1]['path'].replace(b.users[0],b.users[1])
        if change=='missing':bad['photos'][1]['thumb_path']=None
        if change=='caption':bad['photos'][1]['caption']='x'*401
        if change=='dimensions':bad['photos'][1]['width']=0
        if change=='cover':bad['photos'].reverse()
        if change=='oversized':bad['photos']=bad['photos']*4
        if change=='nonarray':bad['photos']={}
        assert create(b,bad).status_code>=400,change
        assert b.rest(b.clients[0],'GET','posts',id='eq.'+payload['id']).json()==[]
    one=draft(b,1);row=create(b,one)
    assert row.status_code==200 and row.json()['photo_items'][0]['caption']=='Photo 1'

def test_set_quota_cannot_be_bypassed_by_cover_only_and_failed_keep_is_atomic(backend):
    b=backend;payload=draft(b,2);row=create(b,payload).json();filler=b.post()
    with b.db() as db:
        quota=db.execute('select keepsake_quota_mb from public.couples where id=%s',(b.couples[0],)).fetchone()[0]
        used=db.execute('select coalesce(sum(media_bytes::bigint+thumb_bytes+extra_media_bytes+extra_thumb_bytes+memory_bytes),0) from public.posts where couple_id=%s and keep and cloud_state in (\'online\',\'restoring\')',(b.couples[0],)).fetchone()[0]
        db.execute('update public.posts set media_bytes=%s where id=%s',(quota*1048576-used-row['media_bytes']-row['thumb_bytes']-1,filler['id']))
    assert b.rest(b.clients[0],'PATCH','posts',{'keep':True},id='eq.'+filler['id']).status_code==200
    try:
        result=b.rest(b.clients[1],'PATCH','posts',{'keep':True},id='eq.'+row['id'])
        assert result.status_code>=400 and 'KEEPSAKE_QUOTA_EXCEEDED' in result.text
        unchanged=b.rest(b.clients[0],'GET','posts',id='eq.'+row['id']).json()[0]
        assert not unchanged['keep'] and unchanged['kept_at'] is None
    finally:
        b.rest(b.clients[0],'PATCH','posts',{'keep':False},id='eq.'+filler['id'])

def test_per_photo_receipts_require_current_member_device_bytes_and_whole_set_revision(backend):
    b=backend;payload=draft(b,2);payload['keep']=True;row=create(b,payload).json();photo=row['photo_items'][1]
    a=device(b);other=device(b,1)
    values=dict(p_device=a,p_post=row['id'],p_asset=photo['id'],p_revision=row['archive_revision'],p_bytes=photo['bytes'],p_sha256='a'*64)
    assert rpc(b,0,'ack_keepsake_asset',**values).status_code==204
    assert rpc(b,1,'ack_keepsake_asset',**{**values,'p_device':other}).status_code==204
    for changes in ({'p_asset':row['id']},{'p_device':other},{'p_revision':1},{'p_bytes':1},{'p_sha256':'bad'}):
        assert rpc(b,0,'ack_keepsake_asset',**{**values,**changes}).status_code>=400
    for actor in (2,3):
        assert b.rest(b.clients[actor],'GET','keepsake_asset_receipts',post_id='eq.'+row['id']).json()==[]
        assert rpc(b,actor,'ack_keepsake_asset',**values).status_code>=400
    replaced=device(b)
    records=b.rest(b.clients[0],'GET','keepsake_asset_receipts',post_id='eq.'+row['id']).json()
    assert [r['user_id'] for r in records]==[b.users[1]]
    assert rpc(b,0,'ack_keepsake_asset',**{**values,'p_device':replaced}).status_code==204
    assert b.rest(b.clients[1],'PATCH','posts',{'keep':False},id='eq.'+row['id']).status_code==200
    assert b.rest(b.clients[0],'GET','keepsake_asset_receipts',post_id='eq.'+row['id']).json()==[]
    assert rpc(b,0,'ack_keepsake_asset',**{**values,'p_device':replaced}).status_code>=400

def test_old_worker_cannot_drop_extra_photo_references_and_new_worker_removes_whole_set(backend):
    b=backend;row=create(b,draft(b,3)).json()
    with b.db() as db:
        db.execute("update public.posts set expires_at=now()-interval '1 hour',deleting_at=now(),deletion_token=gen_random_uuid() where id=%s",(row['id'],))
        token=db.execute('select deletion_token from public.posts where id=%s',(row['id'],)).fetchone()[0]
    b.admin.request('DELETE','/storage/v1/object/media',json={'prefixes':[row['media_path'],row['thumb_path']]})
    with b.db() as db:
        assert db.execute('select public.finish_expired_post(%s,%s)',(row['id'],token)).fetchone()==(False,)
        db.execute("update public.posts set deleting_at=now()-interval '11 minutes' where id=%s",(row['id'],))
    result=b.retention();assert result.status_code==200 and result.json()['error'] is None
    assert b.rest(b.admin,'GET','posts',id='eq.'+row['id']).json()==[]
    for photo in row['photo_items']:
        for key in ('path','thumb_path'):
            assert b.admin.client.get('/storage/v1/object/authenticated/media/'+photo[key]).status_code!=200
