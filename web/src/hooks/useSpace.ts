import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
export function useSpace() {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['space', session?.user.id],
    enabled: Boolean(session),
    queryFn: async () => {
      const members = await client.from('members').select('*')
      if (members.error) throw members.error
      const self = members.data.find(
        (member) => member.user_id === session?.user.id,
      )
      if (!self) throw new Error('MEMBERSHIP_REQUIRED')
      const result = await client
        .from('couples')
        .select('*')
        .eq('id', self.couple_id)
        .single()
      if (result.error) throw result.error
      return {
        self,
        partner:
          members.data.find((member) => member.user_id !== self.user_id) ??
          null,
        couple: result.data,
      }
    },
  })
}
