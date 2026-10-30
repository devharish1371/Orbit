import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { Preferences } from '@capacitor/preferences'
import { App } from '@capacitor/app'
import type { OrbitClient } from '@/lib/supabase'
import { tracker } from './tracker'

export type PushState =
  'web' | 'unavailable' | 'off' | 'blocked' | 'registering' | 'ready' | 'error'
export function notificationRoute(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const route = (data as Record<string, unknown>).route
  return typeof route === 'string' &&
    ['/', '/map', '/activity', '/call', '/moments', '/chat', '/us'].includes(
      route,
    )
    ? route
    : null
}
interface PushSession {
  enable(): Promise<void>
  disable(): Promise<void>
  dispose(): void
}
let activeSession: PushSession | undefined
export async function disablePush() {
  await activeSession?.disable()
}

export function startPush(
  client: OrbitClient,
  user: string,
  state: (state: PushState) => void,
  navigate: (route: string) => void,
): PushSession {
  let disposed = false,
    enabled = false,
    configured = false,
    token: string | undefined
  const handles: PluginListenerHandle[] = []
  let pending = Promise.resolve()
  const update = (value: PushState) => {
    if (!disposed) state(value)
  }
  const remember = (handle: PluginListenerHandle) => {
    if (disposed) void handle.remove()
    else handles.push(handle)
  }
  function registerToken(value: string) {
    pending = pending.then(async () => {
      if (!enabled || disposed) return
      token = value
      try {
        const result = await client.from('device_tokens').upsert(
          {
            token: value,
            user_id: user,
            platform: 'android',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' },
        )
        if (result.error) throw result.error
        await Preferences.set({ key: 'orbit-push-token', value })
        update('ready')
      } catch {
        update('error')
      }
    })
  }
  async function register() {
    if (!enabled || disposed || !configured) return
    try {
      const permission = await PushNotifications.checkPermissions()
      if (permission.receive !== 'granted') {
        update('blocked')
        return
      }
      update('registering')
      await PushNotifications.register()
    } catch {
      update('error')
    }
  }
  const ready = (async () => {
    if (Capacitor.getPlatform() !== 'android') {
      update('web')
      return
    }
    try {
      configured = (await tracker.pushConfiguration()).configured
      if (disposed) return
      if (!configured) {
        update('unavailable')
        return
      }
      remember(
        await PushNotifications.addListener('registration', (data) => {
          registerToken(data.value)
        }),
      )
      remember(
        await PushNotifications.addListener('registrationError', () =>
          update('error'),
        ),
      )
      remember(
        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            const route = notificationRoute(action.notification.data as unknown)
            if (!disposed && route) navigate(route)
          },
        ),
      )
      remember(
        await PushNotifications.addListener('pushNotificationReceived', () => {
          window.dispatchEvent(new Event('orbit-activity'))
        }),
      )
      remember(
        await App.addListener('appStateChange', (result) => {
          if (result.isActive) void register()
        }),
      )
      const opted = await Preferences.get({ key: 'orbit-push-user' })
      if (disposed) return
      enabled = opted.value === user
      if (enabled) await register()
      else update('off')
    } catch {
      update('error')
    }
  })()
  const online = () => {
    void register()
  }
  window.addEventListener('online', online)
  const session: PushSession = {
    async enable() {
      await ready
      if (disposed || !configured) return
      try {
        const permission = await PushNotifications.requestPermissions()
        if (permission.receive !== 'granted') {
          update('blocked')
          return
        }
        for (const channel of [
          {
            id: 'alerts',
            name: 'Care and location',
            importance: 4 as const,
            vibration: true,
          },
          {
            id: 'social',
            name: 'Moments and messages',
            importance: 3 as const,
            vibration: true,
          },
          {
            id: 'quiet',
            name: 'Quiet updates',
            importance: 2 as const,
            vibration: false,
          },
        ])
          await PushNotifications.createChannel({ ...channel, visibility: 0 })
        enabled = true
        await Preferences.set({ key: 'orbit-push-user', value: user })
        await register()
      } catch {
        update('error')
      }
    },
    async disable() {
      if (Capacitor.getPlatform() !== 'android') return
      enabled = false
      await pending
      const saved =
        token ?? (await Preferences.get({ key: 'orbit-push-token' })).value
      try {
        if (saved) {
          const result = await client
            .from('device_tokens')
            .delete()
            .eq('token', saved)
            .eq('user_id', user)
          if (result.error) throw result.error
        }
        if (configured) await PushNotifications.unregister()
        await Preferences.remove({ key: 'orbit-push-user' })
        await Preferences.remove({ key: 'orbit-push-token' })
        update('off')
      } catch {
        update('error')
        throw new Error('PUSH_DISABLE_UNAVAILABLE')
      }
    },
    dispose() {
      disposed = true
      enabled = false
      window.removeEventListener('online', online)
      for (const handle of handles) void handle.remove()
      if (activeSession === session) activeSession = undefined
    },
  }
  activeSession = session
  return session
}
