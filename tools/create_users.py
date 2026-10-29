"""Provision two passwordless identities, or optional legacy password accounts."""
from __future__ import annotations

import getpass
import sys
import uuid

import typer
from rich.console import Console

from orbit_common import admin_api, database, normalized_email, password_minimum, phone_email, settings

app = typer.Typer(add_completion=False)


@app.command()
def main(mode: str = typer.Option('email-otp', help='email-otp (default) or legacy password')) -> None:
    """Create exactly two accounts/members; preserve existing accounts on re-run."""
    if mode not in {'email-otp', 'password'}:
        raise typer.BadParameter('Use email-otp or password.')
    required = ['USER_A_PHONE', 'USER_A_NAME', 'USER_B_PHONE', 'USER_B_NAME']
    if mode == 'email-otp':
        required += ['USER_A_EMAIL', 'USER_B_EMAIL']
    v = settings(*required)
    console = Console()
    if mode == 'password' and not sys.stdin.isatty():
        console.print('Run this command in a local interactive terminal to choose passwords privately.')
        raise typer.Exit(1)
    identities = [(v[f'USER_{letter}_NAME'], v[f'USER_{letter}_PHONE'], normalized_email(v[f'USER_{letter}_EMAIL']) if mode == 'email-otp' else phone_email(v[f'USER_{letter}_PHONE'])) for letter in 'AB']
    for _, phone, _ in identities:
        phone_email(phone)  # Validate contact format; OTP delivery uses the real email.
    if identities[0][2] == identities[1][2]:
        raise typer.BadParameter('The two phone numbers must differ.')
    api = admin_api()
    try:
        minimum = password_minimum() if mode == 'password' else 0
        # Finish password input before touching Auth or the database.
        with database() as db:
            existing = dict(db.execute('select email,id from auth.users where email = any(%s)', ([row[2] for row in identities],)).fetchall())
        passwords: dict[str, str] = {}
        for name, _, email in identities:
            if email in existing or mode == 'email-otp':
                continue
            while True:
                password = getpass.getpass(f'Choose {name}\'s password ({minimum}+ characters): ')
                if len(password) < minimum:
                    console.print(f'The hosted project requires at least {minimum} characters.')
                    continue
                if password == getpass.getpass('Confirm password: '):
                    passwords[email] = password
                    break
                console.print('Passwords did not match.')
        created: list[str] = []
        try:
            for _, _, email in identities:
                if email not in existing:
                    body = {'email': email, 'email_confirm': True}
                    if mode == 'password':
                        body['password'] = passwords[email]
                    result = api.request('POST', '/auth/v1/admin/users', json=body).json()
                    existing[email] = result['id']
                    created.append(str(result['id']))
            with database() as db:
                db.execute('select pg_advisory_xact_lock(627142094)')
                current = db.execute('select distinct couple_id from public.members where user_id = any(%s::uuid[])', ([str(existing[row[2]]) for row in identities],)).fetchall()
                if len(current) > 1:
                    raise ValueError('Accounts already belong to different couples; no memberships changed.')
                couple_id = current[0][0] if current else uuid.uuid4()
                db.execute('insert into public.couples(id) values(%s) on conflict(id) do nothing', (couple_id,))
                for (name, phone, email), color in zip(identities, ['#7C5CFF', '#FF6B8A']):
                    db.execute('insert into public.members(user_id,couple_id,display_name,phone,color) values(%s,%s,%s,%s,%s) on conflict(user_id) do nothing', (existing[email], couple_id, name, phone, color))
        except Exception:
            for user_id in created:
                api.request('DELETE', '/auth/v1/admin/users/' + user_id)
            raise
        console.print('Both accounts and memberships are ready. Mode: ' + mode + '. Existing credentials were preserved.')
    except Exception as error:
        console.print('Provisioning failed: ' + type(error).__name__ + ' (credential details hidden).')
        raise typer.Exit(1)
    finally:
        api.close()


if __name__ == '__main__':
    app()
