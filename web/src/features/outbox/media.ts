import type { Attachment, PostDraft } from '@/lib/posts'
import type { DraftPhoto } from '@/lib/photos'
import {
  pendingText,
  postDraft,
  validPending,
  type PendingMessage,
  type PendingMedia,
  type PendingAsset,
} from './model'
export const MAX_PENDING_BYTES = 8 * 1024 * 1024
export const OUTBOX_QUOTA = 32 * 1024 * 1024
export async function digest(blob: Blob) {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
export function pendingBytes(item: PendingMessage) {
  return item.version === 2
    ? item.assets.reduce((sum, asset) => sum + asset.bytes, 0)
    : 0
}
export function sameIntent(a: PendingMessage, b: PendingMessage) {
  const intent = (item: PendingMessage) =>
    JSON.stringify({
      ...item,
      queuedAt: 0,
      expiresAt: 0,
      blocked: undefined,
      staged: undefined,
    })
  return intent(a) === intent(b)
}
export async function pendingMessage(
  draft: PostDraft,
  now = Date.now(),
): Promise<{ item: PendingMessage; media?: Blob }> {
  if (draft.kind === 'text') return { item: pendingText(draft, now) }
  if (
    draft.channel !== 'chat' ||
    !['photo', 'voice'].includes(draft.kind) ||
    draft.place
  )
    throw new Error('INVALID_PENDING_MEDIA')
  const assets: PendingAsset[] = [],
    blobs: Blob[] = []
  async function add(blob: Blob | undefined, limit: number) {
    if (!blob || blob.size < 1 || blob.size > limit)
      throw new Error('INVALID_PENDING_MEDIA')
    const index = assets.length,
      offset = assets.reduce((sum, asset) => sum + asset.bytes, 0)
    if (offset + blob.size > MAX_PENDING_BYTES)
      throw new Error('OUTBOX_MEDIA_LIMIT')
    assets.push({
      offset,
      bytes: blob.size,
      mime: blob.type.split(';')[0]!,
      sha256: await digest(blob),
    })
    blobs.push(blob)
    return index
  }
  const item: PendingMedia = {
    version: 2,
    staged: true,
    id: draft.id,
    owner: draft.author,
    couple: draft.couple,
    body: draft.body.trim(),
    replyTo: draft.replyTo ?? null,
    ttl: draft.ttl,
    keep: draft.keep,
    queuedAt: now,
    expiresAt: now + Math.min(24, draft.ttl ?? 24) * 3600000,
    kind: draft.kind as 'photo' | 'voice',
    assets,
  }
  if (draft.kind === 'photo') {
    const photos = draft.photos?.length
      ? draft.photos
      : draft.attachment
        ? [{ id: draft.id, attachment: draft.attachment, caption: '' }]
        : []
    if (!photos.length || photos.length > 6)
      throw new Error('INVALID_PENDING_MEDIA')
    item.photos = []
    for (const photo of photos)
      item.photos.push({
        id: photo.id,
        caption: photo.caption,
        media: await add(photo.attachment.blob, 1048576),
        thumb: await add(photo.attachment.thumb, 65536),
        width: photo.attachment.width!,
        height: photo.attachment.height!,
      })
  } else {
    const voice = draft.attachment
    if (!voice || voice.extension === 'webp')
      throw new Error('INVALID_PENDING_MEDIA')
    item.voice = {
      media: await add(voice.blob, 4.5 * 1024 * 1024),
      extension: voice.extension,
      duration: voice.duration!,
      waveform: voice.waveform ?? [],
    }
  }
  if (!validPending(item, item.owner, now))
    throw new Error('INVALID_PENDING_MEDIA')
  if (new TextEncoder().encode(JSON.stringify(item)).length > 32768)
    throw new Error('OUTBOX_METADATA_LIMIT')
  return { item, media: new Blob(blobs, { type: 'application/octet-stream' }) }
}
export async function restoreMedia(
  item: PendingMessage,
  blob?: Blob,
): Promise<PostDraft> {
  if (!validPending(item, item.owner))
    throw new Error('INVALID_PENDING_MESSAGE')
  if (item.version === 1) return postDraft(item)
  if (!blob || blob.size !== pendingBytes(item))
    throw new Error('OUTBOX_MEDIA_UNAVAILABLE')
  const parts: Blob[] = []
  for (const asset of item.assets) {
    const part = blob.slice(
      asset.offset,
      asset.offset + asset.bytes,
      asset.mime,
    )
    if ((await digest(part)) !== asset.sha256)
      throw new Error('OUTBOX_MEDIA_CORRUPT')
    parts.push(part)
  }
  const draft: PostDraft = {
    ...postDraft({ ...item, version: 1 }),
    kind: item.kind,
  }
  if (item.kind === 'photo')
    draft.photos = item.photos!.map(
      (photo) =>
        ({
          id: photo.id,
          caption: photo.caption,
          attachment: {
            extension: 'webp',
            blob: parts[photo.media]!,
            thumb: parts[photo.thumb]!,
            width: photo.width,
            height: photo.height,
          },
        }) satisfies DraftPhoto,
    )
  else
    draft.attachment = {
      ...item.voice,
      blob: parts[item.voice!.media]!,
      extension: item.voice!.extension,
    } as Attachment
  return draft
}
