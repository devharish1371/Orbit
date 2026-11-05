import { expect, test, vi } from 'vitest'
import {
  movePhoto,
  photosOf,
  photoSources,
  postFiles,
  type DraftPhoto,
} from './photos'
import { sharePost, type Post, type PostDraft } from './posts'
import type { OrbitClient } from './supabase'
import {
  copyMetadata,
  copyMatches,
  validCopy,
  verifiedPair,
} from '@/features/phone-keepsakes/model'
const id = '11111111-1111-4111-8111-111111111111',
  asset = '22222222-2222-4222-8222-222222222222'
const post = {
  id,
  kind: 'photo',
  keep: true,
  unsent_at: null,
  archive_revision: 2,
  media_path: 'cover.webp',
  thumb_path: 'cover_t.webp',
  media_bytes: 3,
  thumb_bytes: 2,
  body: 'Together',
  created_at: '2026-11-05T00:00:00Z',
  photo_items: [
    {
      id,
      path: 'cover.webp',
      thumb_path: 'cover_t.webp',
      bytes: 3,
      thumb_bytes: 2,
      width: 2,
      height: 2,
      caption: 'First',
    },
    {
      id: asset,
      path: 'second.webp',
      thumb_path: 'second_t.webp',
      bytes: 4,
      thumb_bytes: 2,
      width: 2,
      height: 2,
      caption: 'Second',
    },
  ],
} as unknown as Post
const attachment = {
  blob: new Blob(['one'], { type: 'image/webp' }),
  thumb: new Blob(['t'], { type: 'image/webp' }),
  extension: 'webp',
  width: 2,
  height: 2,
} as const
const draft: PostDraft = {
  id,
  couple: 'couple',
  author: 'self',
  channel: 'moment',
  kind: 'photo',
  body: 'Together',
  keep: true,
  ttl: null,
  place: null,
  photos: [
    { id: 'local-cover', attachment, caption: 'First' },
    { id: asset, attachment, caption: 'Second' },
  ],
}
test('photo order, cover identity, file deduplication and independent phone copy metadata agree', () => {
  const photos = [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as DraftPhoto[]
  expect(movePhoto(photos, 'a', -1)).toBe(photos)
  expect(movePhoto(photos, 'b', -1).map((p) => p.id)).toEqual(['b', 'a', 'c'])
  expect(photos.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  expect(postFiles(post)).toEqual([
    'cover.webp',
    'cover_t.webp',
    'second.webp',
    'second_t.webp',
  ])
  const sources = photoSources(post)
  expect(sources.map((p) => p.id)).toEqual([id, `${id}:${asset}`])
  expect(sources.map((p) => p.media_bytes)).toEqual([3, 4])
  expect(sources[1]?.body).toBeNull()
  const metadata = copyMetadata(sources[1]!, 'image/webp')
  expect(metadata).toMatchObject({
    photo_caption: 'Second',
    photo_position: 1,
    photo_set: true,
  })
  const copy = { ...metadata, bytes: 4, sha256: 'a'.repeat(64) }
  expect(validCopy(copy)).toBe(true)
  expect(copyMatches(copy, sources[1]!)).toBe(true)
  expect(copyMatches({ ...copy, photo_caption: 'Old' }, sources[1]!)).toBe(
    false,
  )
  expect(validCopy({ ...copy, id: `${id}:../${asset}` })).toBe(false)
  expect(photosOf({ ...post, photo_items: [] })).toHaveLength(1)
})
test('cover receipts cannot report a full set saved on both phones', () => {
  const devices = [
    { user_id: 'a', device_id: 'a-phone', enabled: true },
    { user_id: 'b', device_id: 'b-phone', enabled: true },
  ]
  const sources = photoSources(post)
  const receipts = sources.flatMap((p) =>
    devices.map((d) => ({
      post_id: p.id,
      user_id: d.user_id,
      device_id: d.device_id,
      revision: p.archive_revision,
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
function clientFixture(persisted = false) {
  const saved = { ...post, author_id: 'self', couple_id: 'couple' }
  const lookup = vi
    .fn()
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValue({ data: persisted ? saved : null, error: null })
  const upload = vi.fn().mockResolvedValue({ error: null }),
    remove = vi.fn().mockResolvedValue({ error: null }),
    rpc = vi.fn().mockResolvedValue({ error: new Error('response lost') })
  return {
    lookup,
    upload,
    remove,
    rpc,
    client: {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: lookup }) }) }),
      storage: { from: () => ({ upload, remove }) },
      rpc,
    } as unknown as OrbitClient,
  }
}
test('upload order and canonical paths follow the arranged set; ambiguous saves retain every attached image', async () => {
  const f = clientFixture(true)
  expect((await sharePost(f.client, draft)).id).toBe(id)
  expect(f.upload.mock.calls.map((c) => c[0])).toEqual([
    `couple/self/${id}.webp`,
    `couple/self/${id}_t.webp`,
    `couple/self/${id}_${asset}.webp`,
    `couple/self/${id}_${asset}_t.webp`,
  ])
  expect(f.rpc).toHaveBeenCalledWith('create_photo_post', {
    p_post: expect.objectContaining({
      photos: [
        expect.objectContaining({ id, caption: 'First' }),
        expect.objectContaining({ id: asset, caption: 'Second' }),
      ],
    }),
  })
  expect(f.remove).not.toHaveBeenCalled()
})
test('a definitive failed set removes all unattached uploads and preserves the error for retry', async () => {
  const f = clientFixture()
  await expect(sharePost(f.client, draft)).rejects.toThrow('response lost')
  expect(f.remove).toHaveBeenCalledWith(f.upload.mock.calls.map((c) => c[0]))
})

test('a set sync retries only missing photos and never invents evidence for an interrupted file', async () => {
  const { syncPhoneCopies } = await import('@/features/phone-keepsakes/sync')
  const sources = photoSources(post),
    saved = new Map<
      string,
      import('@/features/phone-keepsakes/model').PhoneCopy
    >()
  const download = vi.fn(
    async (p: Post) =>
      new Blob(['x'.repeat(p.media_bytes)], { type: 'image/webp' }),
  )
  const acknowledge = vi.fn(),
    write = vi.fn(async (metadata: object, blob: Blob) => {
      const row = {
        ...metadata,
        bytes: blob.size,
        sha256: 'a'.repeat(64),
      } as import('@/features/phone-keepsakes/model').PhoneCopy
      if (row.id.includes(':') && write.mock.calls.length === 2)
        throw new Error('interrupted')
      saved.set(row.id, row)
      return row
    })
  const port = {
    manifest: async () => sources,
    local: async () => [...saved.values()],
    receipts: async () => [],
    download,
    write,
    acknowledge,
    remove: vi.fn(),
    forget: vi.fn(),
  }
  await expect(syncPhoneCopies(port, () => true)).rejects.toThrow('interrupted')
  expect(acknowledge).toHaveBeenCalledTimes(1)
  expect(saved.size).toBe(1)
  await syncPhoneCopies(port, () => true)
  expect(saved.size).toBe(2)
  expect(download.mock.calls.map(([p]) => p.id)).toEqual([
    id,
    `${id}:${asset}`,
    `${id}:${asset}`,
  ])
})
