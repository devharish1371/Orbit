import type { Database } from './database.types'
export type Plan = Database['public']['Tables']['plans']['Row']
export type Idea = Database['public']['Tables']['date_ideas']['Row']
export function planConfirmed(plan: Plan, members: string[]) {
  return (
    !plan.cancelled &&
    members.length === 2 &&
    members.every((id) => plan.accepted_by.includes(id))
  )
}
export function zoneInput(instant: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(instant))
  const p = (key: string) => parts.find((v) => v.type === key)!.value
  return `${p('year')}-${p('month')}-${p('day')}T${p('hour')}:${p('minute')}`
}
/** Resolve exactly one wall-clock instant. Reject missing/ambiguous DST times. */
export function zoneInstant(value: string, zone: string) {
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error('INVALID_TIME')
  const target = Date.parse(value + 'Z')
  if (
    !Number.isFinite(target) ||
    new Date(target).toISOString().slice(0, 16) !== value
  )
    throw new Error('INVALID_TIME')
  const candidates = new Set<number>()
  for (const sample of [target - 86400000, target, target + 86400000]) {
    const local = Date.parse(
      zoneInput(new Date(sample).toISOString(), zone) + 'Z',
    )
    const instant = target - (local - sample)
    if (zoneInput(new Date(instant).toISOString(), zone) === value)
      candidates.add(instant)
  }
  if (candidates.size !== 1) throw new Error('AMBIGUOUS_TIME')
  return new Date([...candidates][0]!).toISOString()
}
const escapeCalendar = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
function fold(line: string) {
  const lines: string[] = []
  let current = ''
  let count = 0
  for (const char of line) {
    const size = new TextEncoder().encode(char).length
    if (count + size > 75) {
      lines.push(current)
      current = ' '
      count = 1
    }
    current += char
    count += size
  }
  lines.push(current)
  return lines.join('\r\n')
}
export function planCalendar(plan: Plan, confirmed: boolean) {
  const stamp = (date: string) =>
    new Date(date)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  if (!/^[0-9a-f-]{36}$/i.test(plan.id)) throw new Error('INVALID_PLAN')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Orbit//Plans//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${plan.id}@orbit.local`,
    `SEQUENCE:${plan.version}`,
    `DTSTAMP:${stamp(plan.updated_at)}`,
    `DTSTART:${stamp(plan.starts_at)}`,
    `SUMMARY:${escapeCalendar(plan.title)}`,
    `DESCRIPTION:${escapeCalendar(plan.notes)}`,
    `LOCATION:${escapeCalendar(plan.venue)}`,
    `STATUS:${plan.cancelled ? 'CANCELLED' : confirmed ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
export function drawIdea(ideas: Idea[]) {
  const pool = ideas.filter((i) => i.kind === 'idea' && !i.archived)
  if (!pool.length) return undefined
  const n = new Uint32Array(1)
  const limit = 0x100000000 - (0x100000000 % pool.length)
  do {
    crypto.getRandomValues(n)
  } while (n[0]! >= limit)
  return pool[n[0]! % pool.length]
}
export function planningError(error: unknown) {
  const code =
    typeof error === 'object' && error !== null && 'message' in error
      ? String(error.message)
      : ''
  if (/DRAFT_ACCOUNT_CHANGED/.test(code))
    return 'Your account changed. Reopen this draft.'
  return /CHANGED|CLOSED/.test(code)
    ? 'This changed. Close and reopen it before saving.'
    : /LIMIT/.test(code)
      ? 'This list is full. Remove an old item first.'
      : /INVALID_PLAN|INVALID_TIME|AMBIGUOUS_TIME/.test(code)
        ? 'Check the date and time.'
        : /DRAFT_ACCOUNT_CHANGED/.test(code)
          ? 'Your account changed. Reopen this draft.'
          : 'Couldn’t save. Your draft is still here.'
}
