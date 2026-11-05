import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { useNow } from '@/hooks/useNow'
import { useSpace } from '@/hooks/useSpace'
import { activeStatus } from './model'
import { useStatuses } from './usePersonal'
import { StatusEditor } from './StatusEditor'
import './personal.css'
export function StatusLine({
  user,
  editable = false,
}: {
  user?: string
  editable?: boolean
}) {
  const statuses = useStatuses(),
    now = useNow(),
    { data: space } = useSpace()
  const [editing, setEditing] = useState(false)
  const own = editable && user === space?.self.user_id
  const current = statuses.data?.find((item) => item.user_id === user),
    active = activeStatus(current, now)
  if (!user || (!active && !own)) return null
  const content = active ? (
    <>
      <span className="personal-status-emoji" aria-hidden="true">
        {active.emoji}
      </span>
      <span>{active.message || statusEmojiLabel(active.emoji)}</span>
    </>
  ) : (
    <>
      <Plus size={16} aria-hidden="true" />
      <span>Add a status</span>
    </>
  )
  return (
    <div className="personal-status">
      {own ? (
        <button
          className="personal-status-button"
          type="button"
          disabled={statuses.isPending || !!statuses.error}
          aria-label={active ? 'Edit your status' : 'Add a status'}
          onClick={() => setEditing(true)}
        >
          {content}
          {active && <Pencil size={13} aria-hidden="true" />}
        </button>
      ) : (
        <p>{content}</p>
      )}
      {own && statuses.error && (
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
import { statusEmoji } from './model'
function statusEmojiLabel(value: string) {
  return statusEmoji.find((item) => item.value === value)?.label ?? 'Status'
}
