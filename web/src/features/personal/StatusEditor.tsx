import { useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import {
  activeStatus,
  statusEmoji,
  statusError,
  type MemberStatus,
} from './model'
export function StatusEditor({
  current,
  onClose,
}: {
  current?: MemberStatus
  onClose: () => void
}) {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [base] = useState(() => ({
    owner: space?.self.user_id,
    couple: space?.couple.id,
    version: current?.version ?? 0,
  }))
  const [initial] = useState(() => activeStatus(current, Date.now()))
  const [emoji, setEmoji] = useState(initial?.emoji ?? ''),
    [message, setMessage] = useState(initial?.message ?? '')
  const [hours, setHours] = useState(4),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const saving = useRef(false)
  async function save(clear = false) {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      if (
        !base.owner ||
        !base.couple ||
        session?.user.id !== base.owner ||
        space?.couple.id !== base.couple
      )
        throw new Error('ACCOUNT_CHANGED')
      const result = await client.rpc('set_member_status', {
        p_expected_user: base.owner,
        p_expected_couple: base.couple,
        p_version: base.version,
        p_emoji: clear ? '' : emoji,
        p_message: clear ? '' : message.trim(),
        p_hours: clear ? 0 : hours,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['member-status'] })
      onClose()
    } catch (e) {
      setError(statusError(e))
      void query.invalidateQueries({ queryKey: ['member-status'] })
    } finally {
      saving.current = false
      setBusy(false)
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    void save()
  }
  return (
    <DialogSheet
      title="Your status"
      onClose={onClose}
      dismissible={!busy}
      className="status-editor"
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div
            className="status-emoji-choices"
            role="group"
            aria-label="Status emoji"
          >
            {statusEmoji.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-label={item.label}
                aria-pressed={emoji === item.value}
                onClick={() => setEmoji(emoji === item.value ? '' : item.value)}
              >
                {item.value}
              </button>
            ))}
          </div>
          <label htmlFor="personal-status">What’s up?</label>
          <input
            id="personal-status"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={80}
            autoComplete="off"
            placeholder="A little update"
          />
          <div className="status-expiry">
            <span>Clear after</span>
            <div
              className="theme-options"
              role="group"
              aria-label="Status duration"
            >
              {[1, 4, 24].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={hours === value}
                  onClick={() => setHours(value)}
                >
                  {value}h
                </button>
              ))}
            </div>
          </div>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <div className="status-editor-actions">
          <Button disabled={busy || (!emoji && !message.trim())}>
            {busy ? 'Saving…' : 'Save status'}
          </Button>
          {initial && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                void save(true)
              }}
            >
              Clear status
            </button>
          )}
        </div>
      </form>
    </DialogSheet>
  )
}
