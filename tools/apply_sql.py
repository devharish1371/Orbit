"""Atomically apply or verify idempotent schema migrations over the session pooler."""
from __future__ import annotations

import hashlib
from typing import Annotated

import typer
from rich.console import Console

from orbit_common import ROOT, database

app = typer.Typer(add_completion=False)


@app.command()
def main(reapply: Annotated[bool, typer.Option(help='Re-run idempotent migrations, including tracked ones.')] = False) -> None:
    """Apply numbered SQL in one transaction; record checksums and reject silent drift."""
    console = Console()
    try:
        with database() as db:
            with db.cursor() as cur:
                cur.execute('select pg_advisory_xact_lock(627142092)')
                cur.execute('create table if not exists public._migrations (name text primary key, checksum text, applied_at timestamptz not null default now())')
                cur.execute('alter table public._migrations enable row level security')
                cur.execute('revoke all on public._migrations from public, anon, authenticated')
                for path in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
                    sql = path.read_text()
                    digest = hashlib.sha256(sql.encode()).hexdigest()
                    cur.execute('select checksum from public._migrations where name=%s', (path.name,))
                    old = cur.fetchone()
                    if old and old[0] != digest and not reapply:
                        raise ValueError('Migration changed: ' + path.name + '; investigate drift before --reapply.')
                    if old and not reapply:
                        console.print('Unchanged: ' + path.name)
                        continue
                    cur.execute(sql, prepare=False)
                    cur.execute('insert into public._migrations(name,checksum) values(%s,%s) on conflict(name) do update set checksum=excluded.checksum,applied_at=now()', (path.name, digest))
                    console.print('Applied: ' + path.name)
        console.print('All migrations committed atomically.')
    except Exception as error:
        console.print('Migration transaction rolled back. Error type: ' + type(error).__name__)
        # SQLSTATE/primary diagnostic identify schema errors without printing connection credentials.
        diagnostic = getattr(error, 'diag', None)
        if diagnostic and diagnostic.message_primary:
            console.print(diagnostic.message_primary, markup=False)
        elif isinstance(error, ValueError):
            console.print(str(error), markup=False)
        raise typer.Exit(1)


if __name__ == '__main__':
    app()
