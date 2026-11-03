import { Quote } from 'lucide-react'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { visiblePost, type Post } from '@/lib/posts'

export function ReplyPreview({
  post,
  loading = false,
  onOpen,
}: {
  post?: Post
  loading?: boolean
  onOpen?: (id: string) => void
}) {
  const { data: space } = useSpace(),
    now = useNow()
  const available = post && visiblePost(post, now)
  const name = available
    ? post.author_id === space?.self.user_id
      ? 'You'
      : space?.self.partner_nickname ||
        space?.partner?.nickname ||
        space?.partner?.display_name ||
        'Your person'
    : ''
  const excerpt = available
    ? post.body?.replace(/\s+/g, ' ').slice(0, 180) ||
      (post.kind === 'photo'
        ? 'Photo'
        : post.kind === 'voice'
          ? 'Voice note'
          : 'Message')
    : ''
  const content = (
    <>
      <Quote size={15} aria-hidden="true" />
      <span>
        {available ? (
          <>
            <strong>{name}</strong> <span>{excerpt}</span>
          </>
        ) : (
          <span>
            {loading ? 'Loading quote…' : 'Original message unavailable'}
          </span>
        )}
      </span>
    </>
  )
  return available && onOpen ? (
    <button
      className="reply-preview"
      type="button"
      aria-label={`Open quoted message from ${name} ${excerpt}`}
      onClick={() => onOpen(post.id)}
    >
      {content}
    </button>
  ) : (
    <div className="reply-preview" role="note">
      {content}
    </div>
  )
}
