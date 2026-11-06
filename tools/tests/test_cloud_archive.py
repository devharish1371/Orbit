"""Archive/restore protocol: disposable files, never real members or memories."""
import hashlib, uuid
import pytest
from tools.tests.test_memory_sides import root, write, words
from tools.tests.test_phone_keepsakes import rpc, device, ack
pytestmark=pytest.mark.integration

def service(b,name,**args):
 return b.admin.client.post('/rest/v1/rpc/'+name,json=args)

def ok(r):
 assert r.status_code in (200,204),r.text
 return r.json() if r.content else None

def proposal(b):
 p=root(b);p=ok(write(b,p,1,side=words('A second voice in words')))
 data=b.admin.client.get('/storage/v1/object/authenticated/media/'+p['media_path']).content
 digest=hashlib.sha256(data).hexdigest();phones=[]
 for actor in (0,1):
  d=device(b,actor);phones.append(d)
  ok(ack(b,p,d,actor,p_sha256=digest))
  ok(rpc(b,actor,'ack_keepsake_asset',p_device=d,p_post=p['id'],p_asset=p['memory_sides'][0]['id'],p_revision=p['archive_revision'],p_bytes=0,p_sha256=hashlib.sha256(b'').hexdigest()))
  ok(rpc(b,actor,'confirm_copy_protocol',p_device=d))
 a=ok(rpc(b,0,'prepare_memory_archive',p_post=p['id']))
 files=[dict(path=f['path'],bytes=f['bytes'],sha256=digest) for f in a['files']]
 return p,a,phones,files,data

def approvals(b,p,a,phones,files):
 for actor,d in enumerate(phones):
  ok(rpc(b,actor,'approve_memory_archive',p_post=p['id'],p_archive=a['archive_id'],p_device=d,p_snapshot_sha=a['snapshot_sha'],p_zip_sha='d'*64,p_zip_bytes=len(a['snapshot'].encode())+sum(f['bytes'] for f in files)+1024,p_files=files,p_independent_backup=True))

def queue(b,p,a):return rpc(b,0,'queue_memory_archive',p_post=p['id'],p_archive=a['archive_id'],p_snapshot_sha=a['snapshot_sha'])

def test_archive_requires_both_current_phones_backups_owner_and_scope(backend):
 b=backend;p,a,phones,files,data=proposal(b)
 assert queue(b,p,a).status_code>=400
 for actor in (2,3):
  assert b.rest(b.clients[actor],'GET','memory_archives',post_id='eq.'+p['id']).json()==[]
  assert rpc(b,actor,'prepare_memory_archive',p_post=p['id']).status_code>=400
 assert b.rest(b.clients[0],'PATCH','memory_archives',{'state':'archived'},post_id='eq.'+p['id']).status_code>=400
 assert b.clients[0].client.post('/rest/v1/rpc/claim_memory_archives',json={}).status_code>=400
 approvals(b,p,a,phones,files)
 assert rpc(b,1,'queue_memory_archive',p_post=p['id'],p_archive=a['archive_id'],p_snapshot_sha=a['snapshot_sha']).status_code>=400
 ok(queue(b,p,a))
 assert b.rest(b.clients[0],'GET','posts',id='eq.'+p['id']).json()==[]
 manifest=ok(rpc(b,0,'phone_copy_manifest',p_device=phones[0]))
 assert any(row['id']==p['id'] for row in manifest)
 ok(rpc(b,1,'cancel_memory_archive',p_post=p['id'],p_archive=a['archive_id']))
 assert b.rest(b.clients[0],'GET','posts',id='eq.'+p['id']).json()[0]['cloud_state']=='online'
 # A protocol-1 writer invalidates eligibility even if its receipt is fresh.
 ok(ack(b,p,phones[0],p_sha256=files[0]['sha256']))
 assert rpc(b,0,'prepare_memory_archive',p_post=p['id']).status_code>=400


