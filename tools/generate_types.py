"""Refresh public schema metadata without printing credentials or row data."""
import os
import subprocess
from tools.orbit_common import ROOT,settings
v=settings('SUPABASE_ACCESS_TOKEN','SUPABASE_PROJECT_REF')
env=dict(os.environ,SUPABASE_ACCESS_TOKEN=v['SUPABASE_ACCESS_TOKEN'])
result=subprocess.run([str(ROOT/'node_modules/.bin/supabase'),'gen','types','typescript','--project-id',v['SUPABASE_PROJECT_REF'],'--schema','public'],env=env,capture_output=True,text=True,cwd=ROOT)
if result.returncode or 'export type Database' not in result.stdout:raise SystemExit('Schema type generation failed; output hidden.')
source=result.stdout
# The generator omits scalar RPC nullability. These arguments deliberately
# accept SQL NULL (create identity / personal reminder off), covered by hosted tests.
for name,fields in {'save_plan':['p_version'],'save_date_idea':['p_version'],'set_plan_reminder':['p_minutes'],'save_memory_collection':['p_version']}.items():
    start=source.index('      '+name+': {')
    end=source.index('        Returns:',start)
    block=source[start:end]
    for field in fields:block=block.replace(field+': number',field+': number | null')
    source=source[:start]+block+source[end:]
(ROOT/'web/src/lib/database.types.ts').write_text(source)
print('Public schema types refreshed; no row data retrieved.')
