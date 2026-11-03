import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from './AuthContext'
import { getClient, type OrbitClient } from '@/lib/supabase'
import { disablePush } from '@/native/push'
import { outboxStore } from '@/features/outbox/store'

export function AuthProvider({
  children,
  client = getClient(),
}: {
  children: ReactNode
  client?: OrbitClient
}) {
  const [session, setSession] = useState<Session | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [restoreError, setRestoreError] = useState(false)
  const query = useQueryClient()
  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const { data: result, error } = await client.auth.getSession()
        if (!active) return
        if (
          error &&
          (error.name === 'AuthRetryableFetchError' ||
            (error.status ?? 0) >= 500)
        )
          setRestoreError(true)
        else {
          setSession(result.session)
          setRestoreError(false)
        }
      } catch {
        if (active) setRestoreError(true)
      } finally {
        if (active) setRestoring(false)
      }
    }
    const { data } = client.auth.onAuthStateChange((event, next) => {
      if (!active) return
      setSession(next)
      if (event !== 'INITIAL_SESSION') setRestoring(false)
      if (next || event === 'SIGNED_OUT') setRestoreError(false)
      if (event === 'SIGNED_OUT') {
        window.dispatchEvent(new Event('orbit-signing-out'))
        void outboxStore.clearAll().catch(() => {})
        query.clear()
      }
    })
    void restore()
    window.addEventListener('online', restore)
    return () => {
      active = false
      data.subscription.unsubscribe()
      window.removeEventListener('online', restore)
    }
  }, [client, query])
  const value = useMemo(
    () => ({
      client,
      session,
      restoring,
      restoreError,
      async retryRestore() {
        setRestoring(true)
        try {
          const { data, error } = await client.auth.getSession()
          if (error) {
            setRestoreError(true)
            return
          }
          setSession(data.session)
          setRestoreError(false)
        } catch {
          setRestoreError(true)
        } finally {
          setRestoring(false)
        }
      },
      async signOut() {
        window.dispatchEvent(new Event('orbit-signing-out'))
        try {
          await outboxStore.clearAll()
          await disablePush()
          const result = await client.auth.signOut({ scope: 'local' })
          if (result?.error) throw result.error
          query.clear()
          setSession(null)
          setRestoreError(false)
        } catch (error) {
          window.dispatchEvent(new Event('orbit-signout-failed'))
          throw error
        }
      },
    }),
    [client, session, restoring, restoreError, query],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
