import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Image, Mic, AlignLeft, Trash2, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { usePrivateMedia } from '@/hooks/usePrivateMedia'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Button } from '@/components/ui/Button'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { VoiceRecorder } from '@/features/posts/VoiceRecorder'
import { preparePhoto } from '@/lib/media'
import type { Attachment, Post } from '@/lib/posts'
import type { Json } from '@/lib/database.types'
import type { MemorySide } from '@/lib/memory-sides'
function Preview({ note }: { note: Attachment }) {
  const attach = useCallback(
    (element: HTMLImageElement | null) => {
      if (!element) return
      const url = URL.createObjectURL(note.blob)
      element.src = url
      return () => URL.revokeObjectURL(url)
    },
    [note.blob],
  )
  return note.extension === 'webp' ? (
    <img className="side-draft-photo" ref={attach} alt="Your photo preview" />
  ) : (
    <AudioPlayer
      blob={note.blob}
      duration={note.duration}
      waveform={note.waveform}
      label="Voice preview"
    />
  )
}
export function SideEditor({
  post,
  own,
  onClose,
}: {
  post: Post
  own?: MemorySide
  onClose: () => void
}) {
  const { client } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const bound = useRef(
    space ? { owner: space.self.user_id, couple: space.couple.id } : null,
  )
  const [kind, setKind] = useState<MemorySide['kind']>(own?.kind ?? 'text'),
    [body, setBody] = useState(own?.body ?? ''),
    [note, setNote] = useState<Attachment>(),
    [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [remove, setRemove] = useState(false)
  const input = useRef<HTMLInputElement>(null),
    flight = useRef(false),
    active = useRef(true),
    operation = useRef<AbortController | null>(null)
  const draft = useRef<{
    id: string
    blob?: Blob
    kind: string
    request: string
    payload: string
  } | null>(null)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      operation.current?.abort()
    }
  }, [])
  async function photo(file: File) {
    setError('')
    try {
      setNote(await preparePhoto(file))
    } catch {
      setError('Choose a JPG, PNG or WebP photo under 20 MB.')
    }
  }
  async function save(deleting = false) {
    const identity = bound.current
    if (!identity || flight.current) return
    flight.current = true
    setBusy(true)
    setError('')
    const controller = new AbortController()
    operation.current = controller
    try {
      let side: Json | null = null
      if (!deleting) {
        if (
          !draft.current ||
          draft.current.kind !== kind ||
          draft.current.blob !== note?.blob
        )
          draft.current = {
            id: !note && own?.kind === kind ? own.id : crypto.randomUUID(),
            blob: note?.blob,
            kind,
            request: crypto.randomUUID(),
            payload: '',
          }
        const d = draft.current
        let path = kind === own?.kind && !note ? own.path : null,
          thumb = kind === own?.kind && !note ? own.thumb_path : null
        if (kind !== 'text' && note) {
          const prefix = `${identity.couple}/${identity.owner}/${post.id}_side_${d.id}`
          path = prefix + '.' + note.extension
          thumb = note.thumb ? prefix + '_t.webp' : null
          for (const [name, blob] of [
            [path, note.blob],
            [thumb, note.thumb],
          ] as const) {
            if (!name || !blob) continue
            controller.signal.throwIfAborted()
            const result = await client.storage
              .from('media')
              .upload(name, blob, {
                contentType: blob.type.split(';')[0],
                upsert: false,
              })
            if (result.error && String(result.error.statusCode) !== '409')
              throw result.error
          }
        }
        if (kind !== 'text' && !path) throw new Error('MEDIA_REQUIRED')
        side = {
          id: d.id,
          kind,
          body: body.trim(),
          path,
          thumb_path: thumb,
          width: note?.width ?? own?.width ?? null,
          height: note?.height ?? own?.height ?? null,
          duration: note?.duration ?? own?.duration ?? null,
        }
      }
      const payload = JSON.stringify(side),
        key = deleting ? 'remove' : payload
      if (!draft.current)
        draft.current = {
          id: own?.id ?? crypto.randomUUID(),
          kind,
          request: crypto.randomUUID(),
          payload: key,
        }
      if (draft.current.payload && draft.current.payload !== key)
        draft.current.request = crypto.randomUUID()
      draft.current.payload = key
      controller.signal.throwIfAborted()
      const result = await client
        .rpc('write_memory_side', {
          p_expected_user: identity.owner,
          p_expected_couple: identity.couple,
          p_post: post.id,
          p_kept_at: post.kept_at!,
          p_version: own?.version ?? null,
          p_request: draft.current.request,
          p_side: side,
        })
        .abortSignal(controller.signal)
      if (result.error) throw result.error
      for (const key of [
        'posts',
        'kept-memories',
        'phone-copies',
        'storage-summary',
        'on-this-day',
      ])
        void query.invalidateQueries({ queryKey: [key] })
      window.dispatchEvent(new Event('orbit-keepsakes-sync'))
      if (active.current) onClose()
    } catch (e) {
      if (active.current)
        setError(
          e &&
            typeof e === 'object' &&
            'message' in e &&
            /CHANGED|UNAVAILABLE/.test(String(e.message))
            ? 'This memory changed. Close and reopen it.'
            : e &&
                typeof e === 'object' &&
                'message' in e &&
                String(e.message).includes('QUOTA')
              ? 'Keepsake storage is full.'
              : 'Couldn’t save. Try again online.',
        )
    } finally {
      flight.current = false
      if (active.current) setBusy(false)
    }
  }
  const oldMedia = usePrivateMedia(
    !note && !recording && own?.kind === kind
      ? (own.thumb_path ?? own.path)
      : null,
  )
  const mediaReady =
    kind === 'text'
      ? !!body.trim()
      : !!note || (own?.kind === kind && !!own.path)
  return (
    <DialogSheet
      title={own ? 'Your side' : 'Add your side'}
      onClose={onClose}
      dismissible={!busy && !recording}
      className="side-editor"
    >
      <div
        className="side-kind-choices"
        role="group"
        aria-label="Contribution format"
      >
        {(['text', 'photo', 'voice'] as const).map((value) => (
          <button
            key={value}
            disabled={busy || recording}
            aria-pressed={kind === value}
            onClick={() => {
              setKind(value)
              setNote(undefined)
              setError('')
            }}
          >
            {value === 'text' ? (
              <AlignLeft size={20} />
            ) : value === 'photo' ? (
              <Image size={20} />
            ) : (
              <Mic size={20} />
            )}
            <span>
              {value === 'text'
                ? 'A few words'
                : value === 'photo'
                  ? 'Photo'
                  : 'Voice'}
            </span>
          </button>
        ))}
      </div>
      {kind === 'photo' && (
        <>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void photo(file)
            }}
          />
          <button
            className="side-photo-pick"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <Image size={24} />
            {note
              ? 'Change photo'
              : own?.kind === 'photo'
                ? 'Replace photo'
                : 'Choose photo'}
          </button>
        </>
      )}
      {kind === 'voice' && (
        <VoiceRecorder
          studio
          disabled={busy}
          onReady={setNote}
          onBusy={setRecording}
        />
      )}{' '}
      {!recording && note && <Preview note={note} />}
      {!recording &&
        !note &&
        oldMedia.data &&
        (kind === 'voice' ? (
          <AudioPlayer
            src={oldMedia.data}
            label="Your saved voice"
            duration={own?.duration}
          />
        ) : kind === 'photo' ? (
          <img
            className="side-draft-photo"
            src={oldMedia.data}
            alt="Your current photo"
          />
        ) : null)}
      <label htmlFor="side-words">
        {kind === 'text' ? 'Your words' : 'A note · optional'}
      </label>
      <textarea
        id="side-words"
        rows={3}
        maxLength={1000}
        disabled={busy || recording}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && !remove && <p role="alert">{error}</p>}
      <div className="side-editor-actions">
        <Button
          disabled={busy || recording || !mediaReady}
          onClick={() => {
            void save()
          }}
        >
          <Check size={18} />
          {busy ? 'Saving…' : 'Save your side'}
        </Button>
        {own && (
          <button
            className="icon-button"
            aria-label="Remove your side"
            disabled={busy || recording}
            onClick={() => setRemove(true)}
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {remove && (
        <ConfirmSheet
          title="Remove your side?"
          description="The front and the other person’s contribution stay. Your side disappears from phone copies after their next sync."
          confirmLabel="Remove your side"
          onCancel={() => {
            setRemove(false)
            setError('')
          }}
          onConfirm={() => {
            void save(true)
          }}
          busy={busy}
          error={error}
        />
      )}
    </DialogSheet>
  )
}
