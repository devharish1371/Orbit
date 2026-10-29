import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { OrbitClient } from '@/lib/supabase'
export interface AuthValue {
  client: OrbitClient
  session: Session | null
  restoring: boolean
  restoreError: boolean
  retryRestore(): Promise<void>
  signOut(): Promise<void>
}
export const AuthContext = createContext<AuthValue | null>(null)
