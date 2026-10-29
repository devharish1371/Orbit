"""Invoke hosted cleanup using only the private function secret header."""
from __future__ import annotations
import httpx
import typer
from rich.console import Console
from orbit_common import settings

app = typer.Typer(add_completion=False)


@app.command()
def main() -> None:
    """Run one cleanup and print sanitized counts, never credentials."""
    v = settings('ORBIT_FN_BASE_URL', 'ORBIT_FN_SECRET')
    try:
        response = httpx.post(v['ORBIT_FN_BASE_URL'] + '/retention', headers={'x-orbit-secret': v['ORBIT_FN_SECRET']}, timeout=120)
        if response.status_code not in (200, 500):
            raise RuntimeError('HTTP ' + str(response.status_code))
        Console().print(response.json())
        if response.is_error:
            raise typer.Exit(1)
    except httpx.HTTPError:
        Console().print('Retention connection failed (details hidden).')
        raise typer.Exit(1)


if __name__ == '__main__':
    app()
