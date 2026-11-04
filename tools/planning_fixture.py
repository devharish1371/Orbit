"""Seed user-written-looking synthetic examples in the disposable browser fixture only."""
import json
import uuid
from datetime import datetime,timedelta,timezone
from tools.orbit_common import ROOT,database

def main():
 state=json.loads((ROOT/'.artifacts/private/ui-fixture/state.json').read_text())
 assert state.get('fixture')=='orbit-m6-ui' and len(state['users'])==2
 with database() as db:
  assert db.execute('select name from public.couples where id=%s',(state['couple'],)).fetchone()==('Disposable UI fixture',)
  assert {r[0] for r in db.execute('select user_id::text from public.members where couple_id=%s',(state['couple'],)).fetchall()}==set(state['users'])
  if not db.execute('select 1 from public.plans where couple_id=%s',(state['couple'],)).fetchone():
   for i,(title,venue,notes) in enumerate([('The long way home','Marina Beach','Walk along the water. Stop for tea.'),('Dinner, just us','Our little café','No rush.')]):
    db.execute("insert into public.plans(id,couple_id,created_by,title,venue,notes,starts_at,timezone,accepted_by) values(%s,%s,%s,%s,%s,%s,%s,'Asia/Kolkata',%s::uuid[])",(str(uuid.uuid4()),state['couple'],state['users'][i],title,venue,notes,datetime.now(timezone.utc)+timedelta(days=2+i*2),state['users'] if i else state['users'][:1]))
  if not db.execute('select 1 from public.date_ideas where couple_id=%s',(state['couple'],)).fetchone():
   for kind,title,notes,private in [('idea','A sunrise and two coffees','Find a spot by the water.',False),('idea','Cook something neither of us has tried','',False),('idea','A little surprise','Bring the camera.',True),('place','That bookshop near the station','Leave room in the bag.',False)]:
    db.execute('insert into public.date_ideas(id,couple_id,created_by,kind,title,notes,private) values(%s,%s,%s,%s,%s,%s,%s)',(str(uuid.uuid4()),state['couple'],state['users'][0],kind,title,notes,private))
 print('Disposable planning examples ready. No reminders enabled and no real accounts contacted.')
if __name__=='__main__':
 try:main()
 except Exception as error:raise SystemExit('Planning fixture failed: '+type(error).__name__+'; private details hidden.')
