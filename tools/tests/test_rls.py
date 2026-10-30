from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from tools.orbit_common import Api

pytestmark = pytest.mark.integration
TABLES = ['couples','members','live_location','location_history','daily_summary','places','place_presence','events','posts','comments','reactions','capsules','question_answers','device_tokens','retention_runs','_migrations','media_gc']


def test_rls_enabled_and_stranger_cannot_read_any_orbit_table(backend) -> None:
    with backend.db() as db:
        rows = db.execute("select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'").fetchall()
    assert all(enabled for name, enabled in rows if name in TABLES)
    for table in TABLES:
        response = backend.rest(backend.clients[2], 'GET', table)
        assert response.status_code in (200, 401, 403), table
        if response.status_code == 200:
            assert response.json() == [], table


def test_anonymous_has_no_table_data(backend) -> None:
    public = Api(backend.url, backend.public_key)
    try:
        for table in TABLES:
            response = backend.rest(public, 'GET', table)
            assert response.status_code in (200, 401, 403), table
            if response.status_code == 200:
                assert response.json() == [], table
    finally:
        public.close()


def test_stranger_writes_and_actor_spoofing_are_denied(backend) -> None:
    now = datetime.now(timezone.utc).isoformat()
    for actor, user in [(2,backend.users[2]),(0,backend.users[1])]:
        base = {'couple_id':backend.couples[0], 'user_id':user}
        attempts = {
            'live_location':{**base,'lat':13,'lng':80,'recorded_at':now},
            'location_history':{**base,'lat':13,'lng':80,'recorded_at':now},
            'events':{**base,'type':'nudge'},
            'posts':{'couple_id':backend.couples[0],'author_id':user,'channel':'moment','kind':'text','body':'denied'},
            'question_answers':{**base,'day':'2026-01-01','question_idx':0,'answer':'denied'},
            'capsules':{'couple_id':backend.couples[0],'author_id':user,'title':'denied','body':'denied','unlock_at':(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()},
        }
        for table, body in attempts.items():
            assert backend.rest(backend.clients[actor],'POST',table,body).status_code >= 400, table


def test_member_cannot_change_partner_or_membership(backend) -> None:
    response = backend.rest(backend.clients[0],'PATCH','members',{'display_name':'spoof'},user_id='eq.'+backend.users[1])
    assert response.status_code == 200 and response.json() == []
    assert backend.rest(backend.clients[0],'PATCH','members',{'couple_id':backend.couples[1]},user_id='eq.'+backend.users[0]).status_code >= 400


def test_profile_preferences_are_self_editable_and_validated(backend) -> None:
    values = {'nickname':'Fixture', 'partner_nickname':'My person', 'color':'#24BCA0',
              'theme_mode':'light', 'theme_accent':'#7C5CFF', 'phone':'+919999999999'}
    own = backend.rest(backend.clients[0], 'PATCH', 'members', values, user_id='eq.'+backend.users[0])
    assert own.status_code == 200
    assert all(own.json()[0][key] == value for key, value in values.items())
    denied = backend.rest(backend.clients[1], 'PATCH', 'members', {'theme_mode':'dark'}, user_id='eq.'+backend.users[0])
    assert denied.status_code == 200 and denied.json() == []
    for invalid in [{'display_name':' '}, {'nickname':'x'*41}, {'partner_nickname':'x'*41},
                    {'color':'red'}, {'theme_accent':'javascript:alert(1)'},
                    {'theme_mode':'invalid'}, {'phone':'9999'}]:
        assert backend.rest(backend.clients[0], 'PATCH', 'members', invalid, user_id='eq.'+backend.users[0]).status_code >= 400


def test_private_profile_photo_can_only_reference_own_upload(backend) -> None:
    path = backend.upload(avatar=True)
    own = backend.rest(backend.clients[0], 'PATCH', 'members', {'avatar_path':path}, user_id='eq.'+backend.users[0])
    assert own.status_code == 200 and own.json()[0]['avatar_path'] == path
    spoofed = backend.rest(backend.clients[1], 'PATCH', 'members', {'avatar_path':path}, user_id='eq.'+backend.users[1])
    assert spoofed.status_code >= 400
    cleared = backend.rest(backend.clients[0], 'PATCH', 'members', {'avatar_path':None}, user_id='eq.'+backend.users[0])
    assert cleared.status_code == 200


def test_partner_can_keep_but_cannot_edit_body_author_or_cleanup_state(backend) -> None:
    post = backend.post()
    response = backend.rest(backend.clients[1],'PATCH','posts',{'keep':True},id='eq.'+post['id'])
    assert response.status_code == 200
    assert response.json()[0]['expires_at'] is None
    assert response.json()[0]['kept_by'] == backend.users[1]
    for body in [{'body':'tampered'},{'author_id':backend.users[1]},{'deleting_at':datetime.now(timezone.utc).isoformat()}]:
        assert backend.rest(backend.clients[1],'PATCH','posts',body,id='eq.'+post['id']).status_code >= 400
    assert backend.rest(backend.clients[0],'PATCH','posts',{'keep':False},id='eq.'+post['id']).status_code == 200


def test_foreign_parent_ids_cannot_be_linked_into_this_couple(backend) -> None:
    foreign = backend.post(3, couple_id=backend.couples[1])
    for table,body in [
        ('comments',{'post_id':foreign['id'],'author_id':backend.users[0],'body':'denied'}),
        ('reactions',{'post_id':foreign['id'],'user_id':backend.users[0],'emoji':'❤️'}),
    ]:
        response = backend.rest(backend.clients[0],'POST',table,{'couple_id':backend.couples[0],**body})
        assert response.status_code >= 400


def test_member_limit_including_privileged_insert(backend) -> None:
    with backend.db() as db:
        with pytest.raises(Exception, match='COUPLE_MEMBER_LIMIT'):
            with db.transaction():
                db.execute("insert into public.members(user_id,couple_id,display_name) values(%s,%s,'Third')",(backend.users[2],backend.couples[0]))


def test_quota_is_database_enforced(backend) -> None:
    post = backend.post()
    with backend.db() as db:
        db.execute('update public.posts set media_bytes=400*1024*1024 where id=%s',(post['id'],))
    try:
        response = backend.rest(backend.clients[1],'PATCH','posts',{'keep':True},id='eq.'+post['id'])
        assert response.status_code >= 400
        assert 'KEEPSAKE_QUOTA_EXCEEDED' in response.text
    finally:
        with backend.db() as db:
            db.execute('update public.posts set media_bytes=0 where id=%s',(post['id'],))


def test_capsule_is_hidden_before_unlock_and_visible_after(backend) -> None:
    body={'p_id':str(uuid.uuid4()),'p_title':'Capsule','p_body':'Private future note','p_unlock_at':(datetime.now(timezone.utc)+timedelta(days=1)).isoformat()}
    response=backend.clients[0].client.post('/rest/v1/rpc/create_capsule',json=body)
    assert response.status_code == 200
    capsule=response.json()['id']
    assert backend.rest(backend.clients[1],'GET','capsules',id='eq.'+capsule).json() == []
    with backend.db() as db:
        db.execute("update public.capsules set unlock_at=now()-interval '1 minute' where id=%s",(capsule,))
    assert len(backend.rest(backend.clients[1],'GET','capsules',id='eq.'+capsule).json()) == 1
    assert backend.rest(backend.clients[1],'PATCH','capsules',{'body':'tampered'},id='eq.'+capsule).status_code >= 400


def test_daily_answers_hidden_until_both_answered(backend) -> None:
    day='2026-01-02'
    for actor in (0,1):
        # Historical fixture setup is admin-only. Clients now use a server-dated RPC;
        # test_delight verifies they cannot forge/backdate an answer to bypass disclosure.
        with backend.db() as db:
            db.execute('insert into public.question_answers(couple_id,user_id,day,question_idx,answer) values(%s,%s,%s,0,%s)',(backend.couples[0],backend.users[actor],day,'Fixture answer'))
        visible=backend.rest(backend.clients[1],'GET','question_answers',day='eq.'+day).json()
        assert len(visible) == (0 if actor == 0 else 2)


def test_storage_is_private_and_stranger_cannot_sign_or_read(backend) -> None:
    post_id=str(uuid.uuid4())
    path=backend.upload(post_id=post_id)
    assert backend.clients[1].client.get('/storage/v1/object/authenticated/media/'+path).status_code >= 400
    backend.post(id=post_id,kind='photo',body=None,media_path=path)
    assert backend.clients[2].client.get('/storage/v1/object/authenticated/media/'+path).status_code >= 400
    assert backend.clients[2].client.post('/storage/v1/object/sign/media/'+path,json={'expiresIn':60}).status_code >= 400
    assert backend.clients[1].client.get('/storage/v1/object/authenticated/media/'+path).status_code == 200
    assert backend.clients[1].client.post('/storage/v1/object/media/'+path,content=b'x',headers={'Content-Type':'image/png'}).status_code >= 400


def test_internal_functions_and_infrastructure_are_not_client_callable(backend) -> None:
    for name,body in [('claim_expired_posts',{}),('finish_expired_post',{'p_id':str(uuid.uuid4()),'p_token':str(uuid.uuid4())}),('claim_orphan_media',{'p_paths':[]}),('finish_orphan_media',{'p_paths':[]})]:
        assert backend.clients[0].client.post('/rest/v1/rpc/'+name,json=body).status_code >= 400
    with backend.db() as db:
        row=db.execute("select has_table_privilege('authenticated','public.posts','TRUNCATE')").fetchone()
        assert row == (False,)


def test_public_signup_attempt_fails(backend) -> None:
    public=Api(backend.url,backend.public_key)
    try:
        response=public.client.post('/auth/v1/signup',json={'email':f'disabled-{uuid.uuid4().hex}@example.com','password':'ThisIsDisposable-NotAnAccount1'})
        if response.status_code < 400:
            user=response.json().get('user')
            if user:
                backend.admin.request('DELETE','/auth/v1/admin/users/'+user['id'])
        assert response.status_code >= 400
        assert response.json().get('error_code') == 'signup_disabled'
    finally:
        public.close()


def test_passwordless_otp_session_refresh_and_explicit_logout(backend) -> None:
    # Admin generates a code only for a disposable identity, with no email send.
    # This tests verification/refresh/logout before custom SMTP is supplied.
    with backend.db() as db:
        email=db.execute('select email from auth.users where id=%s',(backend.users[2],)).fetchone()[0]
    generated=backend.admin.request('POST','/auth/v1/admin/generate_link',json={'type':'magiclink','email':email}).json()
    code=generated.get('email_otp')
    assert isinstance(code,str) and len(code) >= 6
    public=Api(backend.url,backend.public_key)
    try:
        verified=public.request('POST','/auth/v1/verify',json={'email':email,'token':code,'type':'email'}).json()
        assert verified['user']['id'] == backend.users[2]
        refreshed=public.request('POST','/auth/v1/token?grant_type=refresh_token',json={'refresh_token':verified['refresh_token']}).json()
        assert refreshed['user']['id'] == backend.users[2]
        ended=public.client.post('/auth/v1/logout?scope=local',headers={'Authorization':'Bearer '+refreshed['access_token']})
        assert ended.status_code in (200,204)
        assert public.client.post('/auth/v1/token?grant_type=refresh_token',json={'refresh_token':refreshed['refresh_token']}).status_code >= 400
    finally:
        public.close()


def test_history_rejects_precise_writes_while_paused_or_surprise(backend) -> None:
    user=backend.users[0]
    for mode in ['paused','surprise']:
        try:
            changed=backend.rest(backend.clients[0],'PATCH','members',{'share_mode':mode},user_id='eq.'+user)
            assert changed.status_code == 200
            row={'user_id':user,'couple_id':backend.couples[0],'lat':13,'lng':80,'recorded_at':datetime.now(timezone.utc).isoformat()}
            assert backend.rest(backend.clients[0],'POST','location_history',row).status_code >= 400
        finally:
            assert backend.rest(backend.clients[0],'PATCH','members',{'share_mode':'live'},user_id='eq.'+user).status_code == 200
