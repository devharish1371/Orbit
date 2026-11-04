import type { Post } from '@/lib/posts'
export const MAX_COPY_BYTES = 16 * 1024 * 1024
export interface PhoneIdentity {
  owner: string
  couple: string
}
export interface PhoneCopy {
  id: string
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
export function copyMetadata(post: Post, mime: string) {
  // Deliberately excludes location, signed URLs, quote snapshots and unrelated profile data.
  return {
    id: post.id,
    revision: post.archive_revision,
    kind: post.kind,
    body: post.body,
    created_at: post.created_at,
    mime,
  }
}
export function copyMatches(copy: PhoneCopy, post: Post) {
  return (
    post.keep &&
    !post.unsent_at &&
    copy.id === post.id &&
    copy.revision === post.archive_revision &&
    copy.bytes === post.media_bytes
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
  const copies = users.map((user) => {
    const device = devices.find((d) => d.user_id === user && d.enabled)
    return (
      device &&
      receipts.find(
        (r) =>
          r.post_id === post.id &&
          r.user_id === user &&
          r.device_id === device.device_id &&
          r.revision === post.archive_revision &&
          r.bytes === post.media_bytes &&
          /^[0-9a-f]{64}$/.test(r.sha256),
      )
    )
  })
  return !!copies[0] && !!copies[1] && copies[0].sha256 === copies[1].sha256
}
export function validCopy(value: unknown): value is PhoneCopy {
  if (!value || typeof value !== 'object') return false
  const c = value as PhoneCopy
  return (
    /^[0-9a-f-]{36}$/.test(c.id) &&
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
