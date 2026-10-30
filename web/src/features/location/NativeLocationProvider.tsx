import { useEffect, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { tracker, trackingReady } from '@/native/tracker'
import { useTrackingHealth } from '@/native/useTrackingHealth'
import { copy } from '@/copy/en'
import { LocationContext } from './LocationContext'
export function NativeLocationProvider({ children }: { children: ReactNode }) {
  const query = useQueryClient(),
    navigate = useNavigate(),
    health = useTrackingHealth()
  const enabled = Boolean(health.data?.enabled),
    running = Boolean(health.data?.running),
    ready = health.data ? trackingReady(health.data) : false
  useEffect(() => {
    if (enabled && !running && ready)
      void tracker
        .start()
        .then(() => query.invalidateQueries({ queryKey: ['tracking-health'] }))
        .catch(() => {})
  }, [enabled, running, ready, query])
  return (
    <LocationContext.Provider
      value={{
        enabled,
        message: running ? copy.tracking.active : copy.tracking.inactive,
        start: () => navigate('/tracking'),
        stop: () => navigate('/tracking'),
      }}
    >
      {enabled && (!ready || !running || health.data?.pendingMode) && (
        <Link className="tracking-banner" to="/tracking">
          {copy.tracking.degraded} ↗
        </Link>
      )}
      {children}
    </LocationContext.Provider>
  )
}
