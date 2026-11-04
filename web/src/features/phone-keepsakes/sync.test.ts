import { describe, expect, test, vi } from 'vitest'
import type { Post } from '@/lib/posts'
import {
  copyMetadata,
  verifiedPair,
  type CopyReceipt,
  type PhoneCopy,
} from './model'
import { syncPhoneCopies, type CopySyncPort } from './sync'
const id = '11111111-1111-4111-8111-111111111111'
const hash = 'a'.repeat(64)
const post = {
  id,
  keep: true,
  unsent_at: null,
  archive_revision: 2,
  media_bytes: 0,
  media_path: null,
  kind: 'text',
  body: 'A saved note',
  created_at: '2026-11-05T00:00:00Z',
} as Post
const copy = { ...copyMetadata(post, ''), bytes: 0, sha256: hash } as PhoneCopy
function port(overrides: Partial<CopySyncPort> = {}): CopySyncPort {
  return {
    manifest: vi.fn().mockResolvedValue([post]),
    local: vi.fn().mockResolvedValue([]),
    receipts: vi.fn().mockResolvedValue([]),
    download: vi.fn(),
    write: vi.fn().mockResolvedValue(copy),
    remove: vi.fn(),
    acknowledge: vi.fn(),
    forget: vi.fn(),
    ...overrides,
  }
}
describe('private phone sync', () => {
  test('unchanged verified copies avoid repeat receipt writes; stale evidence is renewed', async () => {
    const receipt = {
      post_id: id,
      user_id: 'self',
      device_id: 'phone',
      revision: copy.revision,
      bytes: copy.bytes,
      sha256: copy.sha256,
      verified_at: new Date().toISOString(),
    }
    const current = port({
      local: vi.fn().mockResolvedValue([copy]),
      receipts: vi.fn().mockResolvedValue([receipt]),
    })
    await syncPhoneCopies(current, () => true)
    expect(current.acknowledge).not.toHaveBeenCalled()
    const missing = port({ receipts: vi.fn().mockResolvedValue([receipt]) })
    await syncPhoneCopies(missing, () => true)
    expect(missing.forget).toHaveBeenCalledWith(id)
    expect(missing.acknowledge).toHaveBeenCalledWith(copy)
    const stale = port({
      local: vi.fn().mockResolvedValue([copy]),
      receipts: vi.fn().mockResolvedValue([
        {
          ...receipt,
          verified_at: new Date(Date.now() - 86400001).toISOString(),
        },
      ]),
    })
    await syncPhoneCopies(stale, () => true)
    expect(stale.acknowledge).toHaveBeenCalledWith(copy)
  })
  test('writes then acknowledges a verified committed copy; retry reuses it', async () => {
    const p = port()
    expect(await syncPhoneCopies(p, () => true)).toEqual({
      saved: 1,
      skipped: 0,
    })
    expect(p.write).toHaveBeenCalledBefore(
      p.acknowledge as ReturnType<typeof vi.fn>,
    )
    expect(p.acknowledge).toHaveBeenCalledWith(copy)
    const retry = port({ local: vi.fn().mockResolvedValue([copy]) })
    await syncPhoneCopies(retry, () => true)
    expect(retry.write).not.toHaveBeenCalled()
    expect(retry.acknowledge).toHaveBeenCalledWith(copy)
  })
  test('a failed or incomplete manifest never prunes private files or receipts', async () => {
    const p = port({
      manifest: vi.fn().mockRejectedValue(new Error('OFFLINE')),
    })
    await expect(syncPhoneCopies(p, () => true)).rejects.toThrow('OFFLINE')
    expect(p.local).not.toHaveBeenCalled()
    expect(p.remove).not.toHaveBeenCalled()
    expect(p.forget).not.toHaveBeenCalled()
  })
  test('removal of Keep or unsending prunes the copy and only its own receipt', async () => {
    const p = port({
      manifest: vi.fn().mockResolvedValue([]),
      local: vi.fn().mockResolvedValue([copy]),
    })
    await syncPhoneCopies(p, () => true)
    expect(p.remove).toHaveBeenCalledWith(id)
    expect(p.forget).toHaveBeenCalledWith(id)
    expect(p.acknowledge).not.toHaveBeenCalled()
  })
  test('corrupt/missing local files invalidate prior server evidence before retrying', async () => {
    const p = port({ receipts: vi.fn().mockResolvedValue([{ post_id: id }]) })
    await syncPhoneCopies(p, () => true)
    expect(p.forget).toHaveBeenCalledBefore(p.write as ReturnType<typeof vi.fn>)
  })
  test('wrong byte counts, failed storage and stale revisions never receive a receipt', async () => {
    for (const p of [
      port({
        manifest: vi
          .fn()
          .mockResolvedValue([
            { ...post, media_path: 'private/photo', media_bytes: 9 },
          ]),
        download: vi.fn().mockResolvedValue(new Blob(['short'])),
      }),
      port({
        write: vi.fn().mockRejectedValue(new Error('PHONE_STORAGE_FULL')),
      }),
      port({ write: vi.fn().mockResolvedValue({ ...copy, revision: 1 }) }),
    ]) {
      await expect(syncPhoneCopies(p, () => true)).rejects.toThrow()
      expect(p.acknowledge).not.toHaveBeenCalled()
    }
  })
  test('background/account cancellation prevents acknowledging a completed write', async () => {
    let active = true
    const p = port({
      write: vi.fn().mockImplementation(async () => {
        active = false
        return copy
      }),
    })
    await expect(syncPhoneCopies(p, () => active)).rejects.toThrow(
      'COPY_CANCELLED',
    )
    expect(p.acknowledge).not.toHaveBeenCalled()
  })
  test('a concurrent server-side unkeep rejects and removes the just-written file', async () => {
    const p = port({
      acknowledge: vi.fn().mockRejectedValue({ message: 'KEEPSAKE_CHANGED' }),
    })
    await expect(syncPhoneCopies(p, () => true)).rejects.toEqual({
      message: 'KEEPSAKE_CHANGED',
    })
    expect(p.remove).toHaveBeenCalledWith(id)
  })
  test('oversized files are skipped without falsely acknowledging them', async () => {
    const p = port({
      manifest: vi.fn().mockResolvedValue([{ ...post, media_bytes: 16777217 }]),
    })
    expect(await syncPhoneCopies(p, () => true)).toEqual({
      saved: 0,
      skipped: 1,
    })
    expect(p.download).not.toHaveBeenCalled()
    expect(p.acknowledge).not.toHaveBeenCalled()
  })
})
test('both-phone evidence requires two distinct current opted-in phones, revision, sizes and matching hashes', () => {
  const devices = [
    { user_id: 'A', device_id: 'a', enabled: true },
    { user_id: 'B', device_id: 'b', enabled: true },
  ]
  const receipts = devices.map((d) => ({
    post_id: id,
    ...d,
    revision: 2,
    bytes: 0,
    sha256: hash,
    verified_at: new Date().toISOString(),
  })) as CopyReceipt[]
  expect(verifiedPair(post, ['A', 'B'], devices, receipts)).toBe(true)
  expect(verifiedPair(post, ['A', 'A'], devices, receipts)).toBe(false)
  expect(verifiedPair(post, ['A', 'B'], devices, [receipts[0]!])).toBe(false)
  for (const changed of [
    { revision: 1 },
    { device_id: 'old-phone' },
    { bytes: 9 },
    { sha256: 'b'.repeat(64) },
  ]) {
    expect(
      verifiedPair(post, ['A', 'B'], devices, [
        receipts[0]!,
        { ...receipts[1]!, ...changed },
      ]),
    ).toBe(false)
  }
  expect(
    verifiedPair(
      post,
      ['A', 'B'],
      [{ ...devices[0]!, enabled: false }, devices[1]!],
      receipts,
    ),
  ).toBe(false)
})
