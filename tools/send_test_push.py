"""Send one labelled test push only after the named recipient explicitly asks for it."""
from __future__ import annotations
import argparse
import base64
from datetime import datetime,timezone
import json
import subprocess
from tools.orbit_common import ROOT,database,settings


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--person',choices=['A','B'],required=True)
    parser.add_argument('--send',action='store_true',help='Requires explicit recipient authorization in the current test session.')
    args=parser.parse_args()
    if not args.send:parser.error('Use --send only for an explicitly authorized test notification.')
    values=settings('FCM_SERVICE_ACCOUNT_B64','USER_'+args.person+'_EMAIL')
    with database() as db:
        db.execute('set transaction read only')
        row=db.execute('''select d.token from public.device_tokens d join auth.users u on u.id=d.user_id
            where lower(u.email)=lower(%s) and d.platform='android' order by d.updated_at desc limit 1''',
            (values['USER_'+args.person+'_EMAIL'],)).fetchone()
    if not row:raise SystemExit('No Android notification registration for that person yet.')
    account=json.loads(base64.b64decode(values['FCM_SERVICE_ACCOUNT_B64']))
    script='''
import { fcmSender } from './supabase/functions/notify/fcm.ts';
let input='';for await(const chunk of process.stdin)input+=chunk;
const config=JSON.parse(input);
try {
  const status=await fcmSender(config.account).send(config.token,{
    title:'Orbit test',body:'You’re connected. Tap to open Activity.',route:'/activity',type:'test',preference:'test',urgent:false,channel:'social'
  },crypto.randomUUID());
  process.stdout.write(JSON.stringify({status}));
} catch {process.stdout.write(JSON.stringify({status:'unavailable'}));process.exitCode=1;}
'''
    result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps({'account':account,'token':row[0]}),cwd=ROOT,text=True,capture_output=True,timeout=50)
    try:status=json.loads(result.stdout)['status']
    except (ValueError,KeyError):raise SystemExit('Test push could not run; private details hidden.')
    if status not in ('sent','retry','unregistered','unavailable'):raise SystemExit('Unexpected test result; details hidden.')
    folder=ROOT/'.artifacts/private/push-test';folder.mkdir(parents=True,exist_ok=True);folder.chmod(0o700)
    output=folder/'result.json';output.write_text(json.dumps({'person':args.person,'status':status,'at':datetime.now(timezone.utc).isoformat(),'route':'/activity'},indent=2)+'\n');output.chmod(0o600)
    if status!='sent':raise SystemExit('Test push was not accepted; status '+status+'. No credential details logged.')
    print('One Orbit test push accepted by FCM. Phone delivery/tap still need confirmation.')


if __name__=='__main__':main()
