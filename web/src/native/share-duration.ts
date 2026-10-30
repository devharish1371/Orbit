export type Duration = 'hour' | 'fourHours' | 'tomorrow' | 'indefinite'
export function modeUntil(
  duration: Duration,
  now: Date,
  timezone: string,
): string | undefined {
  if (duration === 'indefinite') return undefined
  if (duration === 'hour' || duration === 'fourHours')
    return new Date(
      now.getTime() + (duration === 'hour' ? 1 : 4) * 3600000,
    ).toISOString()
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const values = (date: Date) => {
    const parts = format.formatToParts(date)
    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value)
    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
      second: get('second'),
    }
  }
  const today = values(now),
    target = Date.UTC(today.year, today.month - 1, today.day + 1)
  let candidate = target
  for (let i = 0; i < 3; i++) {
    const p = values(new Date(candidate))
    const represented = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    )
    candidate += target - represented
  }
  return new Date(candidate).toISOString()
}
