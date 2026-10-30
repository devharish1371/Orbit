import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { App } from '@capacitor/app'
import { nativeTracking, tracker } from './tracker'
export function useTrackingHealth() {
  const query = useQueryClient()
  const health = useQuery({
    queryKey: ['tracking-health'],
    queryFn: () => tracker.health(),
    enabled: nativeTracking,
    refetchInterval: 15000,
  })
  useEffect(() => {
    if (!nativeTracking) return
    const reconnect = () => {
      void tracker.retryMode().catch(() => {})
      void query.invalidateQueries({ queryKey: ['tracking-health'] })
    }
    window.addEventListener('online', reconnect)
    const listener = App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        reconnect()
        void query.invalidateQueries({ queryKey: ['tracking-health'] })
        void query.invalidateQueries({ queryKey: ['space'] })
      }
    })
    return () => {
      window.removeEventListener('online', reconnect)
      void listener.then((handle) => handle.remove())
    }
  }, [query])
  return health
}
