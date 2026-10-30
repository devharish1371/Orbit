import { expect, test, vi } from 'vitest'
import {
  cursorFilter,
  remaining,
  validReaction,
  visiblePost,
  sharePost,
  type PostDraft,
} from './posts'
import { validPhoto, waveformBins } from './media'
import type { OrbitClient } from './supabase'
const now = Date.parse('2026-10-30T08:00:00Z')
test('expiry boundaries, kept items and tombstones stay consistent', () => {
  expect(
    visiblePost(
      { unsent_at: null, keep: false, expires_at: new Date(now).toISOString() },
      now,
    ),
  ).toBe(false)
  expect(
    visiblePost({ unsent_at: null, keep: true, expires_at: null }, now),
  ).toBe(true)
  expect(
    visiblePost({ unsent_at: 'now', keep: true, expires_at: null }, now),
  ).toBe(false)
  const post = {
    keep: false,
    created_at: new Date(now - 3600000).toISOString(),
    expires_at: new Date(now + 3600000).toISOString(),
  }
  expect(remaining(post, now)).toMatchObject({
    label: '1h',
    fraction: 0.5,
    soon: true,
  })
  expect(remaining({ ...post, keep: true }, now)).toMatchObject({
    label: 'kept',
    soon: false,
  })
  expect(
    remaining(
      {
        ...post,
        created_at: new Date(now + 20000).toISOString(),
        expires_at: new Date(now + 7 * 86400000 + 20000).toISOString(),
      },
      now,
    ).label,
  ).toBe('7d')
})
test('pagination cursors and custom emoji reject unsafe or malformed input', () => {
  const row = {
    id: '00000000-0000-4000-8000-000000000001',
    created_at: '2026-10-30T08:00:00.000+00:00',
  }
  expect(cursorFilter(row)).toContain('and(created_at.eq.')
  expect(() =>
    cursorFilter({ ...row, created_at: 'now),id.not.is.null' }),
  ).toThrow()
  for (const emoji of ['❤️', '🫶🏽', '🇮🇳', '👨‍👩‍👧'])
    expect(validReaction(emoji)).toBe(true)
  for (const value of ['', 'hello', '❤️😂', '<script>'])
    expect(validReaction(value)).toBe(false)
})
test('waveform reduction bounds payloads and photo validation excludes active/oversized content', () => {
  expect(
    waveformBins(Array.from({ length: 1200 }, (_, i) => (i % 2 ? 1.5 : -1))),
  ).toHaveLength(60)
  expect(waveformBins([-0.5, 0.2, 2], 3)).toEqual([0, 0.2, 1])
  expect(validPhoto({ type: 'image/svg+xml', size: 200 })).toBe(false)
  expect(validPhoto({ type: 'image/jpeg', size: 21 * 1024 * 1024 })).toBe(false)
  expect(validPhoto({ type: 'image/webp', size: 250000 })).toBe(true)
})
test('an ambiguous commit reuses the saved post without deleting its attachment', async () => {
  const persisted = { id: 'saved' }
  const maybeSingle = vi
    .fn()
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: persisted, error: null })
  const from = vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    })),
    remove = vi.fn(),
    upload = vi.fn().mockResolvedValue({ error: null })
  const client = {
    from,
    rpc: vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'response lost' } }),
    storage: { from: () => ({ upload, remove }) },
  } as unknown as OrbitClient
  const draft: PostDraft = {
    id: 'draft',
    couple: 'couple',
    author: 'author',
    channel: 'moment',
    kind: 'photo',
    body: '',
    ttl: 24,
    keep: false,
    place: null,
    attachment: {
      blob: new Blob(['test'], { type: 'image/webp' }),
      extension: 'webp',
    },
  }
  expect(await sharePost(client, draft)).toEqual(persisted)
  expect(remove).not.toHaveBeenCalled()
})
