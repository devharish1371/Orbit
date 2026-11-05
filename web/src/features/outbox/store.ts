import { Capacitor, registerPlugin } from '@capacitor/core'
import { WebOutboxStore } from './web-store'
import {
  validPending,
  type PendingMessage,
  type PendingMedia,
  type OutboxStore,
} from './model'
import { pendingBytes } from './media'
interface NativeStore {
  list(options: { owner: string }): Promise<{ values: string[] }>
  put(options: { owner: string; id: string; value: string }): Promise<void>
  remove(options: { owner: string; id: string }): Promise<void>
  clearAll(): Promise<void>
  begin(options: {
    owner: string
    id: string
    value: string
    bytes: number
  }): Promise<void>
  append(options: { owner: string; base64: string }): Promise<void>
  finish(options: { owner: string }): Promise<void>
  open(options: { owner: string; id: string }): Promise<{ bytes: number }>
  chunk(options: { owner: string; offset: number }): Promise<{ base64: string }>
  close(options: { owner: string }): Promise<void>
}
const native = registerPlugin<NativeStore>('OrbitOutbox')
export class NativeOutboxStore implements OutboxStore {
  private epoch = 0
  private tail: Promise<unknown> = Promise.resolve()
  private run<T>(work: () => Promise<T>) {
    const result = this.tail.then(work, work)
    this.tail = result.catch(() => {})
    return result
  }
  async list(owner: string) {
    const epoch = this.epoch
    return this.run(async () => {
      const saved = await native.list({ owner }),
        items: PendingMessage[] = []
      for (const value of saved.values) {
        if (epoch !== this.epoch) return []
        let parsed: unknown
        try {
          parsed = JSON.parse(value)
        } catch {
          continue
        }
        if (validPending(parsed, owner) && parsed.expiresAt > Date.now())
          items.push(parsed)
        else if (
          parsed &&
          typeof parsed === 'object' &&
          'id' in parsed &&
          typeof parsed.id === 'string'
        )
          await native.remove({ owner, id: parsed.id }).catch(() => {})
      }
      return epoch === this.epoch
        ? items.sort((a, b) => a.queuedAt - b.queuedAt)
        : []
    })
  }
  async put(item: PendingMessage, media?: Blob) {
    if (!validPending(item, item.owner))
      throw new Error('INVALID_PENDING_MESSAGE')
    const epoch = this.epoch,
      check = () => {
        if (epoch !== this.epoch) throw new Error('OUTBOX_CLEARED')
      }
    return this.run(async () => {
      check()
      if (!media) {
        await native.put({
          owner: item.owner,
          id: item.id,
          value: JSON.stringify(item),
        })
        check()
        return
      }
      if (item.version !== 2 || media.size !== pendingBytes(item))
        throw new Error('INVALID_PENDING_MEDIA')
      try {
        await native.begin({
          owner: item.owner,
          id: item.id,
          value: JSON.stringify(item),
          bytes: media.size,
        })
        for (let offset = 0; offset < media.size; offset += 196608) {
          check()
          const bytes = new Uint8Array(
            await media.slice(offset, offset + 196608).arrayBuffer(),
          )
          check()
          let value = ''
          for (const byte of bytes) value += String.fromCharCode(byte)
          await native.append({ owner: item.owner, base64: btoa(value) })
        }
        check()
        await native.finish({ owner: item.owner })
        check()
      } finally {
        await native.close({ owner: item.owner }).catch(() => {})
      }
    })
  }
  async readMedia(item: PendingMedia) {
    const epoch = this.epoch,
      check = () => {
        if (epoch !== this.epoch) throw new Error('OUTBOX_CLEARED')
      }
    return this.run(async () => {
      check()
      try {
        const saved = await native.open({ owner: item.owner, id: item.id })
        check()
        if (saved.bytes !== pendingBytes(item))
          throw new Error('OUTBOX_MEDIA_UNAVAILABLE')
        const parts: ArrayBuffer[] = []
        for (let offset = 0; offset < saved.bytes; offset += 196608) {
          check()
          const { base64 } = await native.chunk({ owner: item.owner, offset })
          check()
          const bytes = Uint8Array.from(atob(base64), (char) =>
            char.charCodeAt(0),
          )
          if (bytes.length !== Math.min(196608, saved.bytes - offset))
            throw new Error('OUTBOX_MEDIA_CORRUPT')
          parts.push(bytes.buffer)
        }
        return new Blob(parts, { type: 'application/octet-stream' })
      } finally {
        await native.close({ owner: item.owner }).catch(() => {})
      }
    })
  }
  remove(owner: string, id: string) {
    return this.run(() => native.remove({ owner, id }))
  }
  async clearAll() {
    this.epoch++
    await this.run(() => native.clearAll())
  }
}
export const outboxStore: OutboxStore = Capacitor.isNativePlatform()
  ? new NativeOutboxStore()
  : new WebOutboxStore()
