"""Refresh public schema metadata without printing credentials or row data."""
import os
import subprocess
from tools.orbit_common import ROOT,settings
v=settings('SUPABASE_ACCESS_TOKEN','SUPABASE_PROJECT_REF')
env=dict(os.environ,SUPABASE_ACCESS_TOKEN=v['SUPABASE_ACCESS_TOKEN'])
result=subprocess.run([str(ROOT/'node_modules/.bin/supabase'),'gen','types','typescript','--project-id',v['SUPABASE_PROJECT_REF'],'--schema','public'],env=env,capture_output=True,text=True,cwd=ROOT)
if result.returncode or 'export type Database' not in result.stdout:raise SystemExit('Schema type generation failed; output hidden.')
(ROOT/'web/src/lib/database.types.ts').write_text(result.stdout)
print('Public schema types refreshed; no row data retrieved.')
