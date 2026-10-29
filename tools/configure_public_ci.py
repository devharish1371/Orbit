#!/usr/bin/env python3
"""Set only the two non-secret client variables for the authorized Orbit repository."""
from __future__ import annotations
import base64
import json
import subprocess
from tools.orbit_common import settings


def main() -> None:
    values=settings('SUPABASE_URL','SUPABASE_ANON_KEY')
    key=values['SUPABASE_ANON_KEY']
    valid=key.startswith('sb_publishable_')
    if key.startswith('eyJ'):
        try:
            payload=key.split('.')[1]
            valid=json.loads(base64.urlsafe_b64decode(payload+'='*((4-len(payload)%4)%4)))['role']=='anon'
        except (ValueError,KeyError,IndexError):valid=False
    if not valid or not values['SUPABASE_URL'].startswith('https://'):
        raise SystemExit('Only HTTPS project URL and a public client key are allowed.')
    for name,value in [('VITE_SUPABASE_URL',values['SUPABASE_URL']),('VITE_SUPABASE_ANON_KEY',key)]:
        result=subprocess.run(['gh','variable','set',name,'--body',value,'--repo','devharish1371/Orbit'],capture_output=True,text=True)
        if result.returncode:raise SystemExit('Could not set public CI variable '+name+'; check GitHub authorization.')
        print('Configured public repository variable '+name+'.')


if __name__=='__main__':main()
