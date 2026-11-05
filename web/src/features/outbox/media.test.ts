// @vitest-environment node
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, expect, test, vi } from 'vitest'
import { pendingMessage, restoreMedia, digest } from './media'
import { validPending, type PendingMedia } from './model'
import { WebOutboxStore } from './web-store'
import { MessageOutbox } from './engine'
import type { PostDraft } from '@/lib/posts'
const owner = '11111111-1111-4111-8111-111111111111',
  couple = '22222222-2222-4222-8222-222222222222'
const photo = (name: string) => ({
  id: crypto.randomUUID(),
  caption: name,
  attachment: {
    blob: new Blob([name], { type: 'image/webp' }),
    thumb: new Blob(['small-' + name], { type: 'image/webp' }),
    extension: 'webp' as const,
    width: 8,
    height: 6,
  },
})
const draft = (): PostDraft => ({
  id: crypto.randomUUID(),
  author: owner,
  couple,
  channel: 'chat',
  kind: 'photo',
  body: 'Private media note',
  ttl: 24,
  keep: false,
  place: null,
  photos: [photo('First'), photo('Second')],
})
function inspect<T>(
  name: string,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('orbit-outbox-v1', 2)
    open.onsuccess = () => {
      const db = open.result,
        tx = db.transaction(name, 'readwrite'),
        request = run(tx.objectStore(name))
      let value: T
      request.onsuccess = () => {
        value = request.result
      }
      tx.oncomplete = () => {
        db.close()
        resolve(value)
      }
      tx.onabort = () => reject(tx.error)
    }
  })
}
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.restoreAllMocks()
})
test('photo sets and voice packages restore every file, caption and recording property', async () => {
  const original = draft(),
    prepared = await pendingMessage(original),
    restored = await restoreMedia(prepared.item, prepared.media)
  expect(restored.photos?.map((p) => [p.id, p.caption])).toEqual(
    original.photos?.map((p) => [p.id, p.caption]),
  )
  for (const [i, p] of restored.photos!.entries())
    expect(await digest(p.attachment.blob)).toBe(
      await digest(original.photos![i]!.attachment.blob),
    )
  const voice = {
    ...draft(),
    kind: 'voice' as const,
    photos: undefined,
    body: '',
    attachment: {
      blob: new Blob(['synthetic voice'], { type: 'audio/ogg' }),
      extension: 'ogg' as const,
      duration: 3.4,
      waveform: [0.1, 0.5, 0.2],
    },
  }
  const saved = await pendingMessage(voice),
    loaded = await restoreMedia(saved.item, saved.media)
  expect(loaded.attachment).toMatchObject({
    extension: 'ogg',
    duration: 3.4,
    waveform: [0.1, 0.5, 0.2],
  })
  expect(await loaded.attachment!.blob.text()).toBe('synthetic voice')
  expect(loaded.body).toBe('')
})
test('malformed manifests, extra assets, wrong hashes and oversized media fail closed', async () => {
  const prepared = await pendingMessage(draft()),
    item = prepared.item as PendingMedia
  for (const changed of [
    {
      ...item,
      assets: [{ ...item.assets[0]!, offset: 1 }, ...item.assets.slice(1)],
    },
    {
      ...item,
      photos: item.photos!.map((p, i) =>
        i ? { ...p, id: item.photos![0]!.id } : p,
      ),
    },
    { ...item, photos: item.photos!.map((p) => ({ ...p, thumb: p.media })) },
    { ...item, assets: [...item.assets, item.assets[0]!] },
  ])
    expect(validPending(changed, owner)).toBe(false)
  await expect(restoreMedia(item, new Blob(['truncated']))).rejects.toThrow(
    'OUTBOX_MEDIA_UNAVAILABLE',
  )
  const bytes = new Uint8Array(await prepared.media!.arrayBuffer())
  bytes[0] = (bytes[0] ?? 0) ^ 1
  await expect(restoreMedia(item, new Blob([bytes]))).rejects.toThrow(
    'OUTBOX_MEDIA_CORRUPT',
  )
  await expect(
    pendingMessage({
      ...draft(),
      photos: [
        {
          ...photo('huge'),
          attachment: {
            ...photo('x').attachment,
            blob: new Blob([new Uint8Array(1048577)], { type: 'image/webp' }),
          },
        },
      ],
    }),
  ).rejects.toThrow('INVALID_PENDING_MEDIA')
})
test('encrypted media survives a fresh store/engine and sends once from its original identity', async () => {
  const store = new WebOutboxStore(),
    original = draft(),
    changed = vi.fn(),
    send = vi.fn()
  const first = new MessageOutbox(
    store,
    { owner, couple },
    send,
    () => false,
    () => ({ owner, couple }),
    changed,
  )
  await first.enqueue(original)
  const records = await inspect('messages', (s) => s.getAll()),
    media = await inspect('media', (s) => s.getAll())
  expect(JSON.stringify(records)).not.toContain('Private media note')
  expect(JSON.stringify(media)).not.toContain('First')
  const second = new MessageOutbox(
    new WebOutboxStore(),
    { owner, couple },
    send,
    () => true,
    () => ({ owner, couple }),
    changed,
  )
  const preview = await second.preview(original.id)
  expect(preview.photos?.[1]?.caption).toBe('Second')
  await second.flush()
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0]![0]).toMatchObject({
    id: original.id,
    author: owner,
    couple,
    kind: 'photo',
  })
  expect(await inspect('media', (s) => s.count())).toBe(0)
  expect(await second.list()).toEqual([])
})
test('blocking a queued message preserves its media; retry never accepts changed intent under the same ID', async () => {
  const store = new WebOutboxStore(),
    send = vi.fn().mockRejectedValue(new Error('REPLY_UNAVAILABLE')),
    engine = new MessageOutbox(
      store,
      { owner, couple },
      send,
      () => true,
      () => ({ owner, couple }),
      () => {},
    )
  const original = draft()
  await engine.enqueue(original)
  await engine.flush()
  expect((await engine.list())[0]?.blocked).toBe(true)
  const loaded = await engine.preview(original.id)
  expect(loaded.photos?.[0]?.caption).toBe('First')
  await expect(
    engine.enqueue({ ...original, body: 'Different' }),
  ).rejects.toThrow('DRAFT_IMMUTABLE')
  await engine.flush()
  expect(send).toHaveBeenCalledTimes(1)
  await engine.flush(original.id)
  expect(send).toHaveBeenCalledTimes(2)
})
test('logout in a separate tab cannot resurrect a partially encrypted media package', async () => {
  const store = new WebOutboxStore(),
    prepared = await pendingMessage(draft()),
    encrypt = crypto.subtle.encrypt.bind(crypto.subtle)
  let release!: () => void, started!: () => void
  const gate = new Promise<void>((r) => {
      release = r
    }),
    reading = new Promise<void>((r) => {
      started = r
    })
  vi.spyOn(crypto.subtle, 'encrypt').mockImplementation(async (...args) => {
    started()
    await gate
    return encrypt(...args)
  })
  const write = store.put(prepared.item, prepared.media)
  await reading
  await new WebOutboxStore().clearAll()
  release()
  await expect(write).rejects.toThrow()
  expect(await inspect('messages', (s) => s.count())).toBe(0)
  expect(await inspect('media', (s) => s.count())).toBe(0)
})
test('expiry and logout prune the encrypted media together with its message', async () => {
  const store = new WebOutboxStore(),
    prepared = await pendingMessage(draft())
  await store.put(
    {
      ...prepared.item,
      queuedAt: Date.now() - 90000000,
      expiresAt: Date.now() - 3600001,
    },
    prepared.media,
  )
  expect(await store.list(owner)).toEqual([])
  expect(await inspect('media', (s) => s.count())).toBe(0)
  const fresh = await pendingMessage(draft())
  await store.put(fresh.item, fresh.media)
  await store.clearAll()
  expect(await inspect('messages', (s) => s.count())).toBe(0)
  expect(await inspect('media', (s) => s.count())).toBe(0)
  await expect(store.put(fresh.item, fresh.media)).rejects.toThrow(
    'OUTBOX_CLEARED',
  )
})
test('media storage enforces the aggregate quota atomically and retains earlier queued recordings', async () => {
  const store = new WebOutboxStore(),
    voice = {
      ...draft(),
      photos: undefined,
      kind: 'voice' as const,
      attachment: {
        blob: new Blob([new Uint8Array(4.5 * 1024 * 1024)], {
          type: 'audio/webm',
        }),
        extension: 'webm' as const,
        duration: 120,
        waveform: [0.5],
      },
    }
  for (let i = 0; i < 7; i++) {
    const p = await pendingMessage({ ...voice, id: crypto.randomUUID() })
    await store.put(p.item, p.media)
  }
  const last = await pendingMessage({ ...voice, id: crypto.randomUUID() })
  await expect(store.put(last.item, last.media)).rejects.toThrow(
    'OUTBOX_STORAGE_FAILED',
  )
  expect(await store.list(owner)).toHaveLength(7)
  expect(await inspect('media', (s) => s.count())).toBe(7)
})

