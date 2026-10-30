import { localDateParts } from './calendar'
export function localDay(now: Date, timezone: string): string {
  const { year, month, day } = localDateParts(now, timezone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
export function storyDays(start: string, now: Date, timezone: string): number {
  return Math.max(
    0,
    Math.round(
      (Date.parse(localDay(now, timezone)) - Date.parse(start)) / 86400000,
    ),
  )
}
export function isAnniversary(
  start: string,
  now: Date,
  timezone: string,
): boolean {
  const today = localDay(now, timezone)
  return today >= start && today.slice(5) === start.slice(5)
}
export function storyMilestones(start: string, now: Date, timezone: string) {
  const year = Number(localDay(now, timezone).slice(0, 4)),
    began = Number(start.slice(0, 4))
  return Array.from(
    { length: Math.min(100, Math.max(0, year - began)) },
    (_, index) => `${began + index + 1}${start.slice(4)}`,
  )
}
