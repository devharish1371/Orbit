"""Create/reuse an ignored debug-only signing identity and configure private CI secrets."""
from __future__ import annotations
import base64
from datetime import datetime,timedelta,timezone
from pathlib import Path
import secrets
import subprocess
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID
from tools.orbit_common import ROOT,settings


def main():
    values=settings();env_path=ROOT/'.env.tools';path=ROOT/'.artifacts/private/orbit-debug.p12'
    password=values.get('ORBIT_DEBUG_KEYSTORE_PASSWORD','')
    if not password or not path.exists():
        password=secrets.token_urlsafe(32);private=rsa.generate_private_key(public_exponent=65537,key_size=2048)
        subject=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'Orbit Debug'),x509.NameAttribute(NameOID.ORGANIZATION_NAME,'Orbit Development')])
        now=datetime.now(timezone.utc)
        cert=x509.CertificateBuilder().subject_name(subject).issuer_name(subject).public_key(private.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-timedelta(days=1)).not_valid_after(now+timedelta(days=3650)).sign(private,hashes.SHA256())
        path.parent.mkdir(parents=True,exist_ok=True);path.parent.chmod(0o700)
        path.write_bytes(pkcs12.serialize_key_and_certificates(b'orbit-debug',private,cert,None,serialization.BestAvailableEncryption(password.encode())))
        path.chmod(0o600)
        text=env_path.read_text();text+='\nORBIT_DEBUG_KEYSTORE_PASSWORD='+password+'\n';env_path.write_text(text);env_path.chmod(0o600)
    for name,value in [('ORBIT_DEBUG_KEYSTORE_B64',base64.b64encode(path.read_bytes()).decode()),('ORBIT_DEBUG_KEYSTORE_PASSWORD',password)]:
        result=subprocess.run(['gh','secret','set',name,'--repo','devharish1371/Orbit'],input=value,capture_output=True,text=True)
        if result.returncode:raise SystemExit('Could not configure debug-only CI signing secret '+name+'.')
    print('Private debug-only CI signing configured. Release signing remains human task #5.')


if __name__=='__main__':main()
