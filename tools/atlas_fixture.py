"""Refresh synthetic GPS samples only for the retained disposable browser QA couple."""
import json
from datetime import datetime, timedelta, timezone
from tools.orbit_common import ROOT, database

def main():
    state = json.loads((ROOT / '.artifacts/private/ui-fixture/state.json').read_text())
    assert state.get('fixture') == 'orbit-m6-ui' and len(state['users']) == 2
    now = datetime.now(timezone.utc)
    with database() as db:
        assert db.execute('select name from public.couples where id=%s', (state['couple'],)).fetchone() == ('Disposable UI fixture',)
        actual = {row[0] for row in db.execute('select user_id::text from public.members where couple_id=%s', (state['couple'],)).fetchall()}
        assert actual == set(state['users'])
        db.execute('delete from public.location_history where couple_id=%s', (state['couple'],))
        for person, user in enumerate(state['users']):
            for ago, step, speed in [(180, .0007, 1.3), (90, .004, 7.5)]:
                for i in range(16):
                    stamp = now - timedelta(minutes=ago-i)
                    lat, lng = 13.08+i*step+person*.01, 80.27+person*.01
                    db.execute('insert into public.location_history(user_id,couple_id,lat,lng,accuracy_m,speed_mps,recorded_at) values(%s,%s,%s,%s,10,%s,%s)', (user,state['couple'],lat,lng,speed,stamp))
                db.execute('insert into public.location_history(user_id,couple_id,lat,lng,accuracy_m,speed_mps,recorded_at) values(%s,%s,%s,%s,10,0,%s)', (user,state['couple'],lat,lng,now-timedelta(minutes=ago-20)))
            db.execute('update public.live_location set lat=%s,lng=%s,accuracy_m=12,speed_mps=0,recorded_at=%s where user_id=%s and couple_id=%s', (13.08+person*.02,80.27+person*.02,now,user,state['couple']))
    print('Only the verified disposable couple has fresh synthetic GPS data; no real location or partner contact.')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        raise SystemExit('Atlas fixture failed: '+type(error).__name__+'; private details hidden.')
