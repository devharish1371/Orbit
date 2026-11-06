import { expect, test } from 'vitest'
import { copySources, sidesOf } from './memory-sides'
import { postFiles } from './photos'
import type { Post } from './posts'
import {
  copyMetadata,
  validCopy,
  verifiedPair,
} from '@/features/phone-keepsakes/model'
const post = {
  id: '11111111-1111-4111-8111-111111111111',
  kind: 'photo',
  keep: true,
  unsent_at: null,
  archive_revision: 3,
  created_at: '2026-11-06T00:00:00Z',
  body: 'Front',
  media_path: 'front.webp',
  media_bytes: 3,
  thumb_path: 'front_t.webp',
  thumb_bytes: 2,
  photo_items: [],
  memory_sides: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      author_id: '33333333-3333-4333-8333-333333333333',
      kind: 'voice',
      body: 'On the back',
      path: 'side.webm',
      thumb_path: null,
      bytes: 5,
      thumb_bytes: 0,
      version: 1,
    },
  ],
} as unknown as Post

test('mixed manifest includes every original for copies and every original/thumbnail for export and cleanup', () => {
  const sources = copySources(post)
  expect(sources.map((s) => s.media_path)).toEqual(['front.webp', 'side.webm'])
  expect(postFiles(post)).toEqual(['front.webp', 'front_t.webp', 'side.webm'])
  const voice = sources[1]!
  expect(copyMetadata(voice, 'audio/webm')).toMatchObject({
    memory_side: true,
    memory_author: '33333333-3333-4333-8333-333333333333',
    kind: 'voice',
    body: 'On the back',
  })
  expect(sidesOf({ ...post, memory_sides: [] })).toEqual([])
})
test('front receipts alone do not claim both phones; all side hashes and revisions must match', () => {
  const devices = [
      { user_id: 'a', device_id: 'one', enabled: true },
      { user_id: 'b', device_id: 'two', enabled: true },
    ],
    sources = copySources(post)
  const receipts = sources.flatMap((p) =>
    devices.map((d) => ({
      post_id: p.id,
      user_id: d.user_id,
      device_id: d.device_id,
      revision: 3,
      bytes: p.media_bytes,
      sha256: 'a'.repeat(64),
      verified_at: new Date().toISOString(),
    })),
  )
  expect(verifiedPair(post, ['a', 'b'], devices, receipts.slice(0, 2))).toBe(
    false,
  )
  expect(verifiedPair(post, ['a', 'b'], devices, receipts)).toBe(true)
  expect(
    verifiedPair(
      post,
      ['a', 'b'],
      devices,
      receipts.map((r, i) => (i === 3 ? { ...r, sha256: 'b'.repeat(64) } : r)),
    ),
  ).toBe(false)
})
test('local side metadata keeps author identity and rejects corrupt identity fields', () => {
  const source = copySources(post)[1]!,
    copy = {
      ...copyMetadata(source, 'audio/webm'),
      bytes: 5,
      sha256: 'a'.repeat(64),
    }
  expect(validCopy(copy)).toBe(true)
  expect(validCopy({ ...copy, memory_author: 'not-an-identity' })).toBe(false)
})
