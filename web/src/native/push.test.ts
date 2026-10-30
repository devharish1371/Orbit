import { expect, test, vi } from 'vitest'
import type { OrbitClient } from '@/lib/supabase'
import { notificationRoute, startPush } from './push'
const f = vi.hoisted(() => ({
  listeners: new Map<string, (data: unknown) => void>(),
  prefs: new Map<string, string>(),
  remove: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn().mockResolvedValue(undefined),
  permissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android' },
  registerPlugin: () => ({}),
}))
vi.mock('./tracker', () => ({
  tracker: { pushConfiguration: async () => ({ configured: true }) },
}))
vi.mock('@capacitor/app', () => ({
  App: { addListener: async () => ({ remove: f.remove }) },
}))
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({
      value: f.prefs.get(key) ?? null,
    }),
    set: async ({ key, value }: { key: string; value: string }) => {
      f.prefs.set(key, value)
    },
    remove: async ({ key }: { key: string }) => {
      f.prefs.delete(key)
    },
  },
}))
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: f.permissions,
    requestPermissions: f.permissions,
    createChannel: async () => {},
    register: f.register,
    unregister: f.unregister,
    addListener: async (name: string, callback: (data: unknown) => void) => {
      f.listeners.set(name, callback)
      return { remove: f.remove }
    },
  },
}))
test('only allowlisted internal routes can be opened by a push payload', () => {
  expect(notificationRoute({ route: '/map' })).toBe('/map')
  for (const value of [
    null,
    {},
    { route: 'https://evil.example' },
    { route: '//evil.example' },
    { route: '/map?token=private' },
    { route: '/settings' },
  ])
    expect(notificationRoute(value)).toBeNull()
})
test('opt-in registers this user, retries token persistence, and logout removes only this device', async () => {
  f.prefs.clear()
  f.listeners.clear()
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const eq = vi.fn()
  eq.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const remove = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ upsert, delete: remove }))
  const states: string[] = []
  const navigate = vi.fn()
  const session = startPush(
    { from } as unknown as OrbitClient,
    'user-a',
    (state) => states.push(state),
    navigate,
  )
  try {
    await session.enable()
    expect(f.prefs.get('orbit-push-user')).toBe('user-a')
    f.listeners.get('registration')?.({ value: 'test-token' })
    await vi.waitFor(() => expect(states).toContain('ready'))
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-a', token: 'test-token' }),
      { onConflict: 'token' },
    )
    f.listeners.get('pushNotificationActionPerformed')?.({
      notification: { data: { route: '/call' } },
    })
    expect(navigate).toHaveBeenCalledWith('/call')
    await session.disable()
    expect(eq).toHaveBeenCalledWith('token', 'test-token')
    expect(f.unregister).toHaveBeenCalled()
    expect(f.prefs.has('orbit-push-user')).toBe(false)
    f.listeners.get('registration')?.({ value: 'late-token' })
    await Promise.resolve()
    expect(upsert).toHaveBeenCalledTimes(1)
  } finally {
    session.dispose()
  }
})
test('denied permissions do not store a token or opt in the device', async () => {
  f.prefs.clear()
  f.permissions.mockResolvedValueOnce({ receive: 'denied' })
  const states: string[] = []
  const session = startPush(
    {} as OrbitClient,
    'user-b',
    (state) => states.push(state),
    () => {},
  )
  try {
    await session.enable()
    expect(states).toContain('blocked')
    expect(f.prefs.has('orbit-push-user')).toBe(false)
  } finally {
    session.dispose()
  }
})
