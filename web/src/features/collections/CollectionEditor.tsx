import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { collectionError, collectionTones, type CollectionDraft } from './model'
import { CollectionMark } from './CollectionMark'
export function CollectionEditor({
  draft,
  onChange,
  onClose,
  onSaved,
}: {
  draft: CollectionDraft
  onChange: (value: CollectionDraft) => void
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const { client } = useAuth(),
    query = useQueryClient(),
    input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => input.current?.focus(), [])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (busy || !draft.name.trim()) return
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('save_memory_collection', {
        p_expected_user: draft.owner,
        p_expected_couple: draft.couple,
        p_id: draft.id,
        p_version: draft.version,
        p_name: draft.name,
        p_tone: draft.tone,
        p_archived: draft.archived,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['collections'] })
      onSaved(result.data.id)
    } catch (e) {
      setError(collectionError(e))
      if (
        e &&
        typeof e === 'object' &&
        'message' in e &&
        /CHANGED|UNAVAILABLE/.test(String(e.message))
      )
        void query.invalidateQueries({ queryKey: ['collections'] })
    } finally {
      setBusy(false)
    }
  }
  return (
    <DialogSheet
      title={draft.version === null ? 'New collection' : 'Edit collection'}
      onClose={onClose}
      dismissible={!busy}
      className="collection-editor"
    >
      <form
        onSubmit={(event) => {
          void save(event)
        }}
      >
        <fieldset disabled={busy}>
          <div className="collection-cover-preview">
            <CollectionMark tone={draft.tone} />
          </div>
          <label htmlFor="collection-name">Name</label>
          <input
            ref={input}
            id="collection-name"
            value={draft.name}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value })
            }
            maxLength={64}
            placeholder="A name for these memories"
            required
          />
          <div
            className="collection-tones"
            role="group"
            aria-label="Collection color"
          >
            {collectionTones.map((tone) => (
              <button
                type="button"
                key={tone}
                data-tone={tone}
                aria-label={tone[0]!.toUpperCase() + tone.slice(1)}
                aria-pressed={draft.tone === tone}
                onClick={() => onChange({ ...draft, tone })}
              >
                <span />
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <Button disabled={busy || !draft.name.trim()}>
          {busy ? 'Saving…' : 'Save collection'}
        </Button>
      </form>
    </DialogSheet>
  )
}
