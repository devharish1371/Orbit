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
export interface PendingAsset {
  offset: number
  bytes: number
  mime: string
  sha256: string
}
export type PendingMedia = Omit<PendingText, 'version'> & {
  version: 2
  kind: 'photo' | 'voice'
  assets: PendingAsset[]
  photos?: {
    id: string
    caption: string
    media: number
    thumb: number
    width: number
    height: number
  }[]
  voice?: {
    media: number
    extension: 'webm' | 'ogg' | 'm4a'
    duration: number
    waveform: number[]
  }
}
export type PendingMessage = PendingText | PendingMedia
export interface OutboxStore {
  list(owner: string): Promise<PendingMessage[]>
  put(item: PendingMessage, media?: Blob): Promise<void>
  readMedia?(item: PendingMedia): Promise<Blob>
  remove(owner: string, id: string): Promise<void>
  clearAll(): Promise<void>
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validPending(
  value: unknown,
  owner: string,
  now = Date.now(),
): value is PendingMessage {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<PendingMessage>
  return (
    (p.version === 1 || (p.version === 2 && validMedia(p as PendingMedia))) &&
    p.owner === owner &&
    uuid.test(owner) &&
    typeof p.id === 'string' &&
    uuid.test(p.id) &&
    typeof p.couple === 'string' &&
    uuid.test(p.couple) &&
    typeof p.body === 'string' &&
    (p.version === 2 || p.body.trim().length > 0) &&
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
  if (
    draft.channel !== 'chat' ||
    draft.kind !== 'text' ||
    draft.attachment ||
    draft.photos?.length
  )
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

function validMedia(p: PendingMedia) {
  if (!Array.isArray(p.assets) || p.assets.length < 1 || p.assets.length > 12)
    return false
  let total = 0
  for (const asset of p.assets) {
    if (
      !asset ||
      !Number.isInteger(asset.offset) ||
      asset.offset !== total ||
      !Number.isInteger(asset.bytes) ||
      asset.bytes < 1 ||
      typeof asset.mime !== 'string' ||
      typeof asset.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(asset.sha256)
    )
      return false
    total += asset.bytes
  }
  if (total > 8 * 1024 * 1024) return false
  if (p.kind === 'photo') {
    if (
      p.voice !== undefined ||
      !Array.isArray(p.photos) ||
      p.photos.length < 1 ||
      p.photos.length > 6 ||
      p.assets.length !== p.photos.length * 2
    )
      return false
    const ids = new Set<string>()
    return p.photos.every((photo, index) => {
      if (
        !photo ||
        typeof photo.id !== 'string' ||
        !uuid.test(photo.id) ||
        ids.has(photo.id) ||
        typeof photo.caption !== 'string' ||
        photo.caption.length > 400 ||
        photo.media !== index * 2 ||
        photo.thumb !== index * 2 + 1 ||
        !Number.isInteger(photo.width) ||
        !Number.isInteger(photo.height) ||
        photo.width < 1 ||
        photo.height < 1 ||
        photo.width > 1600 ||
        photo.height > 1600
      )
        return false
      ids.add(photo.id)
      return (
        p.assets[photo.media]?.mime === 'image/webp' &&
        p.assets[photo.media]!.bytes <= 1048576 &&
        p.assets[photo.thumb]?.mime === 'image/webp' &&
        p.assets[photo.thumb]!.bytes <= 65536
      )
    })
  }
  if (
    p.kind !== 'voice' ||
    p.photos !== undefined ||
    p.assets.length !== 1 ||
    !p.voice ||
    p.voice.media !== 0 ||
    !Number.isFinite(p.voice.duration) ||
    p.voice.duration <= 0 ||
    p.voice.duration > 120 ||
    !Array.isArray(p.voice.waveform) ||
    p.voice.waveform.length > 60 ||
    !p.voice.waveform.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
  )
    return false
  const mime = { webm: 'audio/webm', ogg: 'audio/ogg', m4a: 'audio/mp4' }[
    p.voice.extension
  ]
  return (
    !!mime &&
    p.assets[0]?.mime === mime &&
    p.assets[0]!.bytes <= 4.5 * 1024 * 1024
  )
}
