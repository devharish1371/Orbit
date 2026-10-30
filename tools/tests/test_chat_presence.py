"""Private typing is checked over real Realtime sockets with disposable users only."""
import json
import subprocess
import pytest
from tools.orbit_common import ROOT
pytestmark=pytest.mark.integration

def test_private_typing_reaches_partner_but_rejects_strangers(backend):
    script=r'''
import {createRequire} from 'node:module';
const require=createRequire(process.cwd()+'/web/package.json');
const {createClient}=require('@supabase/supabase-js');
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const config=JSON.parse(raw),clients=[];
function client(token){const c=createClient(config.url,config.key,{accessToken:async()=>token,auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});clients.push(c);return c;}
async function join(c,key,observe){await c.realtime.setAuth();return new Promise(resolve=>{
  const room=c.channel('chat:'+config.couple,{config:{private:true,presence:{key}}});
  room.on('presence',{event:'sync'},()=>{if(observe&&room.presenceState().A?.some(p=>p.typing===true))observe();});
  const timer=setTimeout(()=>resolve({ok:false,room,reason:'LOCAL_TIMEOUT'}),15000);
  room.subscribe((status,error)=>{if(['SUBSCRIBED','CHANNEL_ERROR','TIMED_OUT'].includes(status)){clearTimeout(timer);resolve({ok:status==='SUBSCRIBED',room,reason:status,error:String(error?.message??'').replace(/[a-zA-Z0-9_-]{32,}/g,'[redacted]').slice(0,200)});}});
});}
try {
  let observed;const received=new Promise(resolve=>{observed=resolve;});
  const [a,b,stranger,other]=await Promise.all([join(client(config.tokens[0]),'A'),join(client(config.tokens[1]),'B',observed),join(client(config.tokens[2]),'C'),join(client(config.tokens[3]),'D')]);
  let typing=false;
  if(a.ok&&b.ok){await a.room.track({typing:true});typing=await Promise.race([received.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),5000))]);}
  process.stdout.write(JSON.stringify({member_a:a.ok,member_b:b.ok,stranger_rejected:!stranger.ok,other_couple_rejected:!other.ok,typing_received:typing,diagnostics:[a,b,stranger,other].map(r=>({reason:r.reason,error:r.error}))}));
} catch {process.stdout.write(JSON.stringify({error:true}));}
finally {await Promise.all(clients.map(c=>c.removeAllChannels()));for(const c of clients)c.realtime.disconnect();}
'''
    values={'url':backend.url,'key':backend.public_key,'couple':backend.couples[0],
            'tokens':[client.headers['Authorization'].removeprefix('Bearer ') for client in backend.clients]}
    result=subprocess.run(['node','--input-type=module','-e',script],input=json.dumps(values),cwd=ROOT,text=True,capture_output=True,timeout=90)
    try:status=json.loads(result.stdout)
    except ValueError:pytest.fail('Realtime test did not return a safe result; provider details hidden.')
    diagnostics=status.pop('diagnostics',None)
    assert status=={'member_a':True,'member_b':True,'stranger_rejected':True,'other_couple_rejected':True,'typing_received':True}, str(diagnostics)
