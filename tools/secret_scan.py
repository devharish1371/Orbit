"""Scan Git-visible source for credential material; never echo a matched value."""

from __future__ import annotations

import base64
import json
import re
import subprocess
from pathlib import Path

import typer
from rich.console import Console

ROOT = Path(__file__).resolve().parents[1]
app = typer.Typer(add_completion=False)
PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "Supabase secret key": re.compile(r"\bsb_secret_[A-Za-z0-9_-]{20,}"),
    "Supabase account token": re.compile(r"\bsbp_[A-Za-z0-9]{30,}"),
    "Database password in URI": re.compile(r"postgres(?:ql)?://[^:\s/]+:[^@\s]+@"),
    "Google API key": re.compile(r"\bAIza[A-Za-z0-9_-]{30,}"),
    "GitHub token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})"),
    "Telegram bot token": re.compile(r"\b\d{8,12}:[A-Za-z0-9_-]{30,}"),
}


def findings(path: Path, content: str) -> list[str]:
    issues = [label for label, pattern in PATTERNS.items() if pattern.search(content)]
    if ((path.name == ".env" or path.name.startswith(".env.")) and not path.name.endswith(".example")) or path.suffix in {".jks", ".keystore", ".pem", ".p12", ".pfx"} or path.name == "google-services.json":
        issues.append("sensitive filename")
    for token in re.findall(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", content):
        try:
            payload = token.split(".")[1]
            decoded = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            if isinstance(decoded, dict) and decoded.get("role") == "service_role":
                issues.append("privileged JWT")
        except (ValueError, UnicodeDecodeError):
            continue
    return issues


@app.command()
def main() -> None:
    """Check tracked and unignored untracked files before committing or publishing."""
    result = subprocess.run(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=ROOT, check=True, capture_output=True)
    failures = 0
    console = Console()
    paths = sorted(set(result.stdout.decode().strip("\0").split("\0")) - {""})
    for relative in paths:
        path = ROOT / relative
        if not path.is_file():
            continue
        issues = findings(path, path.read_bytes().decode("utf-8", errors="replace"))
        if issues:
            failures += len(issues)
            console.print(f"❌ {relative}: {', '.join(issues)}", markup=False)
    console.print(f"Secret scan: {len(paths)} files, {failures} findings (matched values hidden).")
    raise typer.Exit(1 if failures else 0)


if __name__ == "__main__":
    app()
