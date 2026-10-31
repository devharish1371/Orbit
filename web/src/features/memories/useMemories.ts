import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { cursorFilter, type Post } from '@/lib/posts'

export function useDailyQuestion() {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['daily-question', session?.user.id],
    enabled: !!session,
    staleTime: 30000,
    refetchInterval: 60000,
    queryFn: async () => {
      const result = await client.rpc('daily_question')
      if (result.error) throw result.error
      const value = result.data as {
        day: string
        question_idx: number
        server_now: string
      }
      if (
        !value ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value.day) ||
        !Number.isInteger(value.question_idx) ||
        value.question_idx < 0 ||
        value.question_idx >= 60
      )
        throw new Error('DAILY_UNAVAILABLE')
      return value
    },
  })
}
export function useAnswers(day?: string) {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['question-answers', session?.user.id, day],
    enabled: !!day && !!session,
    queryFn: async () => {
      const result = await client
        .from('question_answers')
        .select('*')
        .eq('day', day!)
      if (result.error) throw result.error
      return result.data
    },
  })
}
export function useCapsules() {
  const { client, session } = useAuth()
  return useInfiniteQuery({
    queryKey: ['capsules', session?.user.id],
    enabled: !!session,
    // RLS time changes do not emit a row change. Refresh while this screen is open.
    refetchInterval: 30000,
    initialPageParam: null as Pick<Post, 'id' | 'created_at'> | null,
    maxPages: 3,
    queryFn: async ({ pageParam }) => {
      let request = client
        .from('capsules')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(30)
      if (pageParam) request = request.or(cursorFilter(pageParam))
      const result = await request
      if (result.error) throw result.error
      return result.data
    },
    getNextPageParam: (page) =>
      page.length === 30 ? page[page.length - 1] : undefined,
  })
}
export function useKeptMemories(photosOnly = false) {
  const { client } = useAuth(),
    { data: space } = useSpace()
  return useInfiniteQuery({
    queryKey: ['kept-memories', space?.couple.id, photosOnly],
    enabled: !!space,
    initialPageParam: null as Pick<Post, 'id' | 'created_at'> | null,
    maxPages: 3,
    queryFn: async ({ pageParam }) => {
      let request = client
        .from('posts')
        .select('*')
        .eq('keep', true)
        .is('unsent_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(30)
      if (photosOnly) request = request.eq('kind', 'photo')
      if (pageParam) request = request.or(cursorFilter(pageParam))
      const result = await request
      if (result.error) throw result.error
      return result.data
    },
    getNextPageParam: (page) =>
      page.length === 30 ? page[page.length - 1] : undefined,
  })
}