test('corrupt encrypted media is blocked without sending and a changed account cannot preview it', async () => {
  const store = new WebOutboxStore(),
    original = draft(),
    send = vi.fn()
  let identity: { owner: string; couple: string } | null = { owner, couple }
  const engine = new MessageOutbox(
    store,
    { owner, couple },
    send,
    () => true,
    () => identity,
    () => {},
  )
  await engine.enqueue(original)
  const envelope = await inspect('media', (s) =>
    s.get(owner + ':' + original.id),
  )
  const bytes = new Uint8Array(envelope.encrypted)
  bytes[0] = (bytes[0] ?? 0) ^ 1
  await inspect('media', (s) => s.put(envelope, owner + ':' + original.id))
  await engine.flush()
  expect(send).not.toHaveBeenCalled()
  expect((await engine.list())[0]?.blocked).toBe(true)
  identity = { owner: '33333333-3333-4333-8333-333333333333', couple }
  await expect(engine.preview(original.id)).rejects.toThrow(
    'DRAFT_ACCOUNT_CHANGED',
  )
})
test('pausing an in-flight send preserves the package and resumes with the same message ID', async () => {
  const store = new WebOutboxStore(),
    original = draft()
  let started!: () => void
  const began = new Promise<void>((resolve) => {
    started = resolve
  })
  const send = vi
    .fn()
    .mockImplementationOnce(
      (_draft: PostDraft, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          started()
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          })
        }),
    )
    .mockResolvedValue(undefined)
  const engine = new MessageOutbox(
    store,
    { owner, couple },
    send,
    () => true,
    () => ({ owner, couple }),
    () => {},
  )
  await engine.enqueue(original)
  const flushing = engine.flush()
  await began
  engine.pause()
  await flushing
  expect(await engine.list()).toHaveLength(1)
  await engine.flush()
  expect(send.mock.calls.map((call) => call[0].id)).toEqual([
    original.id,
    original.id,
  ])
  expect(await engine.list()).toEqual([])
})
