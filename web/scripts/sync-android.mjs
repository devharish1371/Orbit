import { spawnSync } from 'node:child_process'

// A small cross-platform wrapper avoids POSIX-only inline environment assignments.
const windows = process.platform === 'win32'
const npm = windows ? 'npm.cmd' : 'npm'
for (const args of [
  ['run', 'build'],
  ['exec', '--', 'cap', 'sync', 'android'],
]) {
  const result = spawnSync(npm, args, {
    stdio: 'inherit',
    env: { ...process.env, VITE_BASE: './' },
    shell: windows,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
