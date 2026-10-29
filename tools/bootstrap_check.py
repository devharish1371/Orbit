"""Check Orbit's local scaffold without printing credentials."""

from __future__ import annotations

import importlib.metadata
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

import typer
from dotenv import dotenv_values
from rich.console import Console

ROOT = Path(__file__).resolve().parents[1]
console = Console()
app = typer.Typer(add_completion=False)


@dataclass(frozen=True)
class Check:
    name: str
    ok: bool
    detail: str
    required: bool = True


def version_tuple(value: str) -> tuple[int, ...]:
    match = re.search(r"(\d+)\.(\d+)(?:\.(\d+))?", value)
    return tuple(int(part) for part in match.groups(default="0")) if match else ()


def command_check(
    name: str,
    command: list[str],
    minimum: tuple[int, ...],
    hint: str,
    *,
    required: bool = True,
) -> Check:
    if not shutil.which(command[0]):
        return Check(name, False, hint, required)
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=15, check=False)
        output = (result.stdout + result.stderr).strip()
        version = version_tuple(output)
        ok = result.returncode == 0 and bool(version) and version >= minimum
        return Check(name, ok, output.splitlines()[0] if ok else hint, required)
    except (OSError, subprocess.TimeoutExpired):
        return Check(name, False, hint, required)


def configured(value: str | None) -> bool:
    return bool(value and "<" not in value and "XXXXX" not in value)


def collect_checks(*, require_config: bool = False, local_android: bool = False) -> list[Check]:
    checks = [
        command_check("Git", ["git", "--version"], (2, 0), "Install Git: https://git-scm.com/downloads"),
        command_check("Node", ["node", "--version"], (22, 12), "Install Node 24 LTS: https://nodejs.org/"),
        command_check("npm", ["npm", "--version"], (10, 0), "Install npm with Node LTS."),
        Check("Python 3.11+", sys.version_info >= (3, 11), sys.version.split()[0]),
        Check("Virtual environment", sys.prefix != sys.base_prefix, "Run .venv/bin/python tools/bootstrap_check.py (Windows: .venv\\Scripts\\python.exe)."),
        command_check("JDK 21 (local APK only)", ["java", "-version"], (21, 0), "Optional: install JDK 21/Android Studio for local APK builds; CI builds APKs later.", required=local_android),
    ]
    packages = ["supabase", "psycopg", "httpx", "python-dotenv", "pillow", "rich", "typer", "pytest", "pytest-asyncio", "pyyaml"]
    missing = []
    for package in packages:
        try:
            importlib.metadata.version(package)
        except importlib.metadata.PackageNotFoundError:
            missing.append(package)
    checks.append(Check("Python dependencies", not missing, "Installed" if not missing else "Run .venv/bin/python -m pip install -r tools/requirements.lock.txt"))
    for relative in [".env.tools", "web/.env.local", "web/package-lock.json", "web/node_modules/.bin/vite", "web/node_modules/.bin/cap", "node_modules/.bin/supabase", "supabase/config.toml", "web/android/gradlew"]:
        checks.append(Check(relative, (ROOT / relative).exists(), "Present" if (ROOT / relative).exists() else "Missing; follow docs/DEVELOPMENT.md."))
    if require_config:
        values = dotenv_values(ROOT / ".env.tools")
        required = ["SUPABASE_URL", "SUPABASE_PROJECT_REF", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_URL", "USER_A_PHONE", "USER_B_PHONE", "USER_A_NAME", "USER_B_NAME"]
        missing_keys = [key for key in required if not configured(values.get(key))]
        checks.append(Check("Supabase configuration", not missing_keys, "Configured (values hidden)" if not missing_keys else "Human #2 must fill .env.tools: " + ", ".join(missing_keys)))
        web_values = dotenv_values(ROOT / "web/.env.local")
        checks.append(Check("Public web configuration", all(configured(web_values.get(key)) for key in ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]), "Human #2 fills web/.env.local; values never printed."))
    return checks


@app.command()
def main(
    require_config: Annotated[bool, typer.Option(help="Also require human #2's populated Supabase config.")] = False,
    local_android: Annotated[bool, typer.Option(help="Require the optional local Java toolchain.")] = False,
) -> None:
    """Check M0 tools; account configuration is an explicit, separate M1 gate."""
    checks = collect_checks(require_config=require_config, local_android=local_android)
    for check in checks:
        marker = "✅" if check.ok else "❌" if check.required else "⚪"
        console.print(f"{marker} {check.name}: {check.detail}", markup=False)
    failures = sum(not check.ok and check.required for check in checks)
    console.print(f"\nRequired checks: {len([c for c in checks if c.required]) - failures} passed, {failures} failed.")
    if not require_config:
        console.print("Account configuration is pending human #2; use --require-config before M1 integration tests.")
    raise typer.Exit(1 if failures else 0)


if __name__ == "__main__":
    app()
