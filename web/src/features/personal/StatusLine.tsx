import { useState } from 'react'
import { Plus, Pencil, RefreshCw } from 'lucide-react'
import { useNow } from '@/hooks/useNow'
import { useSpace } from '@/hooks/useSpace'
import { activeStatus, shortStatus, statusEmoji } from './model'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { useStatuses } from './usePersonal'
import { StatusEditor } from './StatusEditor'
import './personal.css'
export function StatusLine({
  user,
  editable = false,
  bubble = false,
}: {
  user?: string
  editable?: boolean
  bubble?: boolean
}) {
  const statuses = useStatuses(),
    now = useNow(),
    { data: space } = useSpace()
  const [editing, setEditing] = useState(false)
  const own = editable && user === space?.self.user_id
  const current = statuses.data?.find((item) => item.user_id === user),
    active = activeStatus(current, now)
  if (!user || (!active && !own)) return null
  const full = active ? active.message || statusEmojiLabel(active.emoji) : ''
  const content = active ? (
    <>
      {active.emoji && (
        <span className="personal-status-emoji" aria-hidden="true">
          {active.emoji}
        </span>
      )}
      <span>{bubble ? shortStatus(full) : full}</span>
    </>
  ) : (
    <>
      <Plus size={16} aria-hidden="true" />
      {!bubble && <span>Add a status</span>}
    </>
  )
  return (
    <div
      className={`personal-status ${bubble ? 'status-thought' : ''}`}
      title={full || undefined}
    >
      {own && bubble && statuses.error ? (
        <button
          className="personal-status-button"
          aria-label="Retry loading your status"
          onClick={() => {
            void statuses.refetch()
          }}
        >
          <RefreshCw size={16} />
        </button>
      ) : own ? (
        <button
          className="personal-status-button"
          type="button"
          disabled={statuses.isPending || !!statuses.error}
          aria-label={active ? 'Edit your status' : 'Add a status'}
          aria-description={bubble && active ? full : undefined}
          onClick={() => setEditing(true)}
        >
          {content}
          {active && !bubble && <Pencil size={13} aria-hidden="true" />}
        </button>
      ) : bubble ? (
        <Link
          className="personal-status-button"
          to={`/person/${user}`}
          aria-label={`View full status: ${full}`}
        >
          {content}
        </Link>
      ) : (
        <p>{content}</p>
      )}
      {own && !bubble && statuses.error && (
        <button
          className="text-button"
          onClick={() => {
            void statuses.refetch()
          }}
        >
          Couldn’t load status. Retry
        </button>
      )}
      {editing && (
        <StatusEditor current={current} onClose={() => setEditing(false)} />
      )}
    </div>
  )
}
function statusEmojiLabel(value: string) {
  return statusEmoji.find((item) => item.value === value)?.label ?? 'Status'
}
