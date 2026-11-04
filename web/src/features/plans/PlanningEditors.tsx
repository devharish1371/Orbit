import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { zoneInstant, planningError } from '@/lib/plans'
import type { PlanDraft, IdeaDraft } from './PlanningContext'
export function PlanEditor({
  draft,
  onChange,
  onClose,
  onSaved,
}: {
  draft: PlanDraft
  onChange: (draft: PlanDraft) => void
  onClose: () => void
  onSaved: () => void
}) {
  const titleInput = useRef<HTMLInputElement>(null)
  useEffect(() => titleInput.current?.focus(), [])
  const { client } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const change = (key: keyof PlanDraft, value: string) =>
    onChange({ ...draft, [key]: value })
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!space || busy) return
    setBusy(true)
    setError('')
    try {
      const starts = zoneInstant(draft.starts, draft.zone)
      const result = await client.rpc('save_plan', {
        p_id: draft.id,
        p_version: draft.version,
        p_title: draft.title,
        p_notes: draft.notes,
        p_venue: draft.venue,
        p_starts_at: starts,
        p_timezone: draft.zone,
        p_expected_user: space.self.user_id,
        p_expected_couple: space.couple.id,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['plans'] })
      onSaved()
    } catch (error) {
      setError(planningError(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogSheet
      title={draft.version ? 'Edit plan' : 'New plan'}
      onClose={onClose}
      dismissible={!busy}
      className="planning-editor"
    >
      <form
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        <fieldset disabled={busy}>
          <label htmlFor="plan-title">What’s the plan?</label>
          <input
            ref={titleInput}
            id="plan-title"
            required
            maxLength={100}
            value={draft.title}
            onChange={(e) => change('title', e.target.value)}
            placeholder="Dinner, a walk, a little trip…"
          />
          <label htmlFor="plan-when">When · {draft.zone}</label>
          <input
            id="plan-when"
            required
            type="datetime-local"
            value={draft.starts}
            onInput={(e) => change('starts', e.currentTarget.value)}
            onChange={(e) => change('starts', e.target.value)}
          />
          <label htmlFor="plan-venue">
            Where <span>optional</span>
          </label>
          <input
            id="plan-venue"
            maxLength={160}
            value={draft.venue}
            onChange={(e) => change('venue', e.target.value)}
          />
          <label htmlFor="plan-notes">
            Notes <span>optional</span>
          </label>
          <textarea
            id="plan-notes"
            rows={3}
            maxLength={1000}
            value={draft.notes}
            onChange={(e) => change('notes', e.target.value)}
          />
        </fieldset>
        <p className="planning-disclosure">
          Shared with{' '}
          {space?.self.partner_nickname ||
            space?.partner?.nickname ||
            space?.partner?.display_name ||
            'your partner'}
          .{' '}
          {draft.version
            ? 'Changes need a fresh confirmation.'
            : 'They can confirm when they’re ready.'}
        </p>
        {error && <p role="alert">{error}</p>}
        <Button disabled={busy}>
          {busy ? 'Saving…' : draft.version ? 'Save changes' : 'Propose plan'}
        </Button>
      </form>
    </DialogSheet>
  )
}
export function IdeaEditor({
  draft,
  onChange,
  onClose,
  onSaved,
}: {
  draft: IdeaDraft
  onChange: (draft: IdeaDraft) => void
  onClose: () => void
  onSaved: () => void
}) {
  const titleInput = useRef<HTMLInputElement>(null)
  useEffect(() => titleInput.current?.focus(), [])
  const { client } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!space || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('save_date_idea', {
        p_id: draft.id,
        p_version: draft.version,
        p_kind: draft.kind,
        p_title: draft.title,
        p_notes: draft.notes,
        p_private: draft.private,
        p_archived: draft.archived,
        p_expected_user: space.self.user_id,
        p_expected_couple: space.couple.id,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['date-ideas'] })
      onSaved()
    } catch (e) {
      setError(planningError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogSheet
      title={
        draft.kind === 'place'
          ? 'Want to go'
          : draft.version
            ? 'Edit idea'
            : 'Add an idea'
      }
      onClose={onClose}
      dismissible={!busy}
      className="planning-editor"
    >
      <form
        onSubmit={(e) => {
          void submit(e)
        }}
      >
        <fieldset disabled={busy}>
          <label htmlFor="idea-title">
            {draft.kind === 'place' ? 'Somewhere to try' : 'Your idea'}
          </label>
          <input
            ref={titleInput}
            required
            id="idea-title"
            maxLength={160}
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder={
              draft.kind === 'place'
                ? 'A café, a city, a corner of the world…'
                : 'Something you’d love to do together…'
            }
          />
          <label htmlFor="idea-notes">
            Notes <span>optional</span>
          </label>
          <textarea
            id="idea-notes"
            maxLength={1000}
            rows={3}
            value={draft.notes}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          />
          <label className="planning-private">
            <input
              type="checkbox"
              checked={draft.private}
              onChange={(e) =>
                onChange({ ...draft, private: e.target.checked })
              }
            />
            Only me
          </label>
        </fieldset>
        {draft.kind === 'place' && (
          <p className="planning-disclosure">
            Saved here without arrival alerts.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <Button disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </form>
    </DialogSheet>
  )
}
