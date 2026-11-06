import type { PhotoSource } from '@/lib/photos'
import { copySources } from '@/lib/memory-sides'
import type { Post } from '@/lib/posts'
export const MAX_COPY_BYTES = 16 * 1024 * 1024
export interface PhoneIdentity {
  owner: string
  couple: string
}
export interface PhoneCopy {
  id: string
  memory_side?: boolean
  memory_author?: string
  photo_set?: boolean
  photo_position?: number
  photo_caption?: string
  revision: number
  kind: Post['kind']
  body: string | null
  created_at: string
  mime: string
  bytes: number
  sha256: string
}
export interface PhoneStatus {
  device: string
  enabled: boolean
  used: number
  quota: number
}
export interface DeviceReceipt {
  user_id: string
  device_id: string
  enabled: boolean
}
export interface CopyReceipt {
  post_id: string
  user_id: string
  device_id: string
  revision: number
  bytes: number
  sha256: string
  verified_at: string
}
export function copyMetadata(post: PhotoSource, mime: string) {
  // Deliberately excludes location, signed URLs, quote snapshots and unrelated profile data.
  return {
    ...(post.copy_memory_side
      ? { memory_side: true, memory_author: post.copy_memory_author }
      : {}),
    ...(post.copy_set
      ? {
          photo_set: true,
          photo_position: post.copy_position,
          photo_caption: post.copy_caption,
        }
      : {}),
    id: post.id,
    revision: post.archive_revision,
    kind: post.kind,
    body: post.body,
    created_at: post.created_at,
    mime,
  }
}
export function copyMatches(copy: PhoneCopy, post: PhotoSource) {
  return (
    post.keep &&
    (!post.copy_memory_side ||
      (copy.memory_side === true &&
        copy.memory_author === post.copy_memory_author)) &&
    !post.unsent_at &&
    copy.id === post.id &&
    copy.revision === post.archive_revision &&
    copy.bytes === post.media_bytes &&
    (!post.copy_set ||
      (copy.photo_set === true &&
        copy.photo_position === post.copy_position &&
        copy.photo_caption === post.copy_caption))
  )
}
export function verifiedPair(
  post: Post,
  users: string[],
  devices: DeviceReceipt[],
  receipts: CopyReceipt[],
) {
  if (
    users.length !== 2 ||
    new Set(users).size !== 2 ||
    !post.keep ||
    post.unsent_at
  )
    return false
  return copySources(post).every((source) => {
    const copies = users.map((user) =>
      verifiedUser(source, user, devices, receipts),
    )
    return !!copies[0] && !!copies[1] && copies[0].sha256 === copies[1].sha256
  })
}
export function verifiedUser(
  post: Post,
  user: string,
  devices: DeviceReceipt[],
  receipts: CopyReceipt[],
) {
  const device = devices.find((d) => d.user_id === user && d.enabled)
  return post.keep && !post.unsent_at && device
    ? receipts.find(
        (r) =>
          r.post_id === post.id &&
          r.user_id === user &&
          r.device_id === device.device_id &&
          r.revision === post.archive_revision &&
          r.bytes === post.media_bytes &&
          /^[0-9a-f]{64}$/.test(r.sha256),
      )
    : undefined
}

export function validCopy(value: unknown): value is PhoneCopy {
  if (!value || typeof value !== 'object') return false
  const c = value as PhoneCopy
  return (
    /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}(:[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12})?$/.test(
      c.id,
    ) &&
    (c.memory_side === undefined ||
      (c.memory_side === true &&
        typeof c.memory_author === 'string' &&
        /^[0-9a-f-]{36}$/.test(c.memory_author))) &&
    (c.photo_set === undefined ||
      (c.photo_set === true &&
        Number.isInteger(c.photo_position) &&
        c.photo_position! >= 0 &&
        c.photo_position! < 6 &&
        typeof c.photo_caption === 'string' &&
        c.photo_caption.length <= 400)) &&
    Number.isInteger(c.revision) &&
    c.revision > 0 &&
    ['photo', 'text', 'voice', 'mood'].includes(c.kind) &&
    (c.body === null ||
      (typeof c.body === 'string' && c.body.length <= 2000)) &&
    typeof c.created_at === 'string' &&
    Number.isFinite(Date.parse(c.created_at)) &&
    typeof c.mime === 'string' &&
    Number.isInteger(c.bytes) &&
    c.bytes >= 0 &&
    c.bytes <= MAX_COPY_BYTES &&
    /^[0-9a-f]{64}$/.test(c.sha256)
  )
}
