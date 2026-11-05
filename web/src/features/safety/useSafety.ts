import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
export function useJourneys() {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['safety-journeys', session?.user.id],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const result = await client
        .from('safety_journeys')
        .select('*')
        .gte('deadline', new Date(Date.now() - 86400000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50)
      if (result.error) throw result.error
      return result.data
    },
  })
}
export const deliveryLabels: Record<string, string> = {
  private: 'Private timer',
  not_due: 'Shared timer',
  not_queued: 'Reminder not queued',
  pending: 'Reminder queued',
  sent: 'Reminder processed · delivery unconfirmed',
  failed: 'Reminder failed',
  skipped: 'Reminder skipped',
  dry_run: 'Test only · not sent',
  closed: 'Closed',
  expired: 'Reminder expired',
}
export function safetyError(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : ''
  return message.includes('JOURNEY_CHANGED')
    ? 'This timer changed. Refresh before trying again.'
    : message.includes('JOURNEY_ACTIVE')
      ? 'You already have an active check-in. Refresh to see it.'
      : message.includes('INVALID')
        ? 'Choose a destination and a deadline within 24 hours.'
        : 'Couldn’t save this. Your choice is still here. Try again online.'
}
