"""Add synthetic profiles, journeys and moments only to the disposable browser fixture."""
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
from PIL import Image, ImageDraw
from tools.orbit_common import ROOT, admin_api, database

def main():
    file = ROOT / '.artifacts/private/ui-fixture/state.json'
    state = json.loads(file.read_text())
    assert state.get('fixture') == 'orbit-m6-ui' and len(state['users']) == 2
    with database() as db:
        assert db.execute('select name from public.couples where id=%s',(state['couple'],)).fetchone() == ('Disposable UI fixture',)
    api = admin_api()
    try:
        for index,user in enumerate(state['users']):
            image = Image.new('RGB',(360,360), '#becfc9' if index else '#e8b7a4')
            draw = ImageDraw.Draw(image)
            draw.ellipse((65,45,295,275),fill='#376367' if index else '#73576e')
            draw.polygon([(0,360),(120,170),(290,270),(360,360)],fill='#d8ae86' if index else '#f5d1a4')
            buf = io.BytesIO(); image.save(buf,format='WEBP')
            path = f"{state['couple']}/{user}/avatar_{uuid.uuid4()}.webp"
            api.request('POST','/storage/v1/object/media/'+path,content=buf.getvalue(),headers={'Content-Type':'image/webp'})
            state['paths'].append(path)
            file.write_text(json.dumps(state)); file.chmod(0o600)
            with database() as db: db.execute('update public.members set avatar_path=%s where user_id=%s',(path,user))
        now = datetime.now(timezone.utc)
        with database() as db:
            db.execute("insert into public.posts(couple_id,author_id,channel,kind,body) values(%s,%s,'moment','text','Took the long way home.')",(state['couple'],state['users'][0]))
            db.execute("insert into public.posts(couple_id,author_id,channel,kind,body) values(%s,%s,'moment','mood','☀️ Sunday, slowly.')",(state['couple'],state['users'][1]))
            for ago,step,speed in [(180,.0007,1.3),(90,.004,7.5)]:
                for i in range(16):
                    stamp=now-timedelta(minutes=ago-i)
                    lat=13.08+i*step
                    db.execute('insert into public.location_history(user_id,couple_id,lat,lng,accuracy_m,speed_mps,recorded_at) values(%s,%s,%s,80.27,10,%s,%s)',(state['users'][1],state['couple'],lat,speed,stamp))
                db.execute('insert into public.location_history(user_id,couple_id,lat,lng,accuracy_m,speed_mps,recorded_at) values(%s,%s,%s,80.27,10,0,%s)',(state['users'][1],state['couple'],lat,now-timedelta(minutes=ago-20)))
        print('Synthetic profile photos, moments and completed journeys prepared; no real account used.')
    finally: api.close()

if __name__=='__main__': main()
