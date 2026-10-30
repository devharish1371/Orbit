"""Create/clean an isolated disposable couple for browser QA; never email real people."""
from __future__ import annotations
import argparse
import io
import json
import secrets
import uuid
from PIL import Image,ImageDraw
from tools.orbit_common import ROOT,admin_api,database

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--clean',action='store_true');args=parser.parse_args()
    folder=ROOT/'.artifacts/private/ui-fixture';folder.mkdir(parents=True,exist_ok=True);folder.chmod(0o700)
    file=folder/'state.json';api=admin_api()
    try:
        if args.clean:
            if not file.exists():print('No UI fixture to clean.');return
            state=json.loads(file.read_text())
            if state.get('fixture')!='orbit-m6-ui':raise ValueError('Unexpected fixture')
            with database() as db:
                name=db.execute('select name from public.couples where id=%s',(state['couple'],)).fetchone()
                if name and name[0]!='Disposable UI fixture':raise ValueError('Unexpected couple')
                paths=[row[0] for row in db.execute("select name from storage.objects where bucket_id='media' and split_part(name,'/',1)=%s",(state['couple'],)).fetchall()]
            for offset in range(0,len(paths),1000):api.request('DELETE','/storage/v1/object/media',json={'prefixes':paths[offset:offset+1000]})
            with database() as db:
                db.execute('delete from public.couples where id=%s',(state['couple'],))
            for user in state['users']:api.request('DELETE','/auth/v1/admin/users/'+user)
            file.unlink();print('Disposable browser fixture and its Storage files removed.');return
        if file.exists():
            state=json.loads(file.read_text())
            if state.get('fixture')!='orbit-m6-ui' or len(state['users'])!=2 or len(state['paths'])<2:raise ValueError('Partial fixture; clean before preparing again.')
            link=api.request('POST','/auth/v1/admin/generate_link',json={'type':'magiclink','email':state['email']}).json()
            state['code']=link['email_otp'];file.write_text(json.dumps(state));file.chmod(0o600)
            print('Disposable UI fixture login refreshed privately; no email sent.');return
        state={'fixture':'orbit-m6-ui','couple':str(uuid.uuid4()),'users':[],'paths':[],'email':''}
        def save():file.write_text(json.dumps(state));file.chmod(0o600)
        save()
        for index in range(2):
            email='orbit-ui-'+uuid.uuid4().hex+'@example.com'
            result=api.request('POST','/auth/v1/admin/users',json={'email':email,'password':secrets.token_urlsafe(32),'email_confirm':True}).json()
            state['users'].append(result['id'])
            if index==0:state['email']=email
            save()
        with database() as db:
            db.execute("insert into public.couples(id,name) values(%s,'Disposable UI fixture')",(state['couple'],))
            for user,name,color in zip(state['users'],['You','Your person'],['#7C5CFF','#FF6B8A']):db.execute('insert into public.members(user_id,couple_id,display_name,color) values(%s,%s,%s,%s)',(user,state['couple'],name,color))
            for index,(actor,body) in enumerate([(1,'Made it home. How was your day?'),(0,'A little busy, but this made me smile 💛'),(1,'Sending a little piece of the evening your way ✨')]):
                post=str(uuid.uuid4());db.execute("insert into public.posts(id,couple_id,author_id,channel,kind,body) values(%s,%s,%s,'chat','text',%s)",(post,state['couple'],state['users'][actor],body));db.execute("update public.posts set created_at=now()-make_interval(mins=>%s) where id=%s",(8-index,post))
        image=Image.new('RGB',(2200,1400),'#161229');draw=ImageDraw.Draw(image)
        for y in range(1400):draw.line((0,y,2200,y),fill=(int(35+y*.05),int(25+y*.025),int(65+y*.04)))
        draw.ellipse((1450,180,1780,510),fill='#F7D8B4');draw.polygon([(0,1000),(650,650),(1450,1120),(2200,800),(2200,1400),(0,1400)],fill='#30233F')
        qa=ROOT/'.artifacts/qa';qa.mkdir(parents=True,exist_ok=True);image.save(qa/'m6-fixture.png')
        post=str(uuid.uuid4());root=state['couple']+'/'+state['users'][1]+'/'+post
        for suffix,size in [('.webp',(1280,815)),('_t.webp',(400,255))]:
            data=io.BytesIO();image.resize(size).save(data,format='WEBP',quality=80);path=root+suffix
            api.request('POST','/storage/v1/object/media/'+path,content=data.getvalue(),headers={'Content-Type':'image/webp'});state['paths'].append(path);save()
        with database() as db:
            db.execute("insert into public.posts(id,couple_id,author_id,channel,kind,body,media_path,thumb_path,media_width,media_height) values(%s,%s,%s,'chat','photo','Look at this sky 🌙',%s,%s,1280,815)",(post,state['couple'],state['users'][1],root+'.webp',root+'_t.webp'))
        link=api.request('POST','/auth/v1/admin/generate_link',json={'type':'magiclink','email':state['email']}).json()
        state['code']=link['email_otp'];save()
        print('Disposable browser fixture ready. One-use login is in ignored private state; no email sent.')
    except Exception as error:raise SystemExit('UI fixture operation failed: '+type(error).__name__+'; private details hidden.')
    finally:api.close()

if __name__=='__main__':main()
