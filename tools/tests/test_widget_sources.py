"""The exact native widget projections use ordinary RLS and disposable accounts only."""
import uuid
import pytest
from tools.tests.test_posts import create
from tools.tests.test_plans import draft,rpc
pytestmark=pytest.mark.integration

def test_widget_photo_projection_signed_path_retention_and_foreign_scope(backend):
 b=backend;identity=str(uuid.uuid4());path=b.upload(post_id=identity)
 post=create(b,id=identity,kind='photo',media_path=path,keep=True).json()
 def photo(actor=0):return b.rest(b.clients[actor],'GET','posts',id='eq.'+identity,couple_id='eq.'+b.couples[0],keep='eq.true',unsent_at='is.null',kind='eq.photo',select='id,archive_revision,thumb_path,media_path')
 assert photo().json()[0]['archive_revision']==post['archive_revision']
 signed=b.clients[0].client.post('/storage/v1/object/sign/media/'+path,json={'expiresIn':120});assert signed.status_code==200
 assert signed.json()['signedURL'].startswith('/object/sign/media/'+path+'?')
 for actor in (2,3):assert photo(actor).json()==[]
 assert b.rest(b.clients[1],'PATCH','posts',{'keep':False},id='eq.'+identity).status_code==200
 assert photo().json()==[]
 assert b.rest(b.clients[0],'PATCH','posts',{'keep':True},id='eq.'+identity).status_code==200
 assert photo().json()[0]['archive_revision']>post['archive_revision']
 assert b.clients[0].client.post('/rest/v1/rpc/request_unsend',json={'p_id':identity}).status_code==200
 assert photo().json()==[]

def test_widget_plan_projection_tracks_current_version_and_hides_cancelled_or_foreign_rows(backend):
 b=backend;body=draft();plan=rpc(b,0,'save_plan',**body).json()
 def view(actor=0):return b.rest(b.clients[actor],'GET','plans',id='eq.'+plan['id'],couple_id='eq.'+b.couples[0],cancelled='eq.false',select='id,title,starts_at,timezone,version')
 assert view().json()[0]['version']==1
 for actor in (2,3):assert view(actor).json()==[]
 assert rpc(b,0,'save_plan',**dict(body,p_version=1,p_title='Changed plan')).status_code==200
 assert view().json()[0]['version']==2
 assert rpc(b,1,'respond_plan',p_id=plan['id'],p_version=2,p_accept=False).status_code==200
 assert view().json()==[]
