"""Mixed-media sides belong to one expiry unit; only disposable media is uploaded."""
from datetime import datetime,timedelta,timezone
from concurrent.futures import ThreadPoolExecutor
import io,uuid
import pytest
from PIL import Image
from tools.tests.test_posts import create
from tools.tests.test_plans import rpc
pytestmark=pytest.mark.integration

def root(b):
 identity=str(uuid.uuid4());path=b.upload(post_id=identity)
 r=create(b,id=identity,kind='photo',media_path=path,keep=True)
 assert r.status_code==200;return r.json()

def write(b,p,actor=0,version=None,request=None,side=None,**extra):
 return rpc(b,actor,'write_memory_side',p_post=p['id'],p_kept_at=p['kept_at'],p_version=version,p_request=request or str(uuid.uuid4()),p_side=side,**extra)

def words(body='One side',**extra):return dict(id=str(uuid.uuid4()),kind='text',body=body,**extra)

def test_independent_voluntary_sides_author_rights_and_exact_replay(backend):
 b=backend;p=root(b);a=words();identity=str(uuid.uuid4());one=write(b,p,side=a,request=identity);assert one.status_code==200,one.text
 assert len(one.json()['memory_sides'])==1 and one.json()['archive_revision']>p['archive_revision']
 assert write(b,p,side=a,request=identity).json()['archive_revision']==one.json()['archive_revision']
 assert write(b,p,side=dict(a,body='Changed'),request=identity).status_code>=400
 two=write(b,p,1,side=words('Their side'));assert two.status_code==200 and len(two.json()['memory_sides'])==2
 assert write(b,p,1,version=1,side=dict(a,body='Attempt to take other ID')).status_code>=400
 for actor in (2,3):assert write(b,p,actor,side=words()).status_code>=400
 assert write(b,p,side=words(),p_expected_user=b.users[1]).status_code>=400
 assert write(b,p,version=0,side=words()).status_code>=400
 removed=write(b,p,version=1,side=None);assert removed.status_code==200
 assert len(removed.json()['memory_sides'])==1 and removed.json()['memory_sides'][0]['author_id']==b.users[1]
 assert b.rest(b.clients[0],'PATCH','posts',{'memory_sides':[]},id='eq.'+p['id']).status_code>=400


def test_keep_instance_unsend_and_concurrent_contributions(backend):
 b=backend;p=root(b)
 with ThreadPoolExecutor(max_workers=2) as pool:
  tasks=[pool.submit(write,b,p,actor,side=words(str(actor))) for actor in (0,1)]
  assert all(t.result().status_code==200 for t in tasks)
 row=b.rest(b.clients[0],'GET','posts',id='eq.'+p['id']).json()[0];assert len(row['memory_sides'])==2
 assert b.rest(b.clients[1],'PATCH','posts',{'keep':False},id='eq.'+p['id']).status_code==200
 assert write(b,p,version=1,side=words()).status_code>=400
 assert b.rest(b.clients[1],'PATCH','posts',{'keep':True},id='eq.'+p['id']).status_code==200
 assert write(b,p,version=1,side=words()).status_code>=400
 assert b.clients[0].client.post('/rest/v1/rpc/request_unsend',json={'p_id':p['id']}).status_code==200
 assert b.rest(b.clients[1],'GET','posts',id='eq.'+p['id']).json()==[]


def upload_side(b,p,actor,kind):
 sid=str(uuid.uuid4());base=b.couples[0]+'/'+b.users[actor]+'/'+p['id']+'_side_'+sid
 if kind=='photo':
  data=io.BytesIO();Image.new('RGB',(2,2),'purple').save(data,format='WEBP');blob=data.getvalue();ext='webp';mime='image/webp'
 else:blob=b'disposable synthetic audio';ext='webm';mime='audio/webm'
 path=base+'.'+ext;thumb=base+'_t.webp' if kind=='photo' else None
 for name in (path,thumb):
  if name:
   assert b.clients[actor].client.post('/storage/v1/object/media/'+name,content=blob,headers={'Content-Type':mime}).status_code==200;b.paths.append(name)
 return dict(id=sid,kind=kind,body='Our memory',path=path,thumb_path=thumb,width=2,height=2,duration=3),len(blob)


