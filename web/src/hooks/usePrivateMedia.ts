import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
/** Signed URLs stay in the current member's query cache, never navigation state. */
export function usePrivateMedia(path: string | null, enabled = true) {
  const { client, session } = useAuth()
  return useQuery({
    queryKey: ['signed-media', session?.user.id, path],
    enabled: Boolean(path) && enabled,
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
