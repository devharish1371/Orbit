// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest'
import { pendingMessage, restoreMedia } from './media'
import type { PostDraft } from '@/lib/posts'
const bridge = vi.hoisted(() => ({
  list: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  clearAll: vi.fn(),
  begin: vi.fn(),
  append: vi.fn(),
  finish: vi.fn(),
  open: vi.fn(),
  chunk: vi.fn(),
  close: vi.fn(),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => bridge,
}))
import { NativeOutboxStore } from './store'
const owner = '11111111-1111-4111-8111-111111111111',
  couple = '22222222-2222-4222-8222-222222222222'
const voice = (): PostDraft => ({
  id: crypto.randomUUID(),
  author: owner,
  couple,
  channel: 'chat',
  kind: 'voice',
  body: '',
  ttl: 24,
  keep: false,
  place: null,
  attachment: {
    blob: new Blob([new Uint8Array(500000).fill(17)], { type: 'audio/webm' }),
    extension: 'webm',
    duration: 4,
    waveform: [0.4],
  },
})
beforeEach(() => {
  vi.resetAllMocks()
  bridge.close.mockResolvedValue(undefined)
  bridge.clearAll.mockResolvedValue(undefined)
})
test('native media writes and reads use bounded chunks and verify byte counts before hydration', async () => {
  const prepared = await pendingMessage(voice()),
    parts: Uint8Array<ArrayBuffer>[] = []
  let metadata = '',
    reading = new Uint8Array()
  bridge.begin.mockImplementation(async (value) => {
    metadata = value.value
  })
  bridge.append.mockImplementation(async ({ base64 }) => {
    expect(base64.length).toBeLessThanOrEqual(262144)
    parts.push(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))
  })
  bridge.finish.mockImplementation(async () => {
    reading = new Uint8Array(await new Blob(parts).arrayBuffer())
  })
  bridge.list.mockImplementation(async () => ({ values: [metadata] }))
  bridge.open.mockImplementation(async () => ({ bytes: reading.length }))
  bridge.chunk.mockImplementation(async ({ offset }) => ({
    base64: btoa(
      [...reading.slice(offset, offset + 196608)]
        .map((byte) => String.fromCharCode(byte))
        .join(''),
    ),
  }))
  const store = new NativeOutboxStore()
  await store.put(prepared.item, prepared.media)
  expect(bridge.append).toHaveBeenCalledTimes(3)
  expect(await store.list(owner)).toEqual([prepared.item])
  if (prepared.item.version !== 2) throw new Error('setup')
  const restored = await restoreMedia(
    prepared.item,
    await store.readMedia(prepared.item),
  )
  expect(restored.attachment?.blob.size).toBe(500000)
  expect(bridge.close).toHaveBeenCalledTimes(2)
  bridge.chunk.mockResolvedValue({ base64: 'eA==' })
  await expect(store.readMedia(prepared.item)).rejects.toThrow(
    'OUTBOX_MEDIA_CORRUPT',
  )
  expect(bridge.close).toHaveBeenCalledTimes(3)
})
test('logout during a staged native upload cancels before commit and clears the native store', async () => {
  const prepared = await pendingMessage(voice()),
    store = new NativeOutboxStore()
  let release!: () => void, started!: () => void
  const gate = new Promise<void>((resolve) => {
      release = resolve
    }),
    began = new Promise<void>((resolve) => {
      started = resolve
    })
  bridge.append.mockImplementationOnce(async () => {
    started()
    await gate
  })
  const write = store.put(prepared.item, prepared.media)
  await began
  const clear = store.clearAll()
  release()
  await expect(write).rejects.toThrow('OUTBOX_CLEARED')
  await clear
  expect(bridge.finish).not.toHaveBeenCalled()
  expect(bridge.close).toHaveBeenCalled()
  expect(bridge.clearAll).toHaveBeenCalledTimes(1)
})
