import { afterEach, expect, test, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  configure: vi.fn().mockResolvedValue(undefined),
  getAuth: vi.fn(),
  setAuth: vi.fn().mockResolvedValue(undefined),
  clearAuth: vi.fn().mockResolvedValue(undefined),
  refreshAuth: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('./tracker', () => ({ tracker: mocks }))
vi.mock('@capacitor/preferences', () => ({ Preferences: mocks }))
import { nativeAuthStorage, nativeAuthFetch } from './auth-storage'
afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
test('upgrades an existing native login to encrypted storage without requiring a new code', async () => {
  mocks.getAuth.mockResolvedValue({ value: null })
  mocks.get.mockResolvedValue({ value: 'saved-session' })
  const storage = nativeAuthStorage(
    'https://fixture.supabase.co',
    'sb_publishable_fixture',
  )
  expect(await storage.getItem('sb-fixture-auth-token')).toBe('saved-session')
  expect(mocks.setAuth).toHaveBeenCalledWith({ value: 'saved-session' })
  expect(mocks.remove).toHaveBeenCalledWith({ key: 'sb-fixture-auth-token' })
  await storage.removeItem('sb-fixture-auth-token')
  expect(mocks.clearAuth).toHaveBeenCalledTimes(1)
})
test('native refresh uses one refresh owner and leaves regular web requests alone', async () => {
  mocks.refreshAuth.mockResolvedValue({
    status: 503,
    data: { message: 'offline' },
  })
  const fetcher = vi.fn().mockResolvedValue(new Response('{}'))
  vi.stubGlobal('fetch', fetcher)
  const result = await nativeAuthFetch(
    'https://fixture.supabase.co/auth/v1/token?grant_type=refresh_token',
    { method: 'POST' },
  )
  expect(result.status).toBe(503)
  expect(fetcher).not.toHaveBeenCalled()
  await nativeAuthFetch('https://fixture.supabase.co/rest/v1/members')
  expect(fetcher).toHaveBeenCalledTimes(1)
})
