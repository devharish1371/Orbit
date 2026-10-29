"""Reset one administrator-created account with an interactive password prompt."""
from __future__ import annotations

import getpass
import sys
import typer
from rich.console import Console

from orbit_common import admin_api, database, password_minimum, phone_email

app = typer.Typer(add_completion=False)


@app.command()
def main(phone: str) -> None:
    """Reset by E.164 phone; never store or echo passwords."""
    if not sys.stdin.isatty():
        Console().print('Run in a local interactive terminal; passwords must not use redirected input.')
        raise typer.Exit(1)
    email = phone_email(phone)
    with database() as db:
        row = db.execute('select id from auth.users where email=%s', (email,)).fetchone()
    if not row:
        raise typer.BadParameter('No matching account exists.')
    minimum = password_minimum()
    password = getpass.getpass(f'New password ({minimum}+ characters): ')
    if len(password) < minimum or password != getpass.getpass('Confirm new password: '):
        raise typer.BadParameter(f'Use at least {minimum} characters and matching confirmation.')
    api = admin_api()
    try:
        api.request('PUT', '/auth/v1/admin/users/' + str(row[0]), json={'password': password})
        Console().print('Password reset. No password was stored or printed.')
    except Exception as error:
        Console().print('Reset failed: ' + type(error).__name__)
        raise typer.Exit(1)
    finally:
        api.close()


if __name__ == '__main__':
    app()
