import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { surface, nativeSurfaceSupported } from '@/native/surface'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
export function useWidget() {
  const { data: space } = useSpace(),
    { session } = useAuth()
  return useQuery({
    queryKey: ['widget', session?.user.id, space?.couple.id],
    enabled: nativeSurfaceSupported && !!space && !!session,
    queryFn: () =>
      surface.widgetStatus({
        owner: space!.self.user_id,
        couple: space!.couple.id,
      }),
    refetchOnWindowFocus: true,
  })
}
export function WidgetSync() {
  const query = useQueryClient()
  const { data: space } = useSpace(),
    { session } = useAuth()
  const owner = session?.user.id,
    couple = space?.couple.id,
    revision = space?.couple.social_revision
  useEffect(() => {
    if (!nativeSurfaceSupported || !owner || !couple) return
    let active = true
    const refresh = () => {
      if (active && !document.hidden)
        void surface
          .widgetRefresh({ owner, couple })
          .then((value) => {
            if (active) query.setQueryData(['widget', owner, couple], value)
          })
          .catch(() => {})
    }
    refresh()
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [owner, couple, revision, query])
  return null
}
