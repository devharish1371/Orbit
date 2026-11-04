import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { collectionIndex } from './model'
export function useCollections() {
  const { client, session } = useAuth(),
    { data: space } = useSpace()
  return useQuery({
    queryKey: ['collections', session?.user.id, space?.couple.id],
    enabled: !!space && !!session,
    refetchInterval: 60000,
    queryFn: async () => {
      const result = await client.rpc('memory_collections_index')
      if (result.error) throw result.error
      return collectionIndex(result.data)
    },
  })
}
export function useCollectionLinks(post: string | undefined) {
  const { client, session } = useAuth(),
    { data: space } = useSpace()
  return useQuery({
    queryKey: ['collection-links', session?.user.id, space?.couple.id, post],
    enabled: !!post && !!space && !!session,
    queryFn: async () => {
      const result = await client
        .from('collection_posts')
        .select('*')
        .eq('post_id', post!)
      if (result.error) throw result.error
      return result.data
    },
  })
}