def test_archive_storage_first_restore_generation_and_partial_guards(backend):
 b=backend;p,a,phones,files,data=proposal(b);approvals(b,p,a,phones,files);ok(queue(b,p,a))
 assert ok(service(b,'claim_memory_archives',p_post=p['id'],p_actor=b.users[3]))==[]
 job=ok(service(b,'claim_memory_archives',p_post=p['id'],p_actor=b.users[0]))[0]
 assert ok(service(b,'claim_memory_archives',p_post=p['id']))==[]
 args=dict(p_post=p['id'],p_archive=a['archive_id'],p_token=job['token'])
 assert ok(service(b,'finish_memory_archive',**args)) is False
 assert rpc(b,0,'cancel_memory_archive',p_post=p['id'],p_archive=a['archive_id']).status_code>=400
 # No new avatar/post references may capture a file after removal is claimed.
 assert b.rest(b.clients[0],'PATCH','members',{'avatar_path':p['media_path']},user_id='eq.'+b.users[0]).status_code>=400
 b.admin.request('DELETE','/storage/v1/object/media',json={'prefixes':[f['path'] for f in files]})
 assert ok(service(b,'finish_memory_archive',**dict(args,p_token=str(uuid.uuid4())))) is False
 assert ok(service(b,'finish_memory_archive',**args)) is True
 restore=ok(rpc(b,1,'begin_memory_restore',p_post=p['id'],p_archive=a['archive_id'],p_snapshot_sha=a['snapshot_sha']))
 assert rpc(b,0,'begin_memory_restore',p_post=p['id'],p_archive=a['archive_id'],p_snapshot_sha=a['snapshot_sha']).status_code>=400
 assert ok(service(b,'finish_memory_restore',p_actor=b.users[1],p_post=p['id'],p_restore=restore['restore_id'])) is False
 for t in restore['targets']:
  assert t['path']!=t['source'];b.paths.append(t['path'])
  b.admin.request('POST','/storage/v1/object/media/'+t['path'],content=data,headers={'Content-Type':'image/png'})
  ok(service(b,'ack_memory_restore_asset',p_actor=b.users[1],p_post=p['id'],p_restore=restore['restore_id'],p_source=t['source'],p_sha256=t['sha256']))
 assert ok(service(b,'finish_memory_restore',p_actor=b.users[1],p_post=p['id'],p_restore=restore['restore_id'])) is True
 restored=b.rest(b.clients[0],'GET','posts',id='eq.'+p['id']).json()[0]
 assert restored['cloud_state']=='online' and restored['media_path']!=p['media_path']
 assert restored['memory_sides'][0]['author_id']==b.users[1]
 b.admin.request('DELETE','/storage/v1/object/media',json={'prefixes':[f['path'] for f in files]})
 assert b.admin.client.get('/storage/v1/object/authenticated/media/'+restored['media_path']).content==data


def test_stale_receipt_invalidates_queue_and_restore_cancel_has_fresh_targets(backend):
 b=backend;p,a,phones,files,data=proposal(b);approvals(b,p,a,phones,files);ok(queue(b,p,a))
 with b.db() as db:db.execute("update public.keepsake_receipts set verified_at=now()-interval '1 day' where post_id=%s",(p['id'],))
 assert ok(service(b,'claim_memory_archives',p_post=p['id']))==[]
 assert b.rest(b.clients[0],'GET','posts',id='eq.'+p['id']).json()[0]['cloud_state']=='online'
 # Refresh receipts, reapprove, complete and cancel an incomplete restore.
 for actor,d in enumerate(phones):
  ok(ack(b,p,d,actor,p_sha256=files[0]['sha256']));ok(rpc(b,actor,'confirm_copy_protocol',p_device=d))
 approvals(b,p,a,phones,files);ok(queue(b,p,a));j=ok(service(b,'claim_memory_archives',p_post=p['id']))[0]
 b.admin.request('DELETE','/storage/v1/object/media',json={'prefixes':[f['path'] for f in files]})
 assert ok(service(b,'finish_memory_archive',p_post=p['id'],p_archive=a['archive_id'],p_token=j['token']))
 r=ok(rpc(b,0,'begin_memory_restore',p_post=p['id'],p_archive=a['archive_id'],p_snapshot_sha=a['snapshot_sha']))
 targets=ok(service(b,'cancel_memory_restore',p_actor=b.users[0],p_post=p['id'],p_restore=r['restore_id']))
 assert len(targets)==len(files)
 ok(service(b,'cancel_memory_restore',p_actor=b.users[0],p_post=p['id'],p_restore=r['restore_id'],p_finish=True))
 new=ok(rpc(b,0,'begin_memory_restore',p_post=p['id'],p_archive=a['archive_id'],p_snapshot_sha=a['snapshot_sha']))
 assert new['restore_id']!=r['restore_id'] and new['targets'][0]['path']!=targets[0]['path']
 ok(service(b,'cancel_memory_restore',p_actor=b.users[0],p_post=p['id'],p_restore=new['restore_id']))
 ok(service(b,'cancel_memory_restore',p_actor=b.users[0],p_post=p['id'],p_restore=new['restore_id'],p_finish=True))

