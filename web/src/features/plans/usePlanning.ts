import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
export function usePlans() {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['plans', session?.user.id],
    enabled: !!session,
    refetchInterval: 60000,
    queryFn: async () => {
      const result = await client
        .from('plans')
        .select('*')
        .gte('starts_at', new Date(Date.now() - 30 * 86400000).toISOString())
        .order('starts_at', { ascending: false })
        .limit(200)
      if (result.error) throw result.error
      return result.data
    },
  })
}
export function useIdeas(archived = false) {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['date-ideas', session?.user.id, archived],
    enabled: !!session,
    queryFn: async () => {
      const result = await client
        .from('date_ideas')
        .select('*')
        .eq('archived', archived)
        .order('created_at', { ascending: false })
        .limit(500)
      if (result.error) throw result.error
      return result.data
    },
  })
}
export function usePlanReminders() {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['plan-reminders', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const result = await client.from('plan_reminders').select('*')
      if (result.error) throw result.error
      return result.data
    },
  })
}
