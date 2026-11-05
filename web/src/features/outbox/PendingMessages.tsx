import { PendingMediaPreview } from './PendingMediaPreview'
import { useState } from 'react'
import { Clock3, RotateCcw, X } from 'lucide-react'
import { useOutbox } from './OutboxContext'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { useNow } from '@/hooks/useNow'
export function PendingMessages({ sentIds }: { sentIds: string[] }) {
  const outbox = useOutbox()
  const now = useNow()
  const [discard, setDiscard] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  if (!outbox?.items.length) return null
  async function remove() {
    if (!discard || !outbox) return
    setBusy(true)
    setError('')
    try {
      await outbox.discard(discard)
      setDiscard(null)
    } catch {
      setError('Couldn’t remove the pending copy. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="pending-messages" aria-label="Pending messages">
        {outbox.items
          .filter((item) => item.expiresAt > now && !sentIds.includes(item.id))
          .map((item) => {
            const remaining = item.expiresAt - Math.max(now, item.queuedAt)
            return (
              <article className="pending-message" key={item.id}>
                {item.version === 2 && <PendingMediaPreview item={item} />}
                {item.body && <p>{item.body}</p>}
                <div className="pending-message-state">
                  <Clock3 size={13} aria-hidden="true" />
                  <span>
                    {outbox.sendingId === item.id
                      ? 'Sending…'
                      : item.blocked
                        ? 'Needs attention'
                        : 'Waiting to send'}
                  </span>
                  <time
                    dateTime={new Date(item.expiresAt).toISOString()}
                    title="Pending copies expire on this device after 24 hours"
                  >
                    {remaining > 3600000
                      ? `${Math.ceil(remaining / 3600000)}h left`
                      : `${Math.max(1, Math.ceil(remaining / 60000))}m left`}
                  </time>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Retry pending message"
                    disabled={outbox.sendingId !== null}
                    onClick={() => outbox.retry(item.id)}
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Discard pending copy"
                    disabled={outbox.sendingId === item.id}
                    onClick={() => setDiscard(item.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
                {item.blocked && (
                  <p className="small muted">
                    Couldn’t send this copy. Check storage or the original
                    message, then retry.
                  </p>
                )}
              </article>
            )
          })}
      </div>
      {discard && (
        <ConfirmSheet
          title="Discard pending copy?"
          description="This stops retries. If the message already sent, use Unsend on it in the conversation."
          confirmLabel="Discard pending copy"
          onConfirm={() => {
            void remove()
          }}
          onCancel={() => setDiscard(null)}
          busy={busy}
          error={error}
        />
      )}
    </>
  )
}
