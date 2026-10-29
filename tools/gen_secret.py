"""Generate an internal function secret without putting it in shell history."""

from __future__ import annotations

import secrets
from pathlib import Path
from typing import Annotated

import typer
from dotenv import dotenv_values, set_key
from rich.console import Console

app = typer.Typer(add_completion=False)


@app.command()
def main(
    write: Annotated[bool, typer.Option(help="Write ORBIT_FN_SECRET to ignored .env.tools; preserve an existing value.")] = False,
) -> None:
    """Print a new 43-character secret, or safely initialize the local env file."""
    console = Console()
    if not write:
        console.print(secrets.token_urlsafe(32), markup=False)
        return
    path = Path(__file__).resolve().parents[1] / ".env.tools"
    if not path.exists():
        console.print("Copy .env.tools.example to .env.tools first.")
        raise typer.Exit(1)
    if dotenv_values(path).get("ORBIT_FN_SECRET"):
        console.print("ORBIT_FN_SECRET is already set; preserved (value hidden).")
        return
    set_key(path, "ORBIT_FN_SECRET", secrets.token_urlsafe(32))
    path.chmod(0o600)
    console.print("ORBIT_FN_SECRET written to .env.tools (value hidden).")


if __name__ == "__main__":
    app()
