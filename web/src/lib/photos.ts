import type { Attachment, Post } from './posts'
export const MAX_PHOTOS = 6
export interface DraftPhoto {
  id: string
  attachment: Attachment
  caption: string
}
export interface PhotoItem {
  id: string
  path: string
  thumb_path: string | null
  width: number | null
  height: number | null
  caption: string
  bytes: number
  thumb_bytes: number
}
export type PhotoSource = Post & {
  copy_set?: boolean
  copy_position?: number
  copy_caption?: string
}
export function photosOf(post: Post): PhotoItem[] {
  const rows = post.photo_items
  if (
    Array.isArray(rows) &&
    rows.length >= 1 &&
    rows.length <= MAX_PHOTOS &&
    rows.every(
      (row) =>
        row &&
        typeof row === 'object' &&
        !Array.isArray(row) &&
        typeof row.id === 'string' &&
        typeof row.path === 'string' &&
        typeof row.caption === 'string' &&
        typeof row.bytes === 'number',
    )
  )
    return rows as unknown as PhotoItem[]
  return post.kind === 'photo' && post.media_path
    ? [
        {
          id: post.id,
          path: post.media_path,
          thumb_path: post.thumb_path,
          width: post.media_width,
          height: post.media_height,
          caption: '',
          bytes: post.media_bytes,
          thumb_bytes: post.thumb_bytes,
        },
      ]
    : []
}
export function photoSources(post: Post): PhotoSource[] {
  const photos = photosOf(post)
  if (!Array.isArray(post.photo_items) || !post.photo_items.length)
    return [post]
  return photos.map((photo, index) => ({
    ...post,
    id: index ? `${post.id}:${photo.id}` : post.id,
    photo_items: [],
    body: index ? null : post.body,
    media_path: photo.path,
    thumb_path: photo.thumb_path,
    media_width: photo.width,
    media_height: photo.height,
    media_bytes: photo.bytes,
    thumb_bytes: photo.thumb_bytes,
    extra_media_bytes: 0,
    extra_thumb_bytes: 0,
    copy_set: true,
    copy_position: index,
    copy_caption: photo.caption,
  }))
}
export function splitCopyId(id: string) {
  const [post, asset] = id.split(':')
  return { post: post!, asset }
}
export function postFiles(post: Post) {
  return [
    ...new Set(
      [
        post.media_path,
        post.thumb_path,
        ...photosOf(post).flatMap((photo) => [photo.path, photo.thumb_path]),
      ].filter((path): path is string => !!path),
    ),
  ]
}
export function movePhoto(photos: DraftPhoto[], id: string, direction: -1 | 1) {
  const at = photos.findIndex((photo) => photo.id === id),
    next = at + direction
  if (at < 0 || next < 0 || next >= photos.length) return photos
  const result = [...photos]
  ;[result[at], result[next]] = [result[next]!, result[at]!]
  return result
}
