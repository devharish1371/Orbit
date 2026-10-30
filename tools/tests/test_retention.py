from __future__ import annotations
import uuid
from datetime import datetime, timezone
import pytest

pytestmark = pytest.mark.integration


def test_retention_requires_private_secret(backend) -> None:
    assert backend.retention(authorized=False).status_code == 403


def test_expired_row_and_file_removed_kept_and_avatar_survive_orphan_swept(backend) -> None:
    expired_id=str(uuid.uuid4())
    expired_path=backend.upload(post_id=expired_id)
    expired=backend.post(id=expired_id,kind='photo',body=None,media_path=expired_path)
    kept_id=str(uuid.uuid4())
    kept_path=backend.upload(post_id=kept_id)
    kept=backend.post(id=kept_id,kind='photo',body=None,media_path=kept_path)
    assert kept['media_bytes'] > 0  # Derived from Storage, not supplied by caller.
    assert backend.rest(backend.clients[1],'PATCH','posts',{'keep':True},id='eq.'+kept_id).status_code == 200
    orphan=backend.upload()
    fresh=backend.upload()
    avatar=backend.upload(avatar=True)
    assert backend.rest(backend.clients[0],'PATCH','members',{'avatar_path':avatar},user_id='eq.'+backend.users[0]).status_code == 200
    with backend.db() as db:
        db.execute("update public.posts set expires_at=now()-interval '1 hour' where id=%s",(expired_id,))
        # Timestamp fixtures only: file bytes are never deleted through SQL.
        db.execute("update storage.objects set created_at=now()-interval '25 hours' where bucket_id='media' and name=any(%s)",([orphan,kept_path,avatar],))
    response=backend.retention()
    assert response.status_code == 200, 'Retention failed: HTTP '+str(response.status_code)
    stats=response.json()
    assert stats['posts_deleted'] >= 1
    assert stats['orphans_deleted'] >= 1
    assert stats['error'] is None
    assert backend.rest(backend.admin,'GET','posts',id='eq.'+expired_id).json() == []
    for path,exists in [(expired_path,False),(orphan,False),(kept_path,True),(avatar,True),(fresh,True)]:
        result=backend.admin.client.get('/storage/v1/object/authenticated/media/'+path)
        assert (result.status_code == 200) == exists
        folder,name=path.rsplit('/',1)
        listing=backend.admin.request('POST','/storage/v1/object/list/media',json={'prefix':folder,'limit':1000}).json()
        assert any(item['name']==name for item in listing) == exists
    assert len(backend.rest(backend.admin,'GET','posts',id='eq.'+kept_id).json()) == 1
    again=backend.retention()
    assert again.status_code == 200
    assert again.json()['posts_deleted'] == 0


def test_keep_and_cleanup_are_serialized(backend) -> None:
    post=backend.post()
    with backend.db() as db:
        db.execute("update public.posts set expires_at=now()-interval '1 minute' where id=%s",(post['id'],))
        claimed=db.execute('select id,deletion_token from public.claim_expired_posts(500)').fetchall()
    token=next(token for row_id,token in claimed if str(row_id)==post['id'])
    response=backend.rest(backend.clients[1],'PATCH','posts',{'keep':True},id='eq.'+post['id'])
    assert (response.status_code >= 400 and 'POST_CLEANUP_IN_PROGRESS' in response.text) or (response.status_code == 200 and response.json() == [])
    with backend.db() as db:
        assert db.execute('select public.finish_expired_post(%s,%s)',(post['id'],str(uuid.uuid4()))).fetchone() == (False,)
        assert db.execute('select public.finish_expired_post(%s,%s)',(post['id'],token)).fetchone() == (True,)


def test_orphan_tombstone_prevents_late_post_reference(backend) -> None:
    post_id=str(uuid.uuid4())
    path=backend.upload(post_id=post_id)
    with backend.db() as db:
        db.execute("update storage.objects set created_at=now()-interval '25 hours' where bucket_id='media' and name=%s",(path,))
        assert db.execute('select * from public.claim_orphan_media(%s)',([path],)).fetchall() == [(path,)]
    result=backend.rest(backend.clients[0],'POST','posts',{'id':post_id,'couple_id':backend.couples[0],'author_id':backend.users[0],'channel':'moment','kind':'photo','media_path':path})
    assert result.status_code >= 400 and 'MEDIA_CLEANUP_IN_PROGRESS' in result.text


def test_cron_and_function_privileges(backend) -> None:
    with backend.db() as db:
        jobs=db.execute("select jobname from cron.job where jobname like 'orbit-%'").fetchall()
        assert {row[0] for row in jobs} == {'orbit-retention','orbit-stale','orbit-modes','orbit-rollup','orbit-capsules','orbit-notify-retry','orbit-notify-cleanup'}
        unsafe=db.execute("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='orbit_private' and p.prosecdef and (has_function_privilege('anon',p.oid,'EXECUTE') or p.proconfig is null)").fetchall()
        assert unsafe == []
        assert db.execute("select public from storage.buckets where id='media'").fetchone() == (False,)
