"""Idempotently seed scheduler secrets, without printing decrypted values."""
from __future__ import annotations

import typer
from rich.console import Console

from orbit_common import database, settings

app = typer.Typer(add_completion=False)


@app.command()
def main() -> None:
    """Upsert Orbit's private function secret and endpoint into Supabase Vault."""
    values = settings('ORBIT_FN_SECRET', 'ORBIT_FN_BASE_URL')
    try:
        with database() as db:
            with db.cursor() as cur:
                cur.execute('select pg_advisory_xact_lock(627142093)')
                for name, key in [('orbit_fn_secret', 'ORBIT_FN_SECRET'), ('orbit_fn_base_url', 'ORBIT_FN_BASE_URL')]:
                    cur.execute('select id from vault.secrets where name=%s', (name,))
                    row = cur.fetchone()
                    if row:
                        cur.execute('select vault.update_secret(%s,%s,%s)', (row[0], values[key], name))
                    else:
                        cur.execute('select vault.create_secret(%s,%s)', (values[key], name))
        Console().print('Vault secrets seeded (values hidden).')
    except Exception as error:
        Console().print('Vault seed failed: ' + type(error).__name__ + '. Check Vault availability (human #2).')
        raise typer.Exit(1)


if __name__ == '__main__':
    app()
