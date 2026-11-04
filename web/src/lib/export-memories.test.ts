// @vitest-environment node
import { expect, test, vi } from 'vitest'
import { exportMemories } from './export-memories'
import type { OrbitClient } from './supabase'
test('shared collection references survive export without copying the same photo per collection', async () => {
  const source: Record<string, object[]> = {
    posts: [{ id: 'p', media_path: 'couple/user/p.webp', thumb_path: null }],
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
    .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])))
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
    expect(Object.keys(json.files)).toEqual(['couple/user/p.webp'])
    expect(
      Object.keys(entries).filter((name) => name.startsWith('media/')),
    ).toHaveLength(1)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(new TextDecoder().decode(bytes)).not.toContain(
      'https://example.test/disposable-media',
    )
  } finally {
    fetch.mockRestore()
  }
})
