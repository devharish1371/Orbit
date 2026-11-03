import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { sharePost, type PostDraft } from '@/lib/posts'
import { TextOutbox } from './engine'
import { OutboxContext } from './OutboxContext'
import { outboxStore } from './store'
import type { PendingText } from './model'
export function OutboxProvider({ children }: { children: ReactNode }) {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const owner = session?.user.id,
    couple = space?.couple.id
  const [items, setItems] = useState<PendingText[]>([]),
    [sendingId, setSendingId] = useState<string | null>(null)
  const engineRef = useRef<TextOutbox | null>(null)
  const [generation, setGeneration] = useState(0)
  useEffect(() => {
    const restart = () => setGeneration((value) => value + 1)
    window.addEventListener('orbit-signout-failed', restart)
    return () => window.removeEventListener('orbit-signout-failed', restart)
  }, [])
  useEffect(() => {
    if (!owner || !couple) return
    let active = true,
      refreshSequence = 0
    const current = { owner, couple }
    const refresh = () => {
      if (!active) return
      const sequence = ++refreshSequence
      void engine
        .list()
        .then((rows) => {
          if (active && sequence === refreshSequence) {
            setItems(rows)
            setSendingId(engine.sendingId)
          }
        })
        .catch(() => {})
    }
    const engine = new TextOutbox(
      outboxStore,
      current,
      async (draft, signal) => {
        await sharePost(client, draft, signal)
        if (active)
          for (const key of [
            'posts',
            'reply-posts',
            'storage-summary',
            'expiring',
          ])
            void query.invalidateQueries({ queryKey: [key] })
      },
      () => navigator.onLine && !document.hidden,
      () => (active ? current : null),
      refresh,
    )
    engineRef.current = engine
    const resume = () => {
      refresh()
      void engine.flush().catch(() => {})
    }
    const stop = () => {
      active = false
      engine.stop()
    }
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    window.addEventListener('orbit-signing-out', stop)
    const prune = setInterval(refresh, 30000)
    resume()
    return () => {
      stop()
      engineRef.current = null
      clearInterval(prune)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
      window.removeEventListener('orbit-signing-out', stop)
    }
  }, [client, owner, couple, query, generation])
  const enqueue = useCallback(async (draft: PostDraft) => {
    if (!engineRef.current) throw new Error('OUTBOX_UNAVAILABLE')
    await engineRef.current.enqueue(draft)
    void engineRef.current.flush().catch(() => {})
  }, [])
  return (
    <OutboxContext.Provider
      value={{
        items: items.filter(
          (item) => item.owner === owner && item.couple === couple,
        ),
        sendingId: items.some(
          (item) =>
            item.id === sendingId &&
            item.owner === owner &&
            item.couple === couple,
        )
          ? sendingId
          : null,
        enqueue,
        retry: (id) => {
          void engineRef.current?.flush(id).catch(() => {})
        },
        discard: async (id) => {
          if (!engineRef.current) throw new Error('OUTBOX_UNAVAILABLE')
          await engineRef.current.discard(id)
        },
      }}
    >
      {children}
    </OutboxContext.Provider>
  )
}
