// Accessibility/BP audits of DOM snapshots captured with CUA from disposable accounts.
// These static documents measure rendered semantics/contrast, not authenticated app speed.
import { spawn } from 'node:child_process';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const suite = process.argv[2] ?? 'm8';
if (!/^[a-z0-9-]+$/.test(suite)) throw new Error('Invalid audit suite name');
const input = path.join(root, `.artifacts/qa/${suite}-audit`);
const output = path.join(root, `.artifacts/qa/${suite}-reports`);
await mkdir(output, { recursive: true });
const prefixes = process.argv[3]?.split(',') ?? [];
if (prefixes.some(prefix => !/^[a-z0-9-]+$/.test(prefix))) throw new Error('Invalid screen prefix');
const queue = (await readdir(input)).filter(name => name.endsWith('-360.html') && (!prefixes.length || prefixes.some(prefix => name.startsWith(prefix+'-')))).sort();
if (!queue.length) throw new Error('No matching screen captures');
// A targeted rerun retains the unchanged screens from the completed full-suite summary.
const previous = prefixes.length ? JSON.parse(await readFile(path.join(output,'summary.json'),'utf8')) : [];
const results = previous.filter(result => !queue.includes(result.name));
async function audit(name) {
  const report = path.join(output, name.replace('.html', '.json'));
  await new Promise((resolve, reject) => {
    const process = spawn(path.join(root,'web/node_modules/.bin/lighthouse'), [
      'http://127.0.0.1:4174/'+name, '--only-categories=accessibility,best-practices',
      '--chrome-flags=--headless', '--output=json', '--output-path='+report, '--quiet',
    ], { cwd: root, stdio: 'ignore' });
    process.on('error', reject);
    process.on('exit', code => code === 0 ? resolve() : reject(new Error('Audit process failed')));
  });
  const reportData = JSON.parse(await readFile(report,'utf8'));
  const score = key => Math.round(reportData.categories[key].score*100);
  const result = { name, accessibility: score('accessibility'), bestPractices: score('best-practices'),
    failures: Object.entries(reportData.audits).filter(([,audit]) => audit.score !== null && audit.score < 1 && audit.scoreDisplayMode === 'binary').map(([id,audit]) => ({id,title:audit.title})) };
  results.push(result); console.log(JSON.stringify(result));
}
async function worker() { while (queue.length) await audit(queue.shift()); }
await Promise.all([worker(),worker()]);
await writeFile(path.join(output,'summary.json'),JSON.stringify(results.sort((a,b) => a.name.localeCompare(b.name)),null,2));
if (results.some(result => result.accessibility < 95 || result.bestPractices < 95)) process.exitCode=1;
