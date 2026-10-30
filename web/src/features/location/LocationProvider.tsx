import { useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { blur } from '@/lib/geo'
import { shouldPublish, shouldRecord, type Fix } from '@/lib/location-policy'
import { copy } from '@/copy/en'
import { nativeTracking } from '@/native/tracker'
import { NativeLocationProvider } from './NativeLocationProvider'
import { LocationContext } from './LocationContext'
export function LocationProvider({ children }: { children: ReactNode }) {
  return nativeTracking ? (
    <NativeLocationProvider>{children}</NativeLocationProvider>
  ) : (
    <WebLocationProvider>{children}</WebLocationProvider>
  )
}
function WebLocationProvider({ children }: { children: ReactNode }) {
  const { client } = useAuth()
  const { data } = useSpace()
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const userId = data?.self.user_id,
    coupleId = data?.couple.id,
    mode = data?.self.share_mode
  useEffect(() => {
    if (!enabled || !userId || !coupleId || mode === 'paused') return
    let watcher: number | undefined,
      disposed = false,
      busy = false,
      last: Fix | null = null,
      history: Fix | null = null,
      sent = 0,
      latest: Fix | null = null
    async function publish(fix: Fix) {
      if (
        disposed ||
        busy ||
        document.hidden ||
        !shouldPublish(fix, last, Date.now(), sent)
      )
        return
      busy = true
      const point = mode === 'surprise' ? blur(fix) : fix
      try {
        const result = await client.from('live_location').upsert(
          {
            user_id: userId!,
            couple_id: coupleId!,
            lat: point.lat,
            lng: point.lng,
            accuracy_m: mode === 'surprise' ? 2000 : fix.accuracy,
            speed_mps: mode === 'surprise' ? null : fix.speed,
            heading: mode === 'surprise' ? null : fix.heading,
            fuzzed: mode === 'surprise',
            is_moving: (fix.speed ?? 0) > 0.8,
            recorded_at: new Date(fix.timestamp).toISOString(),
          },
          { onConflict: 'user_id' },
        )
        if (result.error) throw result.error
        last = fix
        sent = Date.now()
        if (
          mode === 'live' &&
          shouldRecord(fix, history) &&
          !disposed &&
          !document.hidden
        ) {
          const row = await client.from('location_history').insert({
            user_id: userId!,
            couple_id: coupleId!,
            lat: fix.lat,
            lng: fix.lng,
            accuracy_m: fix.accuracy,
            speed_mps: fix.speed,
            recorded_at: new Date(fix.timestamp).toISOString(),
          })
          if (row.error) throw row.error
          history = fix
        }
        if (!disposed) setMessage(copy.map.sharing)
      } catch {
        if (!disposed) setMessage(copy.map.uploadFailed)
      } finally {
        busy = false
      }
    }
    const clear = () => {
      if (watcher !== undefined) {
        navigator.geolocation.clearWatch(watcher)
        watcher = undefined
      }
    }
    const watch = () => {
      clear()
      if (document.hidden || disposed) return
      if (!navigator.geolocation) {
        setMessage(copy.map.unsupported)
        return
      }
      watcher = navigator.geolocation.watchPosition(
        (position) => {
          latest = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed:
              position.coords.speed !== null && position.coords.speed >= 0
                ? position.coords.speed
                : null,
            heading:
              position.coords.heading !== null &&
              Number.isFinite(position.coords.heading)
                ? position.coords.heading
                : null,
            timestamp: position.timestamp,
          }
          void publish(latest)
        },
        (error) => {
          if (!disposed)
            setMessage(error.code === 1 ? copy.map.denied : copy.map.noFix)
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
      )
    }
    const visibility = () => {
      if (document.hidden) {
        clear()
        setMessage(copy.map.hidden)
      } else watch()
    }
    document.addEventListener('visibilitychange', visibility)
    const tick = setInterval(() => {
      if (latest) void publish(latest)
    }, 15_000)
    watch()
    return () => {
      disposed = true
      clear()
      clearInterval(tick)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [enabled, userId, coupleId, mode, client])
  return (
    <LocationContext.Provider
      value={{
        enabled,
        message,
        start: () => {
          setMessage(copy.map.finding)
          setEnabled(true)
        },
        stop: () => {
          setEnabled(false)
          setMessage(copy.map.stopped)
        },
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}
