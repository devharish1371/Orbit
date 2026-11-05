import type { DraftPhoto } from './photos'
import type { Database, Json } from './database.types'
import type { OrbitClient } from './supabase'
export type Post = Database['public']['Tables']['posts']['Row']
export type Channel = 'moment' | 'chat'
export type NoteStyle = 'ink' | 'glow' | 'paper'
export interface Attachment {
  blob: Blob
  extension: 'webp' | 'webm' | 'ogg' | 'm4a'
  thumb?: Blob
  width?: number
  height?: number
  duration?: number
  waveform?: number[]
}
export interface PostDraft {
  id: string
  couple: string
  author: string
  channel: Channel
  kind: 'text' | 'photo' | 'voice' | 'mood'
  body: string
  ttl: number | null
  keep: boolean
  place: string | null
  photos?: DraftPhoto[]
  attachment?: Attachment
  noteStyle?: NoteStyle
  replyTo?: string | null
}
export function visiblePost(
  post: Pick<Post, 'unsent_at' | 'keep' | 'expires_at'>,
  now = Date.now(),
) {
  return (
    !post.unsent_at &&
    (post.keep ||
      (post.expires_at !== null && new Date(post.expires_at).getTime() > now))
  )
}
export function remaining(
  post: Pick<Post, 'keep' | 'created_at' | 'expires_at'>,
  now = Date.now(),
) {
  if (post.keep) return { label: 'kept', fraction: 1, soon: false } as const
  const end = new Date(post.expires_at ?? 0).getTime(),
    left = Math.max(0, end - now)
  return {
    label:
      left <= 0
        ? 'expired'
        : left < 3600000
          ? `${Math.max(1, Math.ceil(left / 60000))}m`
          : left < 86400000
            ? `${Math.ceil(left / 3600000)}h`
            : `${Math.max(1, Math.round(left / 86400000))}d`,
    fraction: Math.min(
      1,
      Math.max(
        0,
        left / Math.max(1, end - new Date(post.created_at).getTime()),
      ),
    ),
    soon: left > 0 && left < 86400000,
  }
}
export function validReaction(value: string) {
  return (
    Array.from(value).length <= 16 &&
    [
      ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
        value,
      ),
    ].length === 1 &&
    /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3/u.test(value)
  )
}
export function cursorFilter(post: Pick<Post, 'id' | 'created_at'>) {
  if (
    !/^[0-9a-f-]{36}$/i.test(post.id) ||
    !/^\d{4}-\d{2}-\d{2}T[\d:.+Z-]+$/.test(post.created_at) ||
    !Number.isFinite(Date.parse(post.created_at))
  )
    throw new Error('INVALID_POST_CURSOR')
  return `created_at.lt.${post.created_at},and(created_at.eq.${post.created_at},id.lt.${post.id})`
}
// The installed Storage SDK cannot cancel upload fetches. Stop awaiting a stalled request
// on interruption; the late upload may finish privately, but cannot continue into publication.
function untilAborted<T>(
  request: PromiseLike<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return Promise.resolve(request)
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort)
      reject(signal.reason ?? new DOMException('Cancelled', 'AbortError'))
    }
    Promise.resolve(request).then(
      (value) => {
        signal.removeEventListener('abort', abort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', abort)
        reject(error)
      },
    )
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}
export async function sharePost(
  client: OrbitClient,
  draft: PostDraft,
  signal?: AbortSignal,
): Promise<Post> {
  const uploaded: string[] = []
  const lookup = client.from('posts').select('*').eq('id', draft.id)
  const existing = await (
    signal ? lookup.abortSignal(signal) : lookup
  ).maybeSingle()
  if (existing.error) throw existing.error
  function own(item: Post) {
    if (
      item.author_id !== draft.author ||
      item.couple_id !== draft.couple ||
      item.id !== draft.id
    )
      throw new Error('DRAFT_ACCOUNT_CHANGED')
    return item
  }
  if (existing.data) return own(existing.data)
  const root = `${draft.couple}/${draft.author}/${draft.id}`
  let media: string | null = null,
    thumb: string | null = null
  async function upload(path: string, blob: Blob) {
    signal?.throwIfAborted()
    const result = await untilAborted(
      client.storage.from('media').upload(path, blob, {
        contentType: blob.type.split(';')[0],
        cacheControl: '3600',
        upsert: false,
      }),
      signal,
    )
    // A retry can reuse this draft's immutable file; editing a failed draft changes its ID.
    if (result.error && String(result.error.statusCode) !== '409')
      throw result.error
    uploaded.push(path)
    signal?.throwIfAborted()
  }
  try {
    const attachment = draft.attachment
    const photos: Json[] = []
    if (draft.kind === 'photo' && draft.photos?.length) {
      for (const [index, photo] of draft.photos.entries()) {
        const base = index ? `${root}_${photo.id}` : root
        if (!photo.attachment.thumb) throw new Error('PHOTO_THUMB_REQUIRED')
        await upload(base + '.webp', photo.attachment.blob)
        await upload(base + '_t.webp', photo.attachment.thumb)
        photos.push({
          id: index ? photo.id : draft.id,
          path: base + '.webp',
          thumb_path: base + '_t.webp',
          width: photo.attachment.width,
          height: photo.attachment.height,
          caption: photo.caption,
        })
      }
    } else if (attachment) {
      media = root + '.' + attachment.extension
      await upload(media, attachment.blob)
      if (attachment.thumb) {
        thumb = root + '_t.webp'
        await upload(thumb, attachment.thumb)
      }
    }
    const payload: Json = {
      photos,
      id: draft.id,
      expected_author_id: draft.author,
      expected_couple_id: draft.couple,
      channel: draft.channel,
      kind: draft.kind,
      body: draft.body.trim() || null,
      reply_to_id: draft.channel === 'chat' ? (draft.replyTo ?? null) : null,
      note_style:
        draft.channel === 'moment' && draft.kind === 'text'
          ? (draft.noteStyle ?? 'ink')
          : 'ink',
      ttl_hours: draft.ttl,
      keep: draft.keep,
      place_id: draft.place,
      media_path: media,
      thumb_path: thumb,
      duration: attachment?.duration ?? null,
      width: attachment?.width ?? null,
      height: attachment?.height ?? null,
      waveform: attachment?.waveform ?? null,
    }
    const request = client.rpc(
      photos.length ? 'create_photo_post' : 'create_shared_post',
      { p_post: payload },
    )
    const result = await (signal ? request.abortSignal(signal) : request)
    if (result.error) throw result.error
    return result.data
  } catch (error) {
    if (signal?.aborted) throw error
    // Never remove attached media after a response is lost. RLS also protects references.
    const lookup = client.from('posts').select('*').eq('id', draft.id)
    const check = await Promise.resolve(
      (signal ? lookup.abortSignal(signal) : lookup).maybeSingle(),
    ).catch(() => null)
    if (check?.data) return own(check.data)
    if (check && !check.error && uploaded.length)
      await client.storage
        .from('media')
        .remove(uploaded)
        .catch(() => {})
    throw error
  }
}
export function mediaError(
  error: unknown,
): 'quota' | 'unavailable' | 'failed' | 'reply' {
  const text =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : ''
  return text.includes('REPLY_UNAVAILABLE')
    ? 'reply'
    : text.includes('KEEPSAKE_QUOTA_EXCEEDED')
      ? 'quota'
      : /CLEANUP|UNAVAILABLE|PGRST116/.test(text)
        ? 'unavailable'
        : 'failed'
}
export function canEditChat(
  post: Pick<
    Post,
    'channel' | 'kind' | 'created_at' | 'expires_at' | 'keep' | 'unsent_at'
  >,
  now = Date.now(),
) {
  const created = Date.parse(post.created_at)
  return (
    post.channel === 'chat' &&
    post.kind === 'text' &&
    visiblePost(post, now) &&
    // The shared display clock ticks in batches; a newly sent server row can be newer.
    created <= now + 60_000 &&
    now < created + 15 * 60_000
  )
}
