"""Validate owner-supplied Firebase files and configure private local/CI copies."""
from __future__ import annotations
import argparse
import base64
import json
import re
import subprocess
from pathlib import Path
from tools.orbit_common import ROOT


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--account',type=Path,required=True)
    parser.add_argument('--android',type=Path,required=True)
    parser.add_argument('--configure-ci',action='store_true')
    args=parser.parse_args()
    try:
        account_raw=args.account.read_bytes();android_raw=args.android.read_bytes()
        account=json.loads(account_raw);android=json.loads(android_raw)
        project=account['project_id']
        assert account['type']=='service_account' and account['private_key'].startswith('-----BEGIN ') and 'PRIVATE KEY' in account['private_key'].splitlines()[0]
        assert account['client_email'].endswith('.iam.gserviceaccount.com')
        assert android['project_info']['project_id']==project
        assert any(c['client_info']['android_client_info']['package_name']=='app.orbit.couple' for c in android['client'])
    except (OSError,ValueError,KeyError,TypeError,AssertionError):
        raise SystemExit('Firebase validation failed; file contents hidden.')
    target=ROOT/'web/android/app/google-services.json'
    target.write_bytes(android_raw);target.chmod(0o600)
    env_path=ROOT/'.env.tools';env_text=env_path.read_text()
    value=base64.b64encode(account_raw).decode()
    line='FCM_SERVICE_ACCOUNT_B64='+value
    env_text=re.sub(r'^FCM_SERVICE_ACCOUNT_B64=.*$',lambda _:line,env_text,flags=re.M) if re.search(r'^FCM_SERVICE_ACCOUNT_B64=',env_text,re.M) else env_text+'\n'+line+'\n'
    env_path.write_text(env_text);env_path.chmod(0o600)
    print('Firebase project/package match; private local configuration saved.')
    if args.configure_ci:
        result=subprocess.run(['gh','secret','set','GOOGLE_SERVICES_JSON_B64','--repo','devharish1371/Orbit'],input=base64.b64encode(android_raw),capture_output=True)
        if result.returncode:raise SystemExit('CI Firebase secret setup failed; output hidden.')
        print('Private Android Firebase CI secret configured.')


if __name__=='__main__':main()
