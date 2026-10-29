import {
  createClient,
  type SupabaseClient,
  type SupportedStorage,
} from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import type { Database } from './database.types'
import { isPublicKey } from './public-config'

export type OrbitClient = SupabaseClient<Database>
const nativeStorage: SupportedStorage = {
  async getItem(key) {
    return (await Preferences.get({ key })).value
  },
  async setItem(key, value) {
    await Preferences.set({ key, value })
  },
  async removeItem(key) {
    await Preferences.remove({ key })
  },
}
let instance: OrbitClient | undefined
export function getClient(): OrbitClient {
  if (!instance) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!url || !key || url.includes('<') || !isPublicKey(key))
      throw new Error('Public client configuration is missing or invalid')
    instance = createClient<Database>(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        ...(Capacitor.isNativePlatform() ? { storage: nativeStorage } : {}),
      },
    })
  }
  return instance
}
