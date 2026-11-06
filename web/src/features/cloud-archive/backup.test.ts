// @vitest-environment node
import { expect, test } from 'vitest'
import { MemoryZip } from '@/lib/zip'
import {
  buildBackup,
  digest,
  readBackup,
  readStoreZip,
  type CloudArchive,
} from './backup'
const bytes = new Uint8Array([1, 2, 3]),
  encoder = new TextEncoder()
async function fixture() {
  const a = {
    post_id: 'root',
    archive_id: 'archive',
    snapshot: '{"archive_id":"archive","format":"orbit-archive-v1"}',
    files: [
      {
        path: 'couple/user/one.webp',
        bytes: 3,
        copy_id: 'root',
        mime: 'image/webp',
      },
      {
        path: 'couple/user/one_t.webp',
        bytes: 3,
        copy_id: null,
        mime: 'image/webp',
      },
    ],
  } as CloudArchive
  a.snapshot_sha = await digest(encoder.encode(a.snapshot))
  return a
}
test('complete ZIP preserves exact snapshot and all originals/thumbnails with independent hashes', async () => {
  const a = await fixture(),
    backup = await buildBackup(
      a,
      async () => bytes,
      new Map([['root', await digest(bytes)]]),
    ),
    restored = await readBackup(backup.blob, a)
  expect([...restored.keys()]).toEqual(a.files.map((f) => f.path))
  expect(restored.get(a.files[0]!.path)).toEqual(bytes)
  expect(backup.entries).toHaveLength(4)
  expect(backup.files).toHaveLength(2)
  expect(backup.sha256).toMatch(/^[a-f0-9]{64}$/)
})
test('stale originals and mismatched source snapshots never produce an approvable ZIP', async () => {
  const a = await fixture()
  await expect(
    buildBackup(a, async () => bytes, new Map([['root', 'wrong']])),
  ).rejects.toThrow('COPY_VERIFY_FAILED')
  const backup = await buildBackup(
    a,
    async () => bytes,
    new Map([['root', await digest(bytes)]]),
  )
  await expect(
    readBackup(backup.blob, { ...a, snapshot: 'other' }),
  ).rejects.toThrow('WRONG_BACKUP')
})
test('bounded import rejects corruption, duplicates, trailing bytes, missing and unknown files', async () => {
  const a = await fixture(),
    b = await buildBackup(
      a,
      async () => bytes,
      new Map([['root', await digest(bytes)]]),
    ),
    raw = new Uint8Array(await b.blob.arrayBuffer())
  const corrupt = raw.slice()
  corrupt[50] = corrupt[50]! ^ 1
  expect(() => readStoreZip(corrupt)).toThrow()
  expect(() => readStoreZip(new Uint8Array([...raw, 0]))).toThrow()
  const z = new MemoryZip()
  z.add('snapshot.json', encoder.encode(a.snapshot))
  z.add('files.json', encoder.encode('[]'))
  z.add('files.json', encoder.encode('[]'))
  await expect(readBackup(z.finish(), a)).rejects.toThrow()
  const missing = new MemoryZip()
  missing.add('snapshot.json', encoder.encode(a.snapshot))
  missing.add('files.json', encoder.encode(JSON.stringify(b.files)))
  missing.add('unexpected', bytes)
  await expect(readBackup(missing.finish(), a)).rejects.toThrow()
})
