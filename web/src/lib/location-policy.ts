import { distance, validPoint, type Point } from './geo'
export interface Fix extends Point {
  accuracy: number
  speed: number | null
  heading: number | null
  timestamp: number
}
export function validFix(fix: Fix, now = Date.now()): boolean {
  return (
    validPoint(fix) &&
    Number.isFinite(fix.accuracy) &&
    fix.accuracy >= 0 &&
    fix.accuracy <= 100 &&
    fix.timestamp <= now + 10_000 &&
    now - fix.timestamp <= 120_000
  )
}
export function shouldPublish(
  fix: Fix,
  last: Fix | null,
  now: number,
  lastSent: number,
): boolean {
  if (!validFix(fix, now)) return false
  if (!last) return true
  if (fix.timestamp <= last.timestamp) return false
  const moving = (fix.speed ?? 0) > 0.8 || distance(last, fix) > 30
  return now - lastSent >= (moving ? 15_000 : 300_000)
}
export function shouldRecord(fix: Fix, last: Fix | null): boolean {
  return (
    !last ||
    fix.timestamp - last.timestamp >= 300_000 ||
    distance(fix, last) >= 30
  )
}
