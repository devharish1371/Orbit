import { useId, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import { validPlace, type PlaceDraft } from '@/lib/place'
export default function PlaceEditor({
  initial,
  id,
  onClose,
}: {
  initial: PlaceDraft
  id?: string
  onClose: () => void
}) {
  const { client } = useAuth(),
    { data } = useSpace(),
    query = useQueryClient(),
    formId = useId()
  const [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  const update = <K extends keyof PlaceDraft>(key: K, value: PlaceDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }))
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!data) return
    if (!validPlace(draft)) {
      setMessage(copy.map.invalidPlace)
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const values = {
        lat: draft.lat,
        lng: draft.lng,
        radius_m: draft.radius_m,
        notify_arrive: draft.notify_arrive,
        notify_leave: draft.notify_leave,
        name: draft.name.trim(),
        emoji: draft.emoji.trim(),
      }
      const result = id
        ? await client
            .from('places')
            .update(values)
            .eq('id', id)
            .select('id')
            .single()
        : await client
            .from('places')
            .insert({
              ...values,
              couple_id: data.couple.id,
              created_by: data.self.user_id,
            })
            .select('id')
            .single()
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['places'] })
      onClose()
    } catch {
      setMessage(copy.map.failed)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      className="glass place-editor"
      onSubmit={(event) => {
        void save(event)
      }}
      aria-label={id ? copy.map.edit : copy.map.add}
    >
      <h2>{id ? copy.map.edit : copy.map.add}</h2>
      <label htmlFor={formId + 'name'}>{copy.map.name}</label>
      <input
        autoFocus
        id={formId + 'name'}
        value={draft.name}
        maxLength={40}
        onChange={(e) => update('name', e.target.value)}
        required
      />
      <label htmlFor={formId + 'emoji'}>{copy.map.emoji}</label>
      <input
        id={formId + 'emoji'}
        value={draft.emoji}
        maxLength={16}
        onChange={(e) => update('emoji', e.target.value)}
        required
      />
      <label htmlFor={formId + 'radius'}>
        {copy.map.radius} · {draft.radius_m} m
      </label>
      <input
        id={formId + 'radius'}
        type="range"
        min={50}
        max={2000}
        step={50}
        value={draft.radius_m}
        onChange={(e) => update('radius_m', Number(e.target.value))}
      />
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.notify_arrive}
          onChange={(e) => update('notify_arrive', e.target.checked)}
        />
        {copy.map.arrive}
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.notify_leave}
          onChange={(e) => update('notify_leave', e.target.checked)}
        />
        {copy.map.leave}
      </label>
      <p className="small muted">{copy.map.alertsLater}</p>
      <div className="place-actions">
        <Button disabled={busy}>
          {busy ? copy.common.saving : copy.map.save}
        </Button>
        <button
          type="button"
          className="text-button"
          onClick={onClose}
          disabled={busy}
        >
          {copy.map.cancel}
        </button>
      </div>
      {message && (
        <p role="alert" className="form-message">
          {message}
        </p>
      )}
    </form>
  )
}
