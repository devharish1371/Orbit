"""Configure code emails through a user-provided free SMTP sender; no email is sent here."""
from __future__ import annotations

import httpx
import typer
from rich.console import Console

from orbit_common import normalized_email, settings

app = typer.Typer(add_completion=False)


@app.command()
def main(check: bool = typer.Option(False, help='Inspect SMTP/session readiness without changing Auth config.')) -> None:
    """Use local SMTP credentials to enable passwordless login; public signup stays disabled."""
    keys = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF']
    if not check:
        keys += ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_EMAIL']
    try:
        v = settings(*keys)
        url = 'https://api.supabase.com/v1/projects/' + v['SUPABASE_PROJECT_REF'] + '/config/auth'
        headers = {'Authorization': 'Bearer ' + v['SUPABASE_ACCESS_TOKEN']}
        if not check:
            port = int(v['SMTP_PORT'])
            if port not in (465, 587, 2525):
                raise ValueError('Use the SMTP provider\'s TLS-enabled port (465, 587 or 2525).')
            payload = {
                'smtp_host': v['SMTP_HOST'], 'smtp_port': port,
                'smtp_user': v['SMTP_USER'], 'smtp_pass': v['SMTP_PASSWORD'],
                'smtp_admin_email': normalized_email(v['SMTP_FROM_EMAIL']),
                'smtp_sender_name': 'Orbit', 'external_email_enabled': True,
                'disable_signup': True, 'mailer_otp_length': 8, 'mailer_otp_exp': 600,
                'mailer_subjects_magic_link': 'Your Orbit sign-in code',
                'mailer_templates_magic_link_content': '<h2>Your Orbit code</h2><p>Enter this code in Orbit:</p><p style="font-size:28px;letter-spacing:4px">{{ .Token }}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>',
            }
            result = httpx.patch(url, headers=headers, json=payload, timeout=30)
            if not result.is_success:
                raise RuntimeError('Auth configuration failed: HTTP ' + str(result.status_code))
        response = httpx.get(url, headers=headers, timeout=25)
        if not response.is_success:
            raise RuntimeError('Auth inspection failed: HTTP ' + str(response.status_code))
        data = response.json()
        console = Console()
        console.print('Custom SMTP configured: ' + str(bool(data.get('smtp_host'))))
        console.print('Public signup disabled: ' + str(data.get('disable_signup')))
        console.print('OTP code digits: ' + str(data.get('mailer_otp_length')))
        console.print('OTP expiry seconds: ' + str(data.get('mailer_otp_exp')))
        console.print('Session time limit seconds: ' + str(data.get('sessions_timebox')))
        console.print('Session inactivity limit seconds: ' + str(data.get('sessions_inactivity_timeout')))
        console.print('Credentials hidden. Account provisioning/configuration does not send mail.')
    except (ValueError, RuntimeError) as error:
        Console().print(str(error), markup=False)
        raise typer.Exit(1)
    except httpx.HTTPError:
        Console().print('Auth configuration connection failed (details hidden).')
        raise typer.Exit(1)


if __name__ == '__main__':
    app()
