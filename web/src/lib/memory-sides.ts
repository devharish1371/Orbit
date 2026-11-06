import { photoSources, type PhotoSource } from './photos'
import type { Post } from './posts'
export interface MemorySide {
  id: string
  author_id: string
  kind: 'photo' | 'voice' | 'text'
  body: string
  path: string | null
  thumb_path: string | null
  bytes: number
  thumb_bytes: number
  width: number | null
  height: number | null
  duration: number | null
  mime: string
  version: number
  created_at: string
}
export function sidesOf(post: Post): MemorySide[] {
  const rows = post.memory_sides
  if (!Array.isArray(rows) || rows.length > 2) return []
  return rows.filter(
    (r) =>
      !!r &&
      typeof r === 'object' &&
      !Array.isArray(r) &&
      typeof r.id === 'string' &&
      typeof r.author_id === 'string' &&
      ['photo', 'voice', 'text'].includes(String(r.kind)) &&
      typeof r.body === 'string' &&
      typeof r.version === 'number' &&
      typeof r.bytes === 'number',
  ) as unknown as MemorySide[]
}
export function copySources(post: Post): PhotoSource[] {
  return [
    ...photoSources(post),
    ...sidesOf(post).map((side) => ({
      ...post,
      id: `${post.id}:${side.id}`,
      kind: side.kind,
      body: side.body,
      media_path: side.path,
      thumb_path: side.thumb_path,
      media_bytes: side.bytes,
      thumb_bytes: side.thumb_bytes,
      media_width: side.width,
      media_height: side.height,
      media_duration_s: side.duration,
      waveform: null,
      photo_items: [],
      memory_sides: [],
      memory_bytes: 0,
      extra_media_bytes: 0,
      extra_thumb_bytes: 0,
      copy_memory_side: true,
      copy_memory_author: side.author_id,
    })),
  ]
}
