import { appearanceSnapshot } from '@/hooks/useTheme'
import { comfortSnapshot } from '@/hooks/useComfort'
import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from '@capacitor/core'
export type WidgetKind = 'private' | 'photo' | 'plan'
export interface WidgetState {
  kind: WidgetKind
  id: string | null
  installed: number
  pinSupported: boolean
  covered: boolean
  checkedAt: number
  reason?: 'privacy' | 'refresh' | null
}
export interface WidgetIdentity {
  owner: string
  couple: string
}
interface SurfacePlugin {
  ticket(): Promise<{ ticket: string }>
  ready(options: { ticket: string }): Promise<void>
  appearance(options: {
    theme: string
    accent: string
    text: string
    reduced: boolean
  }): Promise<void>
  widgetTarget(): Promise<{ route?: string | null }>
  addListener(
    event: 'widgetOpen',
    callback: () => void,
  ): Promise<PluginListenerHandle>
  widgetStatus(options: WidgetIdentity): Promise<WidgetState>
  widgetSelect(
    options: WidgetIdentity & {
      kind: WidgetKind
      id?: string
      version?: number
    },
  ): Promise<WidgetState>
  widgetRefresh(options: WidgetIdentity): Promise<WidgetState>
  widgetPin(): Promise<{ requested: boolean }>
}
const bridge = registerPlugin<SurfacePlugin>('OrbitSurface')
export const nativeSurfaceSupported =
  Capacitor.getPlatform() === 'android' &&
  Boolean(Capacitor.isPluginAvailable?.('OrbitSurface'))

export function surfaceAppearance() {
  return { ...appearanceSnapshot(), ...comfortSnapshot() }
}

export function widgetState(value: unknown): WidgetState {
  if (!value || typeof value !== 'object') throw new Error('WIDGET_UNAVAILABLE')
  const r = value as Record<string, unknown>
  const kind = r.kind,
    id = r.id ?? null,
    reason = r.reason ?? null
  if (
    typeof kind !== 'string' ||
    !['private', 'photo', 'plan'].includes(kind) ||
    (id !== null &&
      (typeof id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          id,
        ))) ||
    (kind !== 'private' && id === null) ||
    !Number.isSafeInteger(r.installed) ||
    Number(r.installed) < 0 ||
    typeof r.pinSupported !== 'boolean' ||
    typeof r.covered !== 'boolean' ||
    !Number.isSafeInteger(r.checkedAt) ||
    Number(r.checkedAt) < 0 ||
    !['privacy', 'refresh', null].includes(reason as string | null)
  )
    throw new Error('WIDGET_UNAVAILABLE')
  return {
    kind: kind as WidgetKind,
    id: id as string | null,
    installed: Number(r.installed),
    pinSupported: r.pinSupported,
    covered: r.covered,
    checkedAt: Number(r.checkedAt),
    reason: reason as WidgetState['reason'],
  }
}
export const surface = {
  ticket: () => bridge.ticket(),
  ready: (options: { ticket: string }) => bridge.ready(options),
  appearance: (options: Parameters<SurfacePlugin['appearance']>[0]) =>
    bridge.appearance(options),
  widgetTarget: () => bridge.widgetTarget(),
  addListener: (event: 'widgetOpen', callback: () => void) =>
    bridge.addListener(event, callback),
  widgetStatus: async (options: WidgetIdentity) =>
    widgetState(await bridge.widgetStatus(options)),
  widgetSelect: async (options: Parameters<SurfacePlugin['widgetSelect']>[0]) =>
    widgetState(await bridge.widgetSelect(options)),
  widgetRefresh: async (options: WidgetIdentity) =>
    widgetState(await bridge.widgetRefresh(options)),
  widgetPin: () => bridge.widgetPin(),
}
