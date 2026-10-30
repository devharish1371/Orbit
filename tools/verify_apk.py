"""Check APK integrity, private-material exclusion and identity against a verified APK.

Cryptographic signature verification is performed by apksigner in CI; this helper
compares the v2 signer certificate and records a local checksum without printing secrets.
"""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
import re
from pathlib import Path
import struct
from urllib.parse import unquote,urlparse
from zipfile import ZipFile
from tools.orbit_common import settings

def length_prefixed(data:bytes,pos:int=0):
    length=struct.unpack_from('<I',data,pos)[0];end=pos+4+length
    if end>len(data):raise ValueError('Invalid signing block')
    return data[pos+4:end],end

def certificate(data:bytes)->bytes:
    eocd=data.rfind(b'PK\x05\x06')
    if eocd<0:raise ValueError('APK directory missing')
    central=struct.unpack_from('<I',data,eocd+16)[0]
    if data[central-16:central]!=b'APK Sig Block 42':raise ValueError('APK signing block missing')
    size=struct.unpack_from('<Q',data,central-24)[0];start=central-size-8
    if start<0 or struct.unpack_from('<Q',data,start)[0]!=size:raise ValueError('Invalid signing block')
    pos=start+8
    while pos<central-24:
        length=struct.unpack_from('<Q',data,pos)[0];pos+=8
        if length<4 or pos+length>central-24:raise ValueError('Invalid signing entry')
        kind=struct.unpack_from('<I',data,pos)[0];value=data[pos+4:pos+length];pos+=length
        if kind==0x7109871a:
            signers,_=length_prefixed(value);signer,_=length_prefixed(signers);signed,_=length_prefixed(signer)
            _,next_field=length_prefixed(signed);certificates,_=length_prefixed(signed,next_field);cert,_=length_prefixed(certificates)
            return cert
    raise ValueError('APK v2 signer missing')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apk',type=Path,required=True);parser.add_argument('--baseline',type=Path,required=True);args=parser.parse_args()
    try:
        raw=args.apk.read_bytes()
        if certificate(raw)!=certificate(args.baseline.read_bytes()):raise ValueError('Signing identity differs')
        values=settings();private=[]
        for key in ['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_URL','ORBIT_FN_SECRET','SMTP_PASSWORD','FCM_SERVICE_ACCOUNT_B64','ORBIT_DEBUG_KEYSTORE_PASSWORD','USER_A_EMAIL','USER_B_EMAIL']:
            if values.get(key) and '<' not in values[key]:private.append(values[key])
        if values.get('SUPABASE_DB_URL'):private.append(unquote(urlparse(values['SUPABASE_DB_URL']).password or ''))
        if values.get('FCM_SERVICE_ACCOUNT_B64'):
            account=json.loads(base64.b64decode(values['FCM_SERVICE_ACCOUNT_B64']));private.append(account['private_key'].splitlines()[1][:48])
        needles=[value.encode(encoding) for value in private if len(value)>=8 for encoding in ('utf-8','utf-16le')]
        needles+=[b'-----BEGIN '+b'PRIVATE KEY-----']
        credential_patterns=[re.compile(rb'\bsb_secret_[A-Za-z0-9_-]{20,}'),re.compile(rb'\bsbp_[A-Za-z0-9]{30,}')]
        with ZipFile(args.apk) as archive:
            if archive.testzip() is not None:raise ValueError('ZIP integrity failed')
            for name in archive.namelist():
                if name.endswith(('.env','.env.tools','.p12','.jks','google-services.json','orbit-fcm.json')):raise ValueError('Private file packaged')
                content=archive.read(name)
                if any(value in content for value in needles):raise ValueError('Private material packaged')
                # The Supabase SDK includes a literal secret-key prefix to reject misuse.
                # Match complete credential shapes, including Android UTF-16 strings.
                for candidate in (content,content.replace(b'\x00',b'')):
                    if any(pattern.search(candidate) for pattern in credential_patterns):raise ValueError('Credential packaged')
        checksum=hashlib.sha256(raw).hexdigest();args.apk.with_suffix('.apk.sha256').write_text(checksum+'  '+args.apk.name+'\n')
        print(json.dumps({'bytes':len(raw),'sha256':checksum,'zip_integrity':'pass','signing_identity_matches_baseline':True,'private_scan':'pass'}))
    except Exception as error:raise SystemExit('APK verification failed: '+type(error).__name__+'; private details hidden.')

if __name__=='__main__':main()
