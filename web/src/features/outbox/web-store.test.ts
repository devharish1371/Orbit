// @vitest-environment node
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { WebOutboxStore } from './web-store'
import { pendingText } from './model'
const owner = '11111111-1111-4111-8111-111111111111',
  couple = '22222222-2222-4222-8222-222222222222'
const item = () =>
  pendingText({
    id: crypto.randomUUID(),
    author: owner,
    couple,
    channel: 'chat',
    kind: 'text',
    body: 'Private disposable text',
    ttl: 24,
    keep: false,
    place: null,
  })
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory())
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
function inspect<T>(
  store: string,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('orbit-outbox-v1', 2)
    open.onsuccess = () => {
      const db = open.result,
        tx = db.transaction(store, 'readwrite'),
        request = run(tx.objectStore(store))
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
test('real AES-GCM records survive a new store instance without plaintext serialization or extractable keys', async () => {
  const store = new WebOutboxStore(),
    saved = item()
  await store.put(saved)
  const records = await inspect('messages', (s) => s.getAll())
  expect(JSON.stringify(records)).not.toContain(saved.body)
  const key = await inspect<CryptoKey>('keys', (s) => s.get(owner))
  expect(key.extractable).toBe(false)
  expect(await new WebOutboxStore().list(owner)).toEqual([saved])
  expect(await store.list('33333333-3333-4333-8333-333333333333')).toEqual([])
})
test('tampered ciphertext is rejected and removed, rather than displayed or sent', async () => {
  const store = new WebOutboxStore(),
    saved = item()
  await store.put(saved)
  const records = await inspect('messages', (s) => s.getAll())
  const record = records[0]
  const bytes = new Uint8Array(record.encrypted)
  bytes[0] = (bytes[0] ?? 0) ^ 1
  await inspect('messages', (s) => s.put(record))
  expect(await store.list(owner)).toEqual([])
  expect(await inspect('messages', (s) => s.count())).toBe(0)
})
test('a separate tab clearing the store prevents an in-flight encrypted write from reviving a logged-out intent', async () => {
  const store = new WebOutboxStore(),
    saved = item(),
    encrypt = crypto.subtle.encrypt.bind(crypto.subtle)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let notify!: () => void
  const started = new Promise<void>((resolve) => {
    notify = resolve
  })
  vi.spyOn(crypto.subtle, 'encrypt').mockImplementation(async (...args) => {
    notify()
    await gate
    return encrypt(...args)
  })
  const write = store.put(saved)
  await started
  await new WebOutboxStore().clearAll()
  release()
  await expect(write).rejects.toThrow()
  expect(await store.list(owner)).toEqual([])
})
test('expired records are pruned and a clear prevents old intents from being restored', async () => {
  const store = new WebOutboxStore(),
    saved = item()
  await store.put({
    ...saved,
    queuedAt: Date.now() - 90000000,
    expiresAt: Date.now() - 3600001,
  })
  expect(await store.list(owner)).toEqual([])
  await store.clearAll()
  await expect(store.put(saved)).rejects.toThrow('OUTBOX_CLEARED')
})

test('upgrading the database preserves an installed v1 encrypted text message and its key', async () => {
  const saved = item(),
    stamp = crypto.randomUUID(),
    key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    ),
    iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: new TextEncoder().encode(
        owner + ':' + saved.id + ':' + stamp,
      ),
    },
    key,
    new TextEncoder().encode(JSON.stringify(saved)),
  )
  await new Promise<void>((resolve, reject) => {
    const open = indexedDB.open('orbit-outbox-v1', 1)
    open.onupgradeneeded = () => {
      open.result.createObjectStore('keys')
      open.result
        .createObjectStore('messages', { keyPath: 'key' })
        .createIndex('owner', 'owner')
    }
    open.onsuccess = () => {
      const db = open.result,
        tx = db.transaction(['keys', 'messages'], 'readwrite')
      tx.objectStore('keys').put(key, owner)
      tx.objectStore('keys').put({ stamp, clearedAt: 0 }, '@epoch')
      tx.objectStore('messages').put({
        key: owner + ':' + saved.id,
        owner,
        id: saved.id,
        stamp,
        iv,
        encrypted,
      })
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onabort = () => reject(tx.error)
    }
  })
  const store = new WebOutboxStore()
  expect(await store.list(owner)).toEqual([saved])
  expect(await inspect('media', (s) => s.count())).toBe(0)
  await store.put({ ...saved, blocked: true })
  expect((await store.list(owner))[0]?.blocked).toBe(true)
})
