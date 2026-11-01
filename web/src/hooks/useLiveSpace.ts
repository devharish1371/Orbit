import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useSpace } from './useSpace'
export function useLiveSpace() {
  const { client } = useAuth()
  const { data: space } = useSpace()
  const id = space?.couple.id
  const query = useQueryClient()
  const [connection, setConnection] = useState<
    'connecting' | 'live' | 'reconnecting'
  >('connecting')
  const locations = useQuery({
    queryKey: ['locations', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const result = await client
        .from('live_location')
        .select('*')
        .eq('couple_id', id!)
      if (result.error) throw result.error
      return result.data
    },
  })
  const refreshRequests = useQuery({
    queryKey: ['location-refresh', id],
    enabled: Boolean(id),
    refetchInterval: 60_000,
    queryFn: async () => {
      const result = await client
        .from('location_refresh')
        .select('*')
        .eq('couple_id', id!)
      if (result.error) throw result.error
      return result.data
    },
  })
  const places = useQuery({
    queryKey: ['places', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const result = await client
        .from('places')
        .select('*')
        .eq('couple_id', id!)
        .order('created_at')
      if (result.error) throw result.error
      return result.data
    },
  })
  useEffect(() => {
    if (!id) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const dirty = new Set<string>()
    const mark = (key: string) => {
      dirty.add(key)
      timer ??= setTimeout(() => {
        timer = undefined
        for (const item of dirty)
          void query.invalidateQueries({ queryKey: [item] })
        dirty.clear()
      }, 250)
    }
    const channel = client
      .channel(`space:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_refresh',
          filter: `couple_id=eq.${id}`,
        },
        () => mark('location-refresh'),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `couple_id=eq.${id}`,
        },
        () => mark('activity'),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_location',
          filter: `couple_id=eq.${id}`,
        },
        () => mark('locations'),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `couple_id=eq.${id}`,
        },
        () => mark('space'),
      )
      // Deletes have no filterable columns under RLS; invalidation only re-reads authorized rows.
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'places' },
        () => mark('places'),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couples',
          filter: `id=eq.${id}`,
        },
        () => {
          for (const key of [
            'space',
            'posts',
            'post-reactions',
            'post-comments',
            'storage-summary',
            'expiring',
            'cleanup-status',
            'kept-memories',
            'capsules',
            'question-answers',
            'week-recap',
          ])
            mark(key)
        },
      )
      .subscribe((status) => {
        setConnection(status === 'SUBSCRIBED' ? 'live' : 'reconnecting')
        if (status === 'SUBSCRIBED') {
          mark('location-refresh')
          mark('locations')
          mark('places')
          mark('space')
          mark('activity')
          for (const key of [
            'posts',
            'post-reactions',
            'post-comments',
            'storage-summary',
            'expiring',
            'cleanup-status',
            'kept-memories',
            'capsules',
            'question-answers',
            'week-recap',
          ])
            mark(key)
        }
      })
    const refresh = () => {
      if (!document.hidden) {
        mark('location-refresh')
        mark('locations')
        mark('places')
        mark('space')
        mark('activity')
        for (const key of [
          'posts',
          'post-reactions',
          'post-comments',
          'storage-summary',
          'expiring',
          'cleanup-status',
          'kept-memories',
          'capsules',
          'question-answers',
          'week-recap',
        ])
          mark(key)
      }
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('orbit-activity', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('orbit-activity', refresh)
      void client.removeChannel(channel)
    }
  }, [client, id, query])
  return { locations, places, refreshRequests, connection }
}
