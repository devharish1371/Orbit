import type { PostDraft } from '@/lib/posts'
export type PendingText = {
  version: 1
  id: string
  owner: string
  couple: string
  body: string
  replyTo: string | null
  ttl: number | null
  keep: boolean
  queuedAt: number
  expiresAt: number
  blocked?: boolean
}
export interface OutboxStore {
  list(owner: string): Promise<PendingText[]>
  put(item: PendingText): Promise<void>
  remove(owner: string, id: string): Promise<void>
  clearAll(): Promise<void>
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validPending(
  value: unknown,
  owner: string,
  now = Date.now(),
): value is PendingText {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<PendingText>
  return (
    p.version === 1 &&
    p.owner === owner &&
    uuid.test(owner) &&
    typeof p.id === 'string' &&
    uuid.test(p.id) &&
    typeof p.couple === 'string' &&
    uuid.test(p.couple) &&
    typeof p.body === 'string' &&
    p.body.trim().length > 0 &&
    p.body.length <= 2000 &&
    (p.replyTo === null ||
      (typeof p.replyTo === 'string' && uuid.test(p.replyTo))) &&
    (p.ttl === null ||
      (typeof p.ttl === 'number' &&
        Number.isInteger(p.ttl) &&
        p.ttl >= 1 &&
        p.ttl <= 720)) &&
    typeof p.keep === 'boolean' &&
    typeof p.queuedAt === 'number' &&
    Number.isFinite(p.queuedAt) &&
    p.queuedAt <= now + 60000 &&
    typeof p.expiresAt === 'number' &&
    Number.isFinite(p.expiresAt) &&
    p.expiresAt > p.queuedAt &&
    p.expiresAt <= p.queuedAt + 86400000 &&
    (p.blocked === undefined || typeof p.blocked === 'boolean')
  )
}
export function pendingText(draft: PostDraft, now = Date.now()): PendingText {
  if (draft.channel !== 'chat' || draft.kind !== 'text' || draft.attachment)
    throw new Error('TEXT_OUTBOX_ONLY')
  const item: PendingText = {
    version: 1,
    id: draft.id,
    owner: draft.author,
    couple: draft.couple,
    body: draft.body.trim(),
    replyTo: draft.replyTo ?? null,
    ttl: draft.ttl,
    keep: draft.keep,
    queuedAt: now,
    expiresAt: now + Math.min(24, draft.ttl ?? 24) * 3600000,
  }
  if (!validPending(item, draft.author, now))
    throw new Error('INVALID_PENDING_MESSAGE')
  return item
}
export function postDraft(item: PendingText): PostDraft {
  return {
    id: item.id,
    author: item.owner,
    couple: item.couple,
    body: item.body,
    channel: 'chat',
    kind: 'text',
    ttl: item.ttl,
    keep: item.keep,
    place: null,
    replyTo: item.replyTo,
  }
}
