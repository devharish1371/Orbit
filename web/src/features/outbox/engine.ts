import { pendingText, postDraft, type OutboxStore } from './model'
import type { PostDraft } from '@/lib/posts'
type Identity = { owner: string; couple: string }
export class TextOutbox {
  private running = false
  private active = true
  private requested = false
  private abort?: AbortController
  sendingId: string | null = null
  private store: OutboxStore
  readonly identity: Identity
  private send: (draft: PostDraft, signal: AbortSignal) => Promise<unknown>
  private connected: () => boolean
  private current: () => Identity | null
  private changed: () => void
  private now: () => number
  constructor(
    store: OutboxStore,
    identity: Identity,
    send: (draft: PostDraft, signal: AbortSignal) => Promise<unknown>,
    connected: () => boolean,
    current: () => Identity | null,
    changed: () => void,
    now = Date.now,
  ) {
    this.store = store
    this.identity = identity
    this.send = send
    this.connected = connected
    this.current = current
    this.changed = changed
    this.now = now
  }
  private valid() {
    const current = this.current()
    return (
      this.active &&
      current?.owner === this.identity.owner &&
      current.couple === this.identity.couple
    )
  }
  stop() {
    this.active = false
    this.requested = false
    this.abort?.abort()
    this.sendingId = null
  }
  async list() {
    const saved = await this.store.list(this.identity.owner)
    for (const item of saved)
      if (item.expiresAt <= this.now())
        await this.store.remove(item.owner, item.id)
    return saved.filter(
      (item) =>
        item.couple === this.identity.couple && item.expiresAt > this.now(),
    )
  }
  async enqueue(draft: PostDraft) {
    if (
      !this.valid() ||
      draft.author !== this.identity.owner ||
      draft.couple !== this.identity.couple
    )
      throw new Error('DRAFT_ACCOUNT_CHANGED')
    let item = pendingText(draft, this.now())
    const existing = (await this.list()).find((saved) => saved.id === item.id)
    if (existing) {
      if (
        JSON.stringify(postDraft(existing)) !== JSON.stringify(postDraft(item))
      )
        throw new Error('DRAFT_IMMUTABLE')
      item = existing
    }
    if (!this.valid()) throw new Error('DRAFT_ACCOUNT_CHANGED')
    await this.store.put(item)
    if (!this.valid()) throw new Error('DRAFT_ACCOUNT_CHANGED')
    const verified = (await this.list()).find((saved) => saved.id === item.id)
    if (!verified || JSON.stringify(verified) !== JSON.stringify(item))
      throw new Error('OUTBOX_WRITE_UNCONFIRMED')
    if (!this.valid()) throw new Error('DRAFT_ACCOUNT_CHANGED')
    this.changed()
    return item
  }
  async discard(id: string) {
    if (!this.valid() || this.sendingId === id) throw new Error('OUTBOX_BUSY')
    await this.store.remove(this.identity.owner, id)
    this.changed()
  }
  async flush(retryId?: string) {
    if (this.running) {
      this.requested = true
      return
    }
    if (!this.valid() || !this.connected()) return
    this.running = true
    try {
      const items = await this.list()
      for (const item of items) {
        if (!this.valid() || !this.connected()) break
        if (
          (retryId && item.id !== retryId) ||
          (item.blocked && item.id !== retryId)
        )
          continue
        if (item.expiresAt <= this.now()) {
          await this.store.remove(item.owner, item.id)
          continue
        }
        this.sendingId = item.id
        this.changed()
        this.abort = new AbortController()
        const timer = setTimeout(() => this.abort?.abort(), 30000)
        try {
          await this.send(postDraft(item), this.abort.signal)
          if (!this.valid()) break
          await this.store.remove(item.owner, item.id)
        } catch (error) {
          if (!this.valid()) break
          const message =
            error && typeof error === 'object' && 'message' in error
              ? String(error.message)
              : ''
          if (
            /REPLY_UNAVAILABLE|DRAFT_ACCOUNT_CHANGED|POST_ID_UNAVAILABLE|MEMBERSHIP_REQUIRED/.test(
              message,
            )
          )
            await this.store.put({ ...item, blocked: true })
          break // retry on a deliberate action/reconnect/resume; never spin on network errors
        } finally {
          clearTimeout(timer)
          this.abort = undefined
          this.sendingId = null
          this.changed()
        }
      }
    } finally {
      this.running = false
      this.changed()
      if (this.requested) {
        this.requested = false
        void this.flush().catch(() => {})
      }
    }
  }
}
