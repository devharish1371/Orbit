import { Capacitor, registerPlugin } from '@capacitor/core'
export interface TrackingHealth {
  services: boolean
  issue?: string
  native: boolean
  location: boolean
  background: boolean
  notifications: boolean
  battery: boolean
  enabled: boolean
  running: boolean
  lastUpload: number
  lastFix: number
  mode: string
  pendingMode: boolean
  auth: boolean
  rebooted: boolean
  manufacturer: string
  model: string
  os: string
  queue: number
}
export interface Diagnostic {
  at: number
  code: string
}
export interface TrackingPlugin {
  pushConfiguration(): Promise<{ configured: boolean }>
  configure(options: { url: string; publicKey: string }): Promise<void>
  getAuth(): Promise<{ value: string | null }>
  setAuth(options: { value: string }): Promise<void>
  clearAuth(): Promise<void>
  refreshAuth(): Promise<{ status: number; data: unknown }>
  retryMode(): Promise<void>
  health(): Promise<TrackingHealth>
  diagnostics(): Promise<{ entries: Diagnostic[] }>
  start(): Promise<void>
  mode(options: {
    mode: 'live' | 'paused' | 'surprise'
    until?: string
  }): Promise<void>
  requestLocation(): Promise<void>
  requestBackground(): Promise<void>
  requestNotifications(): Promise<void>
  requestIgnore(): Promise<void>
  openDeviceLocation(): Promise<void>
  openAppSettings(): Promise<void>
}
export const nativeTracking = Capacitor.getPlatform() === 'android'
export const tracker = registerPlugin<TrackingPlugin>('OrbitTracking')
export function trackingReady(health: TrackingHealth): boolean {
  return (
    health.services &&
    health.location &&
    health.background &&
    health.notifications &&
    health.battery &&
    health.auth
  )
}
