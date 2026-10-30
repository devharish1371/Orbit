import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import type { Post } from '@/lib/posts'
export function Comments({ post }: { post: Post }) {
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
    <section className="post-comments" aria-label={copy.posts.comments}>
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
              <strong>
                {comment.author_id === session?.user.id
                  ? copy.posts.you
                  : space?.self.partner_nickname ||
                    space?.partner?.nickname ||
                    space?.partner?.display_name}
              </strong>
              <p>{comment.body}</p>
              {comment.author_id === session?.user.id && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    void remove(comment.id)
                  }}
                >
                  {copy.posts.deleteComment}
                </button>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted small">{copy.posts.firstComment}</p>
      )}
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
        <Button disabled={busy || !body.trim()}>{copy.posts.reply}</Button>
      </form>
      {failed && <p role="status">{copy.posts.errors.failed}</p>}
    </section>
  )
}
