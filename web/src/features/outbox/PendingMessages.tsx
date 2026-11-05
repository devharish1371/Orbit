import { PendingMediaPreview } from './PendingMediaPreview'
import { useContext, useState } from 'react'
import { FlowContext } from '@/app/FlowContext'
import { Clock3, RotateCcw, X } from 'lucide-react'
import { useOutbox } from './OutboxContext'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { useNow } from '@/hooks/useNow'
export function PendingMessages({ sentIds }: { sentIds: string[] }) {
  const outbox = useOutbox(),
    memory = useContext(FlowContext)
  const now = useNow()
  const [discard, setDiscard] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const visible =
    outbox?.items.filter(
      (item) =>
        item.expiresAt > now &&
        !sentIds.includes(item.id) &&
        !(
          item.version === 2 &&
          item.staged !== false &&
          memory?.handles.chat.id.current === item.id &&
          (memory.drafts.chat.photos.length || memory.drafts.chat.attachment)
        ),
    ) ?? []
  if (!outbox || !visible.length) return null
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
      <div
        className="pending-messages"
        role="group"
        aria-label="Pending messages"
      >
        {visible.map((item) => {
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
                    : item.blocked ||
                        (item.version === 2 && item.staged !== false)
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
                  onClick={() => {
                    setError('')
                    setDiscard(item.id)
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              {item.version === 2 && item.staged !== false && !item.blocked && (
                <p className="small muted">
                  Tap Retry to finish saving this copy.
                </p>
              )}
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
      {discard && visible.some((item) => item.id === discard) && (
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
