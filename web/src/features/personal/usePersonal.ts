import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { localDay } from '@/lib/memories'
import type { Post } from '@/lib/posts'
export function useStatuses() {
  const { client, session } = useAuth(),
    { data: space } = useSpace()
  return useQuery({
    queryKey: ['member-status', session?.user.id, space?.couple.id],
    enabled: !!session && !!space,
    refetchInterval: 30000,
    queryFn: async () => {
      const result = await client.from('member_status').select('*')
      if (result.error) throw result.error
      return result.data
    },
  })
}
export function useOnThisDay() {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    now = useNow()
  const day = localDay(new Date(now), space?.couple.timezone ?? 'UTC')
  return useInfiniteQuery({
    queryKey: ['on-this-day', session?.user.id, space?.couple.id, day],
    enabled: !!session && !!space,
    refetchInterval: 60000,
    initialPageParam: null as Pick<Post, 'id' | 'created_at'> | null,
    maxPages: 3,
    queryFn: async ({ pageParam }) => {
      const result = await client.rpc(
        'on_this_day_keepsakes',
        pageParam
          ? {
              p_before_created: pageParam.created_at,
              p_before_id: pageParam.id,
            }
          : {},
      )
      if (result.error) throw result.error
      return result.data
    },
    getNextPageParam: (page) =>
      page.length === 30 ? page[page.length - 1] : undefined,
  })
}
