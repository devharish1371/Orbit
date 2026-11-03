import { Capacitor, registerPlugin } from '@capacitor/core'
import { WebOutboxStore } from './web-store'
import { validPending, type PendingText, type OutboxStore } from './model'
interface NativeStore {
  list(options: { owner: string }): Promise<{ values: string[] }>
  put(options: { owner: string; id: string; value: string }): Promise<void>
  remove(options: { owner: string; id: string }): Promise<void>
  clearAll(): Promise<void>
}
const native = registerPlugin<NativeStore>('OrbitOutbox')
class NativeOutboxStore implements OutboxStore {
  private epoch = 0
  async list(owner: string) {
    const epoch = this.epoch,
      saved = await native.list({ owner }),
      items: PendingText[] = []
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
  }
  async put(item: PendingText) {
    if (!validPending(item, item.owner))
      throw new Error('INVALID_PENDING_MESSAGE')
    await native.put({
      owner: item.owner,
      id: item.id,
      value: JSON.stringify(item),
    })
  }
  async remove(owner: string, id: string) {
    await native.remove({ owner, id })
  }
  async clearAll() {
    this.epoch++
    await native.clearAll()
  }
}
export const outboxStore: OutboxStore = Capacitor.isNativePlatform()
  ? new NativeOutboxStore()
  : new WebOutboxStore()
