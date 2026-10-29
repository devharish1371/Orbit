import { validPoint, type Point } from './geo'
export interface PlaceDraft extends Point {
  name: string
  emoji: string
  radius_m: number
  notify_arrive: boolean
  notify_leave: boolean
}
export function validPlace(draft: PlaceDraft): boolean {
  return (
    validPoint(draft) &&
    draft.name.trim().length >= 1 &&
    draft.name.trim().length <= 40 &&
    draft.emoji.trim().length >= 1 &&
    draft.emoji.trim().length <= 16 &&
    Number.isInteger(draft.radius_m) &&
    draft.radius_m >= 50 &&
    draft.radius_m <= 2000
  )
}
