"""Read-only, coordinate-free sampling for an explicitly requested phone test."""
from __future__ import annotations
import argparse
from datetime import datetime,timedelta,timezone
import json
import os
import re
import signal
import time
from tools.orbit_common import ROOT,database,settings


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--minutes',type=int,default=30)
    parser.add_argument('--label',default='current')
    parser.add_argument('--started-at')
    parser.add_argument('--person',choices=['A','B'],default='A')
    parser.add_argument('--interval',type=int,default=30)
    args=parser.parse_args()
    if not 1<=args.minutes<=60 or not 15<=args.interval<=60:parser.error('Use 1–60 minutes and 15–60 second sampling.')
    if not re.fullmatch(r'[a-z0-9-]{1,50}',args.label):parser.error('Use a short lowercase label.')
    started=datetime.fromisoformat(args.started_at) if args.started_at else datetime.now(timezone.utc)
    if started.tzinfo is None:parser.error('started-at must include its UTC offset.')
    deadline=started+timedelta(minutes=args.minutes)
    email=settings('USER_'+args.person+'_EMAIL')['USER_'+args.person+'_EMAIL']
    folder=ROOT/'.artifacts/private/tracking-observation'/args.label;folder.mkdir(parents=True,exist_ok=True);folder.chmod(0o700)
    path=folder/'samples.jsonl';fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
    previous=None;changes=0;samples=0;errors=0;cancelled=False
    def stop(*_):
        nonlocal cancelled
        cancelled=True
    signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
    with os.fdopen(fd,'w',buffering=1) as log:
        while True:
            now=datetime.now(timezone.utc);sample={'observed_at':now.isoformat(),'elapsed_seconds':round((now-started).total_seconds())}
            try:
                with database() as db:
                    db.execute('set transaction read only')
                    row=db.execute('''select clock_timestamp(),m.share_mode,l.recorded_at,l.updated_at,l.battery_pct,l.is_moving,l.fuzzed,
                        l.speed_mps is null,l.heading is null,
                        abs(l.lat/0.018-floor(l.lat/0.018)-0.5)<0.000001
                            and abs(l.lng/0.018-floor(l.lng/0.018)-0.5)<0.000001,
                        l.accuracy_m>=2000
                        from auth.users u join public.members m on m.user_id=u.id
                        left join public.live_location l on l.user_id=m.user_id where lower(u.email)=lower(%s)''',(email,)).fetchone()
                if row is None:raise RuntimeError('MEMBERSHIP_NOT_FOUND')
                server,mode,fix,upload,battery,moving,fuzzed,speed_hidden,heading_hidden,on_blur_grid,broad_accuracy=row
                sample.update(server_at=server.isoformat(),share_mode=mode,recorded_at=fix.isoformat() if fix else None,
                    updated_at=upload.isoformat() if upload else None,battery_pct=battery,is_moving=moving,fuzzed=fuzzed,
                    speed_hidden=speed_hidden,heading_hidden=heading_hidden,on_blur_grid=on_blur_grid,broad_accuracy=broad_accuracy,
                    upload_age_seconds=round((server-upload).total_seconds()) if upload else None)
                if previous is not None and upload!=previous:changes+=1
                samples+=1;previous=upload
                print(json.dumps({'elapsed_seconds':sample['elapsed_seconds'],'upload_age_seconds':sample['upload_age_seconds'],'battery_pct':battery,'share_mode':mode,'upload_changes':changes}),flush=True)
            except Exception as error:
                errors+=1;sample['observer_error']=type(error).__name__;print('Observer connection error: '+type(error).__name__,flush=True)
            log.write(json.dumps(sample)+'\n')
            remaining=(deadline-datetime.now(timezone.utc)).total_seconds()
            if cancelled or remaining<=0:break
            time.sleep(min(args.interval,remaining))
    result={'started_at':started.isoformat(),'ended_at':datetime.now(timezone.utc).isoformat(),'samples':samples,'observer_errors':errors,'observed_upload_changes':changes,'coordinates_recorded':False,'complete':not cancelled,'stopped_early':cancelled}
    result_path=folder/'result.json';result_path.write_text(json.dumps(result,indent=2)+'\n');result_path.chmod(0o600)
    print('Observation complete: '+json.dumps(result),flush=True)


if __name__=='__main__':main()