def test_complete_files_quota_partner_access_receipts_and_old_worker_guard(backend):
 b=backend;p=root(b);voice,size=upload_side(b,p,1,'voice');saved=write(b,p,1,side=voice);assert saved.status_code==200,saved.text
 p=saved.json();assert p['memory_bytes']==size
 assert b.clients[0].client.post('/storage/v1/object/sign/media/'+voice['path'],json={'expiresIn':60}).status_code==200
 assert b.clients[3].client.post('/storage/v1/object/sign/media/'+voice['path'],json={'expiresIn':60}).status_code>=400
 for actor in (0,1):
  device=str(uuid.uuid4());assert rpc(b,actor,'set_keepsake_device',p_device=device,p_enabled=True).status_code==200
  ack=rpc(b,actor,'ack_keepsake_asset',p_device=device,p_post=p['id'],p_asset=voice['id'],p_revision=p['archive_revision'],p_bytes=size,p_sha256='a'*64);assert ack.status_code==204,ack.text
 assert write(b,p,1,version=1,side=dict(voice,body='Updated')).status_code==200
 assert b.rest(b.clients[0],'GET','keepsake_asset_receipts',post_id='eq.'+p['id']).json()==[]
 with b.db() as db:
  db.execute("update storage.objects set created_at=now()-interval '25 hours' where bucket_id='media' and name=%s",(voice['path'],))
  assert db.execute('select * from public.claim_orphan_media(%s)',([voice['path']],)).fetchall()==[]
 assert b.rest(b.clients[1],'PATCH','posts',{'keep':False},id='eq.'+p['id']).status_code==200
 with b.db() as db:
  db.execute("update public.posts set expires_at=now()-interval '1 minute' where id=%s",(p['id'],))
  rows=db.execute('select id,deletion_token from public.claim_expired_posts(500)').fetchall();token=next(token for identity,token in rows if str(identity)==p['id'])
  assert not db.execute('select public.finish_expired_post(%s,%s)',(p['id'],token)).fetchone()[0]
 with b.db() as db:db.execute("update public.posts set deleting_at=now()-interval '11 minutes' where id=%s",(p['id'],))
 # Real retention API is the only file deleter; it handles all sides before finishing root.
 assert b.retention().status_code==200
 with b.db() as db:assert db.execute('select id from public.posts where id=%s',(p['id'],)).fetchone() is None

def test_side_paths_metadata_quota_and_failed_write_rollback(backend):
 b=backend;p=root(b);photo,size=upload_side(b,p,1,'photo')
 assert write(b,p,0,side=photo).status_code>=400
 for malformed in (dict(photo,width=0),dict(photo,thumb_path=None),dict(photo,kind='unknown')):assert write(b,p,1,side=malformed).status_code>=400
 result=write(b,p,1,side=dict(photo,bytes=99999999));assert result.status_code==200
 assert result.json()['memory_bytes']==2*size
 assert result.json()['memory_sides'][0]['bytes']==size
 qroot=root(b);sid=str(uuid.uuid4());path=b.couples[0]+'/'+b.users[0]+'/'+qroot['id']+'_side_'+sid+'.webm'
 assert b.clients[0].client.post('/storage/v1/object/media/'+path,content=b'x'*(1048576+1),headers={'Content-Type':'audio/webm'}).status_code==200;b.paths.append(path)
 filler=b.post()
 with b.db() as db:
  quota=db.execute('select keepsake_quota_mb from public.couples where id=%s',(b.couples[0],)).fetchone()[0]
  used=db.execute('select coalesce(sum(media_bytes::bigint+thumb_bytes+extra_media_bytes+extra_thumb_bytes+memory_bytes),0) from public.posts where couple_id=%s and keep and cloud_state in (\'online\',\'restoring\')',(b.couples[0],)).fetchone()[0]
  db.execute('update public.posts set media_bytes=%s where id=%s',(quota*1048576-used-1048575,filler['id']))
 assert b.rest(b.clients[0],'PATCH','posts',{'keep':True},id='eq.'+filler['id']).status_code==200
 try:
  response=write(b,qroot,side=dict(id=sid,kind='voice',body='',path=path,duration=5))
  assert response.status_code>=400 and 'QUOTA' in response.text
  row=b.rest(b.clients[0],'GET','posts',id='eq.'+qroot['id']).json()[0]
  assert row['memory_sides']==[] and row['memory_bytes']==0 and row['archive_revision']==qroot['archive_revision']
 finally:
  assert b.rest(b.clients[0],'PATCH','posts',{'keep':False},id='eq.'+filler['id']).status_code==200
