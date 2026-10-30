import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { nativeAuthStorage, nativeAuthFetch } from '@/native/auth-storage'
import type { Database } from './database.types'
import { isPublicKey } from './public-config'

export type OrbitClient = SupabaseClient<Database>
let instance: OrbitClient | undefined
export function getClient(): OrbitClient {
  if (!instance) {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!url || !key || url.includes('<') || !isPublicKey(key))
      throw new Error('Public client configuration is missing or invalid')
    instance = createClient<Database>(url, key, {
      ...(Capacitor.isNativePlatform()
        ? { global: { fetch: nativeAuthFetch } }
        : {}),
      auth: {
        persistSession: true,
        autoRefreshToken: !Capacitor.isNativePlatform(),
        detectSessionInUrl: false,
        ...(Capacitor.isNativePlatform()
          ? { storage: nativeAuthStorage(url, key) }
          : {}),
      },
    })
  }
  return instance
}
