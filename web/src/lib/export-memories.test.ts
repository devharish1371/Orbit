// @vitest-environment node
import { expect, test, vi } from 'vitest'
import { exportMemories } from './export-memories'
import type { OrbitClient } from './supabase'
test('shared collection references survive export without copying the same photo per collection', async () => {
  const source: Record<string, object[]> = {
    posts: [
      {
        id: 'p',
        kind: 'photo',
        media_path: 'couple/user/p.webp',
        thumb_path: null,
        photo_items: [
          {
            id: 'p',
            path: 'couple/user/p.webp',
            thumb_path: null,
            caption: 'First',
            bytes: 3,
          },
          {
            id: 'extra',
            path: 'couple/user/extra.webp',
            thumb_path: 'couple/user/extra_t.webp',
            caption: 'Second',
            bytes: 3,
          },
        ],
      },
    ],
    memory_collections: [
      { id: 'one', name: 'Weekends' },
      { id: 'two', name: 'Trips' },
    ],
    collection_posts: [
      { collection_id: 'one', post_id: 'p' },
      { collection_id: 'two', post_id: 'p' },
    ],
  }
  const signed = vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://example.test/disposable-media' },
    error: null,
  })
  const client = {
    from: (table: string) => {
      const result: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'is', 'lte', 'order', 'in'])
        result[method] = () => result
      result.range = () =>
        Promise.resolve({ data: source[table] ?? [], error: null })
      return result
    },
    storage: { from: () => ({ createSignedUrl: signed }) },
  } as unknown as OrbitClient
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(new Uint8Array([1, 2, 3])))
  try {
    const zip = await exportMemories(
        client,
        new AbortController().signal,
        () => {},
      ),
      buffer = await zip.arrayBuffer(),
      view = new DataView(buffer),
      bytes = new Uint8Array(buffer),
      entries: Record<string, Uint8Array> = {}
    for (let offset = 0; view.getUint32(offset, true) === 0x04034b50;) {
      const size = view.getUint32(offset + 18, true),
        nameLength = view.getUint16(offset + 26, true),
        extra = view.getUint16(offset + 28, true),
        start = offset + 30 + nameLength + extra,
        name = new TextDecoder().decode(
          bytes.slice(offset + 30, offset + 30 + nameLength),
        )
      entries[name] = bytes.slice(start, start + size)
      offset = start + size
    }
    const json = JSON.parse(new TextDecoder().decode(entries['memories.json']))
    expect(json.collections).toHaveLength(2)
    expect(json.collection_items).toHaveLength(2)
    expect(Object.keys(json.files)).toEqual([
      'couple/user/p.webp',
      'couple/user/extra.webp',
      'couple/user/extra_t.webp',
    ])
    expect(
      json.posts[0].photo_items.map((p: { caption: string }) => p.caption),
    ).toEqual(['First', 'Second'])
    expect(
      Object.keys(entries).filter((name) => name.startsWith('media/')),
    ).toHaveLength(3)
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(new TextDecoder().decode(bytes)).not.toContain(
      'https://example.test/disposable-media',
    )
  } finally {
    fetch.mockRestore()
  }
})
