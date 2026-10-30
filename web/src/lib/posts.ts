import type { Database, Json } from './database.types'
import type { OrbitClient } from './supabase'
export type Post = Database['public']['Tables']['posts']['Row']
export type Channel = 'moment' | 'chat'
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
  attachment?: Attachment
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
export async function sharePost(
  client: OrbitClient,
  draft: PostDraft,
): Promise<Post> {
  const uploaded: string[] = []
  const existing = await client
    .from('posts')
    .select('*')
    .eq('id', draft.id)
    .maybeSingle()
  if (existing.error) throw existing.error
  if (existing.data) return existing.data
  const root = `${draft.couple}/${draft.author}/${draft.id}`
  let media: string | null = null,
    thumb: string | null = null
  async function upload(path: string, blob: Blob) {
    const result = await client.storage.from('media').upload(path, blob, {
      contentType: blob.type.split(';')[0],
      cacheControl: '3600',
      upsert: false,
    })
    // A retry can reuse this draft's immutable file; editing a failed draft changes its ID.
    if (result.error && String(result.error.statusCode) !== '409')
      throw result.error
    uploaded.push(path)
  }
  try {
    const attachment = draft.attachment
    if (attachment) {
      media = root + '.' + attachment.extension
      await upload(media, attachment.blob)
      if (attachment.thumb) {
        thumb = root + '_t.webp'
        await upload(thumb, attachment.thumb)
      }
    }
    const payload: Json = {
      id: draft.id,
      channel: draft.channel,
      kind: draft.kind,
      body: draft.body.trim() || null,
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
    const result = await client.rpc('create_shared_post', { p_post: payload })
    if (result.error) throw result.error
    return result.data
  } catch (error) {
    // Never remove attached media after a response is lost. RLS also protects references.
    const check = await Promise.resolve(
      client.from('posts').select('*').eq('id', draft.id).maybeSingle(),
    ).catch(() => null)
    if (check?.data) return check.data
    if (check && !check.error && uploaded.length)
      await client.storage
        .from('media')
        .remove(uploaded)
        .catch(() => {})
    throw error
  }
}
export function mediaError(error: unknown): 'quota' | 'unavailable' | 'failed' {
  const text =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : ''
  return text.includes('KEEPSAKE_QUOTA_EXCEEDED')
    ? 'quota'
    : /CLEANUP|UNAVAILABLE|PGRST116/.test(text)
      ? 'unavailable'
      : 'failed'
}
