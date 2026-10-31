import { useQuery } from '@tanstack/react-query'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { copy } from '@/copy/en'
import { visiblePost } from '@/lib/posts'
export function ExpiringSoon() {
  const { client } = useAuth(),
    { data: space } = useSpace(),
    now = useNow()
  const posts = useQuery({
    queryKey: ['expiring', space?.couple.id],
    enabled: !!space,
    queryFn: async () => {
      const result = await client
        .from('posts')
        .select('*')
        .eq('couple_id', space!.couple.id)
        .eq('keep', false)
        .gt('expires_at', new Date().toISOString())
        .lt('expires_at', new Date(Date.now() + 86400000).toISOString())
        .order('expires_at')
        .limit(6)
      if (result.error) throw result.error
      return result.data
    },
  })
  const rows = posts.data?.filter((post) => visiblePost(post, now)) ?? []
  if (!rows.length) return null
  return (
    <section className="glass expiring-strip">
      <h2>{copy.posts.expiringTitle}</h2>
      <p className="muted small">{copy.posts.expiringHint}</p>
      <div>
        {rows.map((post) => (
          <Link
            key={post.id}
            to={post.channel === 'chat' ? '/chat' : '/moments'}
          >
            <span aria-hidden="true">
              {post.kind === 'photo'
                ? '📸'
                : post.kind === 'voice'
                  ? '🎙️'
                  : '💌'}
            </span>
            <span>
              {post.body?.slice(0, 55) ||
                copy.posts.kinds[post.kind as keyof typeof copy.posts.kinds]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
