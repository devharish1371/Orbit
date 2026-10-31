import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { cursorFilter, type Channel, type Post } from '@/lib/posts'
export function usePosts(
  channel: Channel,
  kept = false,
  kind = 'all',
  search = '',
) {
  const { client } = useAuth(),
    { data: space } = useSpace()
  return useInfiniteQuery({
    queryKey: ['posts', space?.couple.id, channel, kept, kind, search],
    enabled: !!space,
    initialPageParam: null as Pick<Post, 'id' | 'created_at'> | null,
    maxPages: 3,
    queryFn: async ({ pageParam }) => {
      let query = client
        .from('posts')
        .select('*')
        .eq('couple_id', space!.couple.id)
        .eq('channel', channel)
        .is('unsent_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(30)
      if (kind !== 'all') query = query.eq('kind', kind)
      if (search.trim())
        query = query.ilike(
          'body',
          `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`,
        )
      if (kept) query = query.eq('keep', true)
      if (pageParam) query = query.or(cursorFilter(pageParam))
      const result = await query
      if (result.error) throw result.error
      return result.data
    },
    getNextPageParam: (page) =>
      page.length === 30 ? page[page.length - 1] : undefined,
  })
}
export function useSignedMedia(path: string | null, enabled = true) {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['signed-media', session?.user.id, path],
    enabled: !!path && enabled,
    staleTime: 50 * 60000,
    gcTime: 55 * 60000,
    queryFn: async () => {
      const result = await client.storage
        .from('media')
        .createSignedUrl(path!, 3600)
      if (result.error) throw result.error
      return result.data.signedUrl
    },
  })
}
export function usePostReactions(ids: string[]) {
  const { client } = useAuth()
  return useQuery({
    queryKey: ['post-reactions', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const result = await client
        .from('reactions')
        .select('*')
        .in('post_id', ids)
      if (result.error) throw result.error
      return result.data
    },
  })
}
export interface StorageUsage {
  total_bytes: number
  kept_bytes: number
  quota_bytes: number
  files: number
  expiring_soon: number
}
export function useStorageUsage() {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['storage-summary', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const result = await client.rpc('storage_summary')
      if (result.error) throw result.error
      const value = result.data as unknown
      if (
        !value ||
        typeof value !== 'object' ||
        [
          'total_bytes',
          'kept_bytes',
          'quota_bytes',
          'files',
          'expiring_soon',
        ].some(
          (key) =>
            typeof (value as Record<string, unknown>)[key] !== 'number' ||
            !Number.isFinite((value as Record<string, number>)[key]),
        )
      )
        throw new Error('STORAGE_SUMMARY_UNAVAILABLE')
      return value as StorageUsage
    },
  })
}
