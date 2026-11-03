import { expect, test, vi } from 'vitest'
import { TextOutbox } from './engine'
import { pendingText, type OutboxStore, type PendingText } from './model'
import type { PostDraft } from '@/lib/posts'
const owner = '11111111-1111-4111-8111-111111111111',
  couple = '22222222-2222-4222-8222-222222222222'
const draft = (): PostDraft => ({
  id: crypto.randomUUID(),
  author: owner,
  couple,
  channel: 'chat',
  kind: 'text',
  body: 'Disposable intent',
  ttl: 24,
  keep: false,
  place: null,
})
class MemoryStore implements OutboxStore {
  rows = new Map<string, PendingText>()
  async list(uid: string) {
    return [...this.rows.values()].filter((row) => row.owner === uid)
  }
  async put(item: PendingText) {
    this.rows.set(item.id, structuredClone(item))
  }
  async remove(_owner: string, id: string) {
    this.rows.delete(id)
  }
  async clearAll() {
    this.rows.clear()
  }
}
test('lost-response retries preserve identity/id and serialized intent until confirmation', async () => {
  const store = new MemoryStore(),
    send = vi
      .fn()
      .mockRejectedValueOnce(new Error('response lost'))
      .mockResolvedValueOnce({})
  const engine = new TextOutbox(
    store,
    { owner, couple },
    send,
    () => true,
    () => ({ owner, couple }),
    () => {},
  )
  const intent = draft()
  await engine.enqueue(intent)
  await engine.flush()
  expect(store.rows.size).toBe(1)
  await engine.flush(intent.id)
  expect(send).toHaveBeenCalledTimes(2)
  expect(send.mock.calls[0]![0]).toMatchObject({
    id: intent.id,
    author: owner,
    couple,
  })
  expect(send.mock.calls[1]![0]).toEqual(send.mock.calls[0]![0])
  expect(store.rows.size).toBe(0)
})
test('offline, expired, stopped and switched-account queues never start a send', async () => {
  let clock = Date.now(),
    online = false,
    identity: { owner: string; couple: string } | null = { owner, couple }
  const store = new MemoryStore(),
    send = vi.fn()
  const engine = new TextOutbox(
    store,
    { owner, couple },
    send,
    () => online,
    () => identity,
    () => {},
    () => clock,
  )
  await engine.enqueue(draft())
  await engine.flush()
  expect(send).not.toHaveBeenCalled()
  clock += 86400001
  online = true
  await engine.flush()
  expect(store.rows.size).toBe(0)
  clock = Date.now()
  await engine.enqueue(draft())
  identity = { owner: 'other', couple }
  await engine.flush()
  expect(send).not.toHaveBeenCalled()
  identity = { owner, couple }
  engine.stop()
  await engine.flush()
  expect(send).not.toHaveBeenCalled()
})
test('a permanent quote failure blocks automatic retries but permits an explicit retry', async () => {
  const store = new MemoryStore(),
    send = vi.fn().mockRejectedValue(new Error('REPLY_UNAVAILABLE'))
  const engine = new TextOutbox(
    store,
    { owner, couple },
    send,
    () => true,
    () => ({ owner, couple }),
    () => {},
  )
  const item = await engine.enqueue(draft())
  await engine.flush()
  await engine.flush()
  expect(send).toHaveBeenCalledTimes(1)
  expect(store.rows.get(item.id)?.blocked).toBe(true)
  await engine.flush(item.id)
  expect(send).toHaveBeenCalledTimes(2)
})
test('only text is serialized, pending lifetime is bounded and store failure leaves the caller responsible for its draft', async () => {
  const item = pendingText({ ...draft(), keep: true, ttl: 168 })
  expect(item.expiresAt - item.queuedAt).toBe(86400000)
  expect(() => pendingText({ ...draft(), kind: 'photo' })).toThrow(
    'TEXT_OUTBOX_ONLY',
  )
  const store = new MemoryStore()
  store.put = vi.fn().mockRejectedValue(new Error('disk full'))
  const engine = new TextOutbox(
    store,
    { owner, couple },
    vi.fn(),
    () => true,
    () => ({ owner, couple }),
    () => {},
  )
  await expect(engine.enqueue(draft())).rejects.toThrow('disk full')
})
test('logout during a pending read stops enqueue before it can write after the clear', async () => {
  const store = new MemoryStore(),
    put = vi.spyOn(store, 'put')
  let release!: (items: PendingText[]) => void, started!: () => void
  const waiting = new Promise<PendingText[]>((resolve) => {
      release = resolve
    }),
    read = new Promise<void>((resolve) => {
      started = resolve
    })
  store.list = vi.fn().mockImplementation(async () => {
    started()
    return waiting
  })
  const engine = new TextOutbox(
    store,
    { owner, couple },
    vi.fn(),
    () => true,
    () => ({ owner, couple }),
    () => {},
  )
  const pending = engine.enqueue(draft())
  await read
  engine.stop()
  release([])
  await expect(pending).rejects.toThrow('DRAFT_ACCOUNT_CHANGED')
  expect(put).not.toHaveBeenCalled()
})
test('an unconfirmed durable write never reports the intent as queued', async () => {
  const store = new MemoryStore()
  store.put = vi.fn().mockResolvedValue(undefined)
  const engine = new TextOutbox(
    store,
    { owner, couple },
    vi.fn(),
    () => true,
    () => ({ owner, couple }),
    () => {},
  )
  await expect(engine.enqueue(draft())).rejects.toThrow(
    'OUTBOX_WRITE_UNCONFIRMED',
  )
})
