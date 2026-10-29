#!/usr/bin/env python3
"""Simulate a moving partner using disposable users only; never writes real profiles."""
from __future__ import annotations
import argparse
import json
import math
import os
from pathlib import Path
import secrets
import signal
import time
import uuid
from datetime import datetime, timezone

from tools.orbit_common import Api, admin_api, database, settings


def main() -> None:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minutes',type=float,default=10)
    parser.add_argument('--interval',type=float,default=15)
    parser.add_argument('--otp-file',type=Path,default=Path('.artifacts/private/demo-login.json'))
    args=parser.parse_args()
    if not 1<=args.minutes<=60 or args.interval<15:
        parser.error('Use 1–60 minutes and an interval of at least 15 seconds.')
    v=settings('SUPABASE_URL','SUPABASE_ANON_KEY')
    admin=admin_api();couple=str(uuid.uuid4());users=[];clients=[];running=True
    def stop(*_):
        nonlocal running
        running=False
    signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
    try:
        emails=[]
        for index in range(2):
            email=f'orbit-test-map-{uuid.uuid4().hex}-{index}@example.com';emails.append(email)
            password=secrets.token_urlsafe(24)
            user=admin.request('POST','/auth/v1/admin/users',json={'email':email,'password':password,'email_confirm':True}).json()
            users.append(user['id'])
            public=Api(v['SUPABASE_URL'],v['SUPABASE_ANON_KEY'])
            try:
                session=public.request('POST','/auth/v1/token?grant_type=password',json={'email':email,'password':password}).json()
                clients.append(Api(v['SUPABASE_URL'],v['SUPABASE_ANON_KEY'],session['access_token']))
            finally:public.close()
        with database() as db:
            db.execute("insert into public.couples(id,name) values(%s,'Disposable map demo')",(couple,))
            for index,user in enumerate(users):
                db.execute('insert into public.members(user_id,couple_id,display_name,color,theme_mode) values(%s,%s,%s,%s,\'dark\')',(user,couple,['Demo You','Demo Partner'][index],['#7C5CFF','#FF6B8A'][index]))
        generated=admin.request('POST','/auth/v1/admin/generate_link',json={'type':'magiclink','email':emails[0]}).json()
        args.otp_file.parent.mkdir(parents=True,exist_ok=True)
        fd=os.open(args.otp_file,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
        with os.fdopen(fd,'w') as out:json.dump({'email':emails[0],'code':generated['email_otp']},out)
        print('Disposable demo ready; one-use login stored in the private local handoff file.',flush=True)
        print('Synthetic public-area coordinates only. Stop with Ctrl+C to remove the fixtures.',flush=True)
        began=time.monotonic();step=0
        while running and time.monotonic()-began<args.minutes*60:
            for index,client in enumerate(clients):
                angle=step/12
                lat=13.08+(math.sin(angle)*0.003 if index else 0)
                lng=80.27+(0.004+math.cos(angle)*0.003 if index else 0)
                row={'user_id':users[index],'couple_id':couple,'lat':lat,'lng':lng,'accuracy_m':15,'speed_mps':1.4 if index else 0,'heading':(step*30)%360 if index else None,'battery_pct':78 if index else 91,'charging':False,'is_moving':bool(index),'fuzzed':False,'recorded_at':datetime.now(timezone.utc).isoformat()}
                client.request('POST','/rest/v1/live_location',params={'on_conflict':'user_id'},headers={'Prefer':'resolution=merge-duplicates'},json=row)
                if index:
                    history={key:row[key] for key in ['user_id','couple_id','lat','lng','accuracy_m','speed_mps','battery_pct','recorded_at']}
                    client.request('POST','/rest/v1/location_history',json=history)
            print(f'Published synthetic fix {step+1}.',flush=True);step+=1
            deadline=time.monotonic()+args.interval
            while running and time.monotonic()<deadline:time.sleep(0.25)
    finally:
        args.otp_file.unlink(missing_ok=True)
        with database() as db:db.execute('delete from public.couples where id=%s',(couple,))
        for user in users:admin.request('DELETE','/auth/v1/admin/users/'+user)
        for client in clients:client.close()
        admin.close()
        print('Disposable users, places and locations removed.',flush=True)


if __name__=='__main__':
    try:main()
    except Exception as error:
        raise SystemExit('Simulator stopped: '+type(error).__name__) from None
