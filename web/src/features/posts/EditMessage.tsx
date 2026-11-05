import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import type { Post } from '@/lib/posts'

export function EditMessage({
  post,
  onClose,
}: {
  post: Post
  onClose: () => void
}) {
  const { client } = useAuth(),
    query = useQueryClient()
  const [body, setBody] = useState(post.body ?? ''),
    [version] = useState(post.edit_version ?? 0)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || !body.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('edit_chat_post', {
        p_id: post.id,
        p_body: body,
        p_expected_version: version,
      })
      if (result.error) throw result.error
      for (const key of [
        'posts',
        'reply-posts',
        'on-this-day',
        'kept-memories',
      ])
        void query.invalidateQueries({ queryKey: [key] })
      onClose()
    } catch (failure) {
      const text =
        failure && typeof failure === 'object' && 'message' in failure
          ? String(failure.message)
          : ''
      setError(
        text.includes('EDIT_CONFLICT')
          ? 'This message changed on another device. Close and reopen it to edit the latest version.'
          : text.includes('EDIT_WINDOW_CLOSED')
            ? 'Messages can be edited for 15 minutes after sending.'
            : 'Couldn’t save the edit. Your changes are still here; try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogSheet
      title="Edit message"
      className="edit-message-sheet"
      onClose={onClose}
      dismissible={!busy}
    >
      <form
        onSubmit={(event) => {
          void save(event)
        }}
      >
        <label className="sr-only" htmlFor="edit-message">
          Message
        </label>
        <textarea
          id="edit-message"
          autoFocus
          value={body}
          maxLength={2000}
          rows={4}
          disabled={busy}
          onChange={(event) => setBody(event.target.value)}
        />
        {error && (
          <p role="alert" className="form-message">
            {error}
          </p>
        )}
        <div className="confirmation-actions">
          <Button
            className="button-secondary"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !body.trim()}>
            {busy ? 'Saving…' : 'Save edit'}
          </Button>
        </div>
      </form>
    </DialogSheet>
  )
}