def test_complete_photo_set_and_both_media_sides_restore_with_original_authors(backend):
 from tools.tests.test_photo_sets import draft,create
 b=backend;payload=draft(b,2);payload['keep']=True;p=ok(create(b,payload))
 # Canonical independent photo side and voice side.
 import io
 from PIL import Image
 side=str(uuid.uuid4());prefix=f"{b.couples[0]}/{b.users[1]}/{p['id']}_side_{side}"
 image=io.BytesIO();Image.new('RGB',(5,5),'#9b7dbe').save(image,format='WEBP');picture=image.getvalue()
 for path in [prefix+'.webp',prefix+'_t.webp']:
  b.clients[1].request('POST','/storage/v1/object/media/'+path,content=picture,headers={'Content-Type':'image/webp'});b.paths.append(path)
 p=ok(write(b,p,1,side=dict(id=side,kind='photo',body='Their photo',path=prefix+'.webp',thumb_path=prefix+'_t.webp',width=5,height=5)))
 voice=str(uuid.uuid4());vpath=f"{b.couples[0]}/{b.users[0]}/{p['id']}_side_{voice}.webm"
 b.clients[0].request('POST','/storage/v1/object/media/'+vpath,content=b'disposable voice',headers={'Content-Type':'audio/webm'});b.paths.append(vpath)
 p=ok(write(b,p,side=dict(id=voice,kind='voice',body='My voice',path=vpath,duration=2)))
 with b.db() as db:manifest=db.execute('select orbit_private.memory_file_manifest(p) from public.posts p where id=%s',(p['id'],)).fetchone()[0]
 contents={f['path']:b.admin.request('GET','/storage/v1/object/authenticated/media/'+f['path']).content for f in manifest}
 phones=[]
 for actor in (0,1):
  d=device(b,actor);phones.append(d)
  for f in manifest:
   if not f['copy_id']:continue
   values=dict(p_device=d,p_post=p['id'],p_revision=p['archive_revision'],p_bytes=f['bytes'],p_sha256=hashlib.sha256(contents[f['path']]).hexdigest())
   if ':' in f['copy_id']:ok(rpc(b,actor,'ack_keepsake_asset',**values,p_asset=f['copy_id'].split(':')[1]))
   else:ok(rpc(b,actor,'ack_keepsake_copy',**values))
  ok(rpc(b,actor,'confirm_copy_protocol',p_device=d))
 a=ok(rpc(b,0,'prepare_memory_archive',p_post=p['id']));assert len(a['files'])==7
 files=[dict(path=f['path'],bytes=f['bytes'],sha256=hashlib.sha256(contents[f['path']]).hexdigest()) for f in a['files']]
 approvals(b,p,a,phones,files);ok(queue(b,p,a));job=ok(service(b,'claim_memory_archives',p_post=p['id']))[0]
 b.admin.request('DELETE','/storage/v1/object/media',json={'prefixes':list(contents)})
 assert ok(service(b,'finish_memory_archive',p_post=p['id'],p_archive=a['archive_id'],p_token=job['token']))
 r=ok(rpc(b,0,'begin_memory_restore',p_post=p['id'],p_archive=a['archive_id'],p_snapshot_sha=a['snapshot_sha']))
 for t in r['targets']:
  b.paths.append(t['path']);mime=next(f['mime'] for f in a['files'] if f['path']==t['source'])
  b.admin.request('POST','/storage/v1/object/media/'+t['path'],content=contents[t['source']],headers={'Content-Type':mime})
  ok(service(b,'ack_memory_restore_asset',p_actor=b.users[0],p_post=p['id'],p_restore=r['restore_id'],p_source=t['source'],p_sha256=t['sha256']))
 assert ok(service(b,'finish_memory_restore',p_actor=b.users[0],p_post=p['id'],p_restore=r['restore_id']))
 new=b.rest(b.clients[0],'GET','posts',id='eq.'+p['id']).json()[0]
 assert [x['id'] for x in new['photo_items']]==[x['id'] for x in p['photo_items']]
 assert {x['author_id'] for x in new['memory_sides']}==set(b.users[:2])
 own=next(x for x in new['memory_sides'] if x['author_id']==b.users[1])
 # Caption-only edits can reuse an isolated restored path; replacement still needs a fresh canonical ID.
 edited=ok(write(b,new,1,version=own['version'],side=dict(own,body='After restore')))
 assert next(x for x in edited['memory_sides'] if x['author_id']==b.users[1])['path']==own['path']
