export function localDateParts(
  now: Date,
  timezone: string,
): { year: number; month: number; day: number; hour: number } {
  const values = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) =>
    Number(values.find((part) => part.type === type)?.value)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
  }
}
export function anniversaryDays(
  date: string,
  now: Date,
  timezone: string,
): number {
  const { year, month, day } = localDateParts(now, timezone)
  const parts = date.split('-').map(Number)
  const targetMonth = parts[1] ?? 1
  const targetDay = parts[2] ?? 1
  const today = Date.UTC(year, month - 1, day)
  let next = Date.UTC(year, targetMonth - 1, targetDay)
  if (next < today) next = Date.UTC(year + 1, targetMonth - 1, targetDay)
  return Math.round((next - today) / 86_400_000)
}
