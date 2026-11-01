import type { Database } from './database.types'
export type RefreshRequest =
  Database['public']['Tables']['location_refresh']['Row']
export function refreshState(
  request: RefreshRequest | undefined,
  member: { share_mode: string; location_epoch: number },
  recordedAt: string | undefined,
  now: number,
): 'idle' | 'waiting' | 'updated' | 'unavailable' {
  if (
    !request ||
    member.share_mode === 'paused' ||
    request.location_epoch !== member.location_epoch
  )
    return 'idle'
  const fix = recordedAt ? Date.parse(recordedAt) : 0
  if (
    fix >= Date.parse(request.requested_at) &&
    fix > (request.baseline_at ? Date.parse(request.baseline_at) : 0)
  )
    return 'updated'
  return now < Date.parse(request.expires_at) ? 'waiting' : 'unavailable'
}
