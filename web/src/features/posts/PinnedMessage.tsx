import { useState } from 'react'
import { Pin, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useNow } from '@/hooks/useNow'
import { visiblePost, type Post } from '@/lib/posts'

export function PinnedMessage({
  pin,
  post,
  onOpen,
}: {
  pin: { post_id: string; expires_at: string }
  post?: Post
  onOpen: (id: string) => void
}) {
  const now = useNow(),
    { client } = useAuth(),
    query = useQueryClient()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  if (!post || !visiblePost(post, now) || Date.parse(pin.expires_at) <= now)
    return null
  const excerpt =
    post.body?.replace(/\s+/g, ' ').slice(0, 180) ||
    (post.kind === 'photo' ? 'Photo' : 'Voice note')
  async function unpin() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('set_chat_pin', {
        p_post_id: pin.post_id,
        p_remove: true,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['chat-pin'] })
    } catch {
      setError('Couldn’t unpin. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="chat-pin-strip">
      <div className="chat-pin-row">
        <button
          type="button"
          className="open-pin"
          title="Pinned for up to 24 hours"
          aria-label={`Open pinned message: ${excerpt}`}
          onClick={() => onOpen(post.id)}
        >
          <Pin size={16} aria-hidden="true" />
          <span>{excerpt}</span>
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label="Unpin message"
          disabled={busy}
          onClick={() => {
            void unpin()
          }}
        >
          <X size={17} />
        </button>
      </div>
      {error && (
        <p role="status" className="form-message">
          {error}
        </p>
      )}
    </div>
  )
}
