import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Mic, Smile, Type, Plus, Send, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useLiveData } from '@/features/map/LiveContext'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import { preparePhoto } from '@/lib/media'
import {
  mediaError,
  sharePost,
  type Attachment,
  type Channel,
  type PostDraft,
} from '@/lib/posts'
import { VoiceRecorder } from './VoiceRecorder'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
function LocalPreview({ note }: { note: Attachment }) {
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
    <img className="draft-photo" ref={attach} alt={copy.posts.photoPreview} />
  ) : (
    <AudioPlayer
      blob={note.blob}
      label={copy.posts.voicePreview}
      waveform={note.waveform}
      duration={note.duration}
    />
  )
}
export function Composer({
  channel,
  onTyping,
  onStopTyping,
  onBusyChange,
}: {
  channel: Channel
  onTyping: () => void
  onStopTyping: () => void
  onBusyChange?: (busy: boolean) => void
}) {
  const { client } = useAuth(),
    { data: space } = useSpace(),
    live = useLiveData(),
    query = useQueryClient()
  const [kind, setKind] = useState<PostDraft['kind']>('text'),
    [body, setBody] = useState(''),
    [mood, setMood] = useState('💛'),
    [attachment, setAttachment] = useState<Attachment>(),
    [ttl, setTtl] = useState('default'),
    [place, setPlace] = useState(''),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [message, setMessage] = useState(''),
    [more, setMore] = useState(false)
  useEffect(() => {
    onBusyChange?.(busy || recording)
  }, [busy, recording, onBusyChange])
  const photoInput = useRef<HTMLInputElement>(null)
  const id = useRef(crypto.randomUUID()),
    attempted = useRef(false)
  function edited() {
    if (attempted.current) {
      id.current = crypto.randomUUID()
      attempted.current = false
    }
  }
  function mode(next: PostDraft['kind']) {
    edited()
    setKind(next)
    setAttachment(undefined)
    setMessage('')
  }
  async function photo(file: File | undefined) {
    if (!file) return
    edited()
    setBusy(true)
    setMessage('')
    try {
      setAttachment(await preparePhoto(file))
    } catch {
      setMessage(copy.posts.photoFailed)
    } finally {
      setBusy(false)
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    if (!space || busy || recording) return
    if (
      (kind === 'text' && !body.trim()) ||
      (['photo', 'voice'].includes(kind) && !attachment)
    ) {
      setMessage(copy.posts.empty)
      return
    }
    attempted.current = true
    setBusy(true)
    setMessage('')
    onStopTyping()
    try {
      await sharePost(client, {
        id: id.current,
        couple: space.couple.id,
        author: space.self.user_id,
        channel,
        kind,
        body:
          kind === 'mood'
            ? `${mood}${body.trim() ? ' ' + body.trim() : ''}`
            : body,
        ttl: ttl === '24' ? 24 : ttl === '7d' ? 168 : null,
        keep: ttl === 'keep',
        place: place || null,
        attachment,
      })
      id.current = crypto.randomUUID()
      attempted.current = false
      setBody('')
      const text = form.querySelector('textarea')
      if (text) text.style.height = 'auto'
      setAttachment(undefined)
      setKind('text')
      setPlace('')
      setMore(false)
      setMessage(channel === 'chat' ? '' : copy.posts.shared)
    } catch (error) {
      setMessage(copy.posts.errors[mediaError(error)])
    } finally {
      setBusy(false)
      for (const key of ['posts', 'storage-summary', 'expiring'])
        void query.invalidateQueries({ queryKey: [key] })
    }
  }
  if (channel === 'chat')
    return (
      <form
        className="messenger-composer"
        data-recording={recording}
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        {attachment && (
          <div className="messenger-attachment">
            <LocalPreview note={attachment} />
            <button
              type="button"
              className="icon-button"
              aria-label={copy.posts.removeAttachment}
              disabled={busy || recording}
              onClick={() => {
                edited()
                setAttachment(undefined)
                setKind('text')
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {more && (
          <div className="messenger-more">
            <label>
              {copy.posts.expiry}
              <select
                value={ttl}
                onChange={(event) => {
                  edited()
                  setTtl(event.target.value)
                }}
              >
                <option value="default">
                  {copy.posts.defaultExpiry.replace(
                    '{days}',
                    String(space?.couple.retention_days ?? 7),
                  )}
                </option>
                <option value="24">{copy.posts.day}</option>
                <option value="7d">{copy.posts.week}</option>
                <option value="keep">{copy.posts.keep}</option>
              </select>
            </label>
            <div className="mood-options">
              {['💛', '🥰', '🥺', '🫂', '✨'].map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => {
                    edited()
                    setBody((value) => value + emoji)
                    setMore(false)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        <input
          hidden
          ref={photoInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              mode('photo')
              void photo(file)
            }
            event.target.value = ''
          }}
        />
        <div className="messenger-input-row">
          <button
            type="button"
            className="icon-button composer-plus"
            aria-label={copy.posts.more}
            aria-expanded={more}
            disabled={busy || recording}
            onClick={() => setMore(!more)}
          >
            <Plus size={21} />
          </button>
          <label className="sr-only" htmlFor="chat-message">
            {copy.posts.write}
          </label>
          <textarea
            id="chat-message"
            rows={1}
            value={body}
            maxLength={2000}
            disabled={busy || recording}
            placeholder={
              recording ? copy.posts.recording : copy.posts.chatPlaceholder
            }
            enterKeyHint="send"
            onChange={(event) => {
              edited()
              setBody(event.target.value)
              onTyping()
              event.target.style.height = 'auto'
              event.target.style.height =
                Math.min(event.target.scrollHeight, 132) + 'px'
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                body.trim()
              ) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={copy.posts.choosePhoto}
            disabled={busy || recording}
            onClick={() => photoInput.current?.click()}
          >
            <ImagePlus size={21} />
          </button>
          <div hidden={!!(body.trim() || attachment) && !recording}>
            <VoiceRecorder
              compact
              disabled={busy}
              onReady={(note) => {
                edited()
                setKind('voice')
                setAttachment(note)
              }}
              onBusy={setRecording}
            />
          </div>
          {!!(body.trim() || attachment) && !recording && (
            <button
              type="submit"
              className="chat-send"
              disabled={busy}
              aria-label={busy ? copy.posts.sharing : copy.posts.send}
            >
              <Send size={20} />
            </button>
          )}
        </div>
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
      </form>
    )
  return (
    <form
      className="glass composer"
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      <div className="composer-modes" aria-label={copy.posts.addSomething}>
        {(
          [
            ['text', Type],
            ['photo', ImagePlus],
            ['voice', Mic],
            ['mood', Smile],
          ] as const
        ).map(([value, Icon]) => (
          <button
            key={value}
            type="button"
            disabled={busy || recording}
            aria-pressed={kind === value}
            onClick={() => mode(value)}
          >
            <Icon size={18} aria-hidden="true" />
            {copy.posts.kinds[value]}
          </button>
        ))}
      </div>
      {kind === 'photo' && (
        <label className="file-picker">
          {copy.posts.choosePhoto}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              void photo(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      )}
      {kind === 'voice' && (
        <VoiceRecorder
          onReady={(note) => {
            edited()
            setAttachment(note)
          }}
          onBusy={setRecording}
        />
      )}
      {kind === 'mood' && (
        <div className="mood-options" aria-label={copy.posts.mood}>
          {['💛', '🥰', '🥺', '😴', '🫂', '✨'].map((value) => (
            <button
              type="button"
              key={value}
              aria-label={value}
              aria-pressed={mood === value}
              disabled={busy}
              onClick={() => {
                edited()
                setMood(value)
              }}
            >
              {value}
            </button>
          ))}
        </div>
      )}
      {attachment && (
        <div className="attachment-preview">
          <LocalPreview note={attachment} />
          <button
            className="text-button"
            type="button"
            disabled={busy || recording}
            onClick={() => {
              edited()
              setAttachment(undefined)
            }}
          >
            {copy.posts.removeAttachment}
          </button>
        </div>
      )}
      <label className="sr-only" htmlFor={`compose-${channel}`}>
        {copy.posts.write}
      </label>
      <textarea
        id={`compose-${channel}`}
        value={body}
        maxLength={kind === 'mood' ? 1950 : 2000}
        rows={3}
        disabled={busy || recording}
        placeholder={
          kind === 'text'
            ? copy.posts.momentPlaceholder
            : copy.posts.captionPlaceholder
        }
        onChange={(event) => {
          edited()
          setBody(event.target.value)
          onTyping()
        }}
      />
      <div className="composer-options">
        <label>
          {copy.posts.expiry}
          <select
            value={ttl}
            disabled={busy || recording}
            onChange={(event) => {
              edited()
              setTtl(event.target.value)
            }}
          >
            <option value="default">
              {copy.posts.defaultExpiry.replace(
                '{days}',
                String(space?.couple.retention_days ?? 7),
              )}
            </option>
            <option value="24">{copy.posts.day}</option>
            <option value="7d">{copy.posts.week}</option>
            <option value="keep">{copy.posts.keep}</option>
          </select>
        </label>
        {channel === 'moment' && (
          <label>
            {copy.posts.pin}
            <select
              value={place}
              disabled={busy || recording}
              onChange={(event) => {
                edited()
                setPlace(event.target.value)
              }}
            >
              <option value="">{copy.posts.noPin}</option>
              {live.places.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.emoji} {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button type="submit" disabled={busy || recording}>
          {busy ? copy.posts.sharing : copy.posts.share}
        </Button>
      </div>
      <p className="muted small">
        {ttl === 'keep' ? copy.posts.keepHint : copy.posts.expiryHint}
      </p>
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </form>
  )
}
