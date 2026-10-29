import { isHex } from './appearance'
export interface ProfileDraft {
  name: string
  nickname: string
  partnerNickname: string
  phone: string
  color: string
  theme: string
  accent: string
}
export function profileError(
  draft: ProfileDraft,
):
  | 'invalidName'
  | 'invalidNickname'
  | 'invalidPhone'
  | 'invalidColor'
  | 'invalidTheme'
  | null {
  if (!draft.name.trim() || draft.name.trim().length > 60) return 'invalidName'
  if (
    draft.nickname.trim().length > 40 ||
    draft.partnerNickname.trim().length > 40
  )
    return 'invalidNickname'
  if (!/^\+[1-9]\d{7,14}$/.test(draft.phone.trim())) return 'invalidPhone'
  if (!isHex(draft.color) || !isHex(draft.accent)) return 'invalidColor'
  if (!['system', 'dark', 'light'].includes(draft.theme)) return 'invalidTheme'
  return null
}
export function validAvatar(file: Pick<File, 'type' | 'size'>): boolean {
  return (
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) &&
    file.size > 0 &&
    file.size <= 20 * 1024 * 1024
  )
}
