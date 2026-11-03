import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import type { Post } from '@/lib/posts'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { Avatar } from '@/components/ui/Avatar'
import { PersonLink } from '@/components/ui/PersonLink'
import { ArrowUp, Trash2 } from 'lucide-react'
export function Comments({
  post,
  onClose,
}: {
  post: Post
  onClose: () => void
}) {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [body, setBody] = useState(''),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(false)
  const comments = useQuery({
    queryKey: ['post-comments', post.id],
    queryFn: async () => {
      const result = await client
        .from('comments')
        .select('*')
        .eq('post_id', post.id)
        .order('created_at')
        .limit(100)
      if (result.error) throw result.error
      return result.data
    },
  })
  async function send(event: FormEvent) {
    event.preventDefault()
    if (busy || !body.trim() || !session) return
    setBusy(true)
    setFailed(false)
    try {
      const result = await client.from('comments').insert({
        post_id: post.id,
        couple_id: post.couple_id,
        author_id: session.user.id,
        body: body.trim(),
      })
      if (result.error) throw result.error
      setBody('')
      await query.invalidateQueries({ queryKey: ['post-comments', post.id] })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  async function remove(id: string) {
    setBusy(true)
    setFailed(false)
    try {
      const result = await client
        .from('comments')
        .delete()
        .eq('id', id)
        .eq('author_id', session!.user.id)
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['post-comments', post.id] })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogSheet title="Replies" onClose={onClose} className="reply-sheet">
      <section className="post-comments" aria-label={copy.posts.comments}>
        {post.body && (
          <blockquote className="reply-context">{post.body}</blockquote>
        )}
        {comments.isPending ? (
          <p role="status">{copy.common.loading}</p>
        ) : comments.error ? (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              void comments.refetch()
            }}
          >
            {copy.common.retry}
          </button>
        ) : comments.data.length ? (
          <ol>
            {comments.data.map((comment) => (
              <li key={comment.id}>
                <PersonLink
                  id={comment.author_id}
                  name={
                    (comment.author_id === session?.user.id
                      ? space?.self.display_name
                      : space?.partner?.display_name) ?? 'your person'
                  }
                  className="profile-face"
                >
                  <Avatar
                    name={
                      (comment.author_id === session?.user.id
                        ? space?.self.display_name
                        : space?.partner?.display_name) ?? '?'
                    }
                    color={
                      (comment.author_id === session?.user.id
                        ? space?.self.color
                        : space?.partner?.color) ?? '#FF6B8A'
                    }
                    path={
                      comment.author_id === session?.user.id
                        ? space?.self.avatar_path
                        : space?.partner?.avatar_path
                    }
                  />
                </PersonLink>
                <div className="reply-content">
                  <strong>
                    {comment.author_id === session?.user.id
                      ? copy.posts.you
                      : space?.self.partner_nickname ||
                        space?.partner?.nickname ||
                        space?.partner?.display_name}
                  </strong>
                  <p>{comment.body}</p>
                  <time dateTime={comment.created_at}>
                    {new Intl.DateTimeFormat('en-IN', {
                      timeZone: space?.couple.timezone,
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(comment.created_at))}
                  </time>
                </div>
                {comment.author_id === session?.user.id && (
                  <button
                    type="button"
                    className="text-button"
                    aria-label={copy.posts.deleteComment}
                    disabled={busy}
                    onClick={() => {
                      void remove(comment.id)
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ol>
        ) : null}
        <form
          onSubmit={(event) => {
            void send(event)
          }}
        >
          <label className="sr-only" htmlFor={`comment-${post.id}`}>
            {copy.posts.commentPlaceholder}
          </label>
          <input
            id={`comment-${post.id}`}
            maxLength={500}
            value={body}
            disabled={busy}
            placeholder={copy.posts.commentPlaceholder}
            onChange={(event) => setBody(event.target.value)}
          />
          <Button aria-label="Send reply" disabled={busy || !body.trim()}>
            <ArrowUp size={18} aria-hidden="true" />
          </Button>
        </form>
        {failed && <p role="status">{copy.posts.errors.failed}</p>}
      </section>
    </DialogSheet>
  )
}
