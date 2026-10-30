"""Deploy the M1 function with local secrets, without putting keys in argv or logs."""
from __future__ import annotations
import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlparse

import typer
from rich.console import Console
from orbit_common import ROOT, settings

app = typer.Typer(add_completion=False)


def invoke(arguments: list[str], env: dict[str, str]) -> None:
    executable = ROOT / 'node_modules/.bin/supabase'
    result = subprocess.run([str(executable), *arguments], cwd=ROOT, env=env, capture_output=True, text=True)
    if result.returncode:
        # Emit only an allowlisted status, not CLI dumps which might contain env data.
        raise RuntimeError('Supabase CLI step failed: ' + arguments[0] + ' ' + arguments[1] + f' (exit {result.returncode})')


@app.command()
def main(notify: bool = False, live: bool = False) -> None:
    """Link the configured project, set the internal secret and deploy retention via API."""
    v = settings('SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF', 'SUPABASE_DB_URL', 'ORBIT_FN_SECRET')
    env = dict(os.environ)
    env['SUPABASE_ACCESS_TOKEN'] = v['SUPABASE_ACCESS_TOKEN']
    env['SUPABASE_DB_PASSWORD'] = unquote(urlparse(v['SUPABASE_DB_URL']).password or '')
    console = Console()
    try:
        if notify:
            checked=subprocess.run(['npm','--prefix','web','run','typecheck'],cwd=ROOT,capture_output=True)
            if checked.returncode:raise RuntimeError('Notification deployment requires passing strict type checks.')
        invoke(['link', '--project-ref', v['SUPABASE_PROJECT_REF']], env)
        console.print('Supabase project linked.')
        with tempfile.TemporaryDirectory(prefix='orbit-function-') as temp:
            path = Path(temp) / 'function.env'
            secret_text='ORBIT_FN_SECRET=' + v['ORBIT_FN_SECRET'] + '\n'
            if notify:
                firebase=settings('FCM_SERVICE_ACCOUNT_B64')['FCM_SERVICE_ACCOUNT_B64']
                secret_text+='FCM_SERVICE_ACCOUNT_B64='+firebase+'\nNOTIFY_DRY_RUN='+('false' if live else 'true')+'\n'
            path.write_text(secret_text)
            path.chmod(0o600)
            invoke(['secrets', 'set', '--env-file', str(path), '--project-ref', v['SUPABASE_PROJECT_REF']], env)
        console.print('Internal function secret configured (value hidden).')
        function='notify' if notify else 'retention'
        invoke(['functions', 'deploy', function, '--project-ref', v['SUPABASE_PROJECT_REF'], '--no-verify-jwt', '--use-api'], env)
        console.print(function.capitalize()+' function deployed; only x-orbit-secret calls are authorized.')
        if notify:console.print('Notification mode: '+('live' if live else 'dry run'))
    except RuntimeError as error:
        console.print(str(error), markup=False)
        raise typer.Exit(1)


if __name__ == '__main__':
    app()
