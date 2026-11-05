import { Capacitor, registerPlugin } from '@capacitor/core'
export interface SpeedState {
  supported: boolean
  enabled: boolean
  threshold: number
  running: boolean
  notifications: boolean
  pendingId: string | null
  pendingAt: number
}
interface SafetyPlugin {
  status(options: { owner: string }): Promise<SpeedState>
  configure(options: {
    owner: string
    enabled: boolean
    threshold: number
  }): Promise<SpeedState>
  dismiss(options: { owner: string; id: string }): Promise<SpeedState>
}
export const speedSupported =
  Capacitor.getPlatform() === 'android' &&
  Boolean(Capacitor.isPluginAvailable?.('OrbitSafety'))
export const safety = registerPlugin<SafetyPlugin>('OrbitSafety')
