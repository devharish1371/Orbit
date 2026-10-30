import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
export function useTyping(enabled: boolean) {
  const { client } = useAuth(),
    { data: space } = useSpace()
  const room = useRef<RealtimeChannel | null>(null),
    last = useRef(0),
    idle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [typing, setTyping] = useState(false)
  const id = space?.couple.id,
    self = space?.self.user_id,
    partner = space?.partner?.user_id
  useEffect(() => {
    if (!enabled || !id || !self) return
    let expiry: ReturnType<typeof setTimeout> | undefined,
      ready = false,
      active = true
    const channel = client.channel(`chat:${id}`, {
      config: { private: true, presence: { key: self } },
    })
    room.current = channel
    channel.on('presence', { event: 'sync' }, () => {
      const values = partner
        ? (channel.presenceState<{ typing?: boolean }>()[partner] ?? [])
        : []
      const active = values.some((value) => value.typing === true)
      clearTimeout(expiry)
      setTyping(active)
      if (active) expiry = setTimeout(() => setTyping(false), 6000)
    })
    void client.realtime
      .setAuth()
      .then(() => {
        if (active)
          channel.subscribe((status) => {
            ready = status === 'SUBSCRIBED'
          })
      })
      .catch(() => {})
    const hidden = () => {
      if (document.hidden && ready) void channel.untrack()
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      active = false
      clearTimeout(expiry)
      clearTimeout(idle.current)
      document.removeEventListener('visibilitychange', hidden)
      room.current = null
      void client.removeChannel(channel)
    }
  }, [client, enabled, id, self, partner])
  const changed = useCallback(() => {
    if (!enabled || !room.current || document.hidden) return
    if (Date.now() - last.current >= 2000) {
      last.current = Date.now()
      void room.current.track({ typing: true })
    }
    clearTimeout(idle.current)
    idle.current = setTimeout(() => {
      void room.current?.untrack()
    }, 2500)
  }, [enabled])
  const stopped = useCallback(() => {
    clearTimeout(idle.current)
    void room.current?.untrack()
  }, [])
  return { typing, changed, stopped }
}
