import { Preferences } from '@capacitor/preferences'
import type { SupportedStorage } from '@supabase/supabase-js'
import { tracker } from './tracker'
export function nativeAuthStorage(
  url: string,
  publicKey: string,
): SupportedStorage {
  const sessionKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
  let configured: Promise<void> | undefined
  const ready = () =>
    (configured ??= tracker
      .configure({ url: url.replace(/\/$/, ''), publicKey })
      .catch((error) => {
        configured = undefined
        throw error
      }))
  return {
    async getItem(key) {
      if (key !== sessionKey) return (await Preferences.get({ key })).value
      await ready()
      const saved = (await tracker.getAuth()).value
      if (saved) return saved
      // Preserve the M3 login when upgrading to encrypted native session storage.
      const legacy = (await Preferences.get({ key })).value
      if (legacy) {
        await tracker.setAuth({ value: legacy })
        await Preferences.remove({ key })
      }
      return legacy
    },
    async setItem(key, value) {
      if (key !== sessionKey) {
        await Preferences.set({ key, value })
        return
      }
      await ready()
      await tracker.setAuth({ value })
      await Preferences.remove({ key })
    },
    async removeItem(key) {
      if (key === sessionKey) {
        await ready()
        await tracker.clearAuth()
      }
      await Preferences.remove({ key })
    },
  }
}
export const nativeAuthFetch: typeof fetch = async (input, init) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url
  if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
    const reply = await tracker.refreshAuth()
    return new Response(JSON.stringify(reply.data), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return fetch(input, init)
}
