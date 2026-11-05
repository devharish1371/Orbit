import type { Database } from '@/lib/database.types'
export type MemberStatus = Database['public']['Tables']['member_status']['Row']
export const statusEmoji = [
  { value: '💬', label: 'Chat' },
  { value: '☕', label: 'Coffee' },
  { value: '🌙', label: 'Moon' },
  { value: '🎧', label: 'Headphones' },
  { value: '📚', label: 'Books' },
  { value: '🌿', label: 'Leaf' },
  { value: '✨', label: 'Sparkles' },
  { value: '❤️', label: 'Heart' },
] as const
export function activeStatus(item: MemberStatus | undefined, now: number) {
  return item?.expires_at && Date.parse(item.expires_at) > now ? item : null
}
export function statusError(error: unknown) {
  return error &&
    typeof error === 'object' &&
    'message' in error &&
    /STATUS_CHANGED|ACCOUNT_CHANGED/.test(String(error.message))
    ? 'This status changed on another device. Close and reopen to edit it.'
    : 'Couldn’t save. Your changes are still here.'
}
