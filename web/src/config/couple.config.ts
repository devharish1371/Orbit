export interface OrbitConfig {
  readonly appName: string
  readonly timezone: string
  readonly anniversary: string | null
  readonly meetUrl: string | null
  readonly retentionDays: number
  readonly keepsakeQuotaMB: number
  readonly quietHours: { readonly start: string; readonly end: string }
  readonly theme: {
    readonly primary: string
    readonly secondary: string
    readonly accent: string
  }
  readonly mapStyleUrl: string
  readonly mapStyleDarkUrl: string
}
export const couple: OrbitConfig = {
  appName: 'Orbit',
  timezone: 'Asia/Kolkata',
  anniversary: null as string | null,
  meetUrl: null as string | null,
  retentionDays: 7,
  keepsakeQuotaMB: 300,
  quietHours: { start: '23:00', end: '07:00' },
  theme: { primary: '#FF6B8A', secondary: '#7C5CFF', accent: '#3DE0C5' },
  mapStyleUrl: 'https://tiles.openfreemap.org/styles/liberty',
  mapStyleDarkUrl: 'https://tiles.openfreemap.org/styles/fiord',
} as const

export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function validMeetUrl(value: string): boolean {
  return /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(value)
}
export function validateConfig(config: typeof couple): void {
  new Intl.DateTimeFormat('en', { timeZone: config.timezone })
  if (config.anniversary && !validDate(config.anniversary))
    throw new Error('Invalid anniversary date')
  if (config.meetUrl && !validMeetUrl(config.meetUrl))
    throw new Error('Invalid Google Meet link')
  if (config.retentionDays < 1 || config.retentionDays > 30)
    throw new Error('Invalid retention')
  for (const color of Object.values(config.theme))
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Invalid theme color')
}
validateConfig(couple)
