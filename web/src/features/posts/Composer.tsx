import { useComposerMemory } from '@/hooks/useComposerMemory'
import { ChoiceSelect } from '@/components/ui/ChoiceSelect'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ImagePlus,
  Mic,
  Smile,
  Type,
  Plus,
  Send,
  X,
  ArrowUpRight,
  Clock3,
  MapPin,
} from 'lucide-react'
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
  const {
    field,
    id: idRef,
    attempted: attemptedRef,
  } = useComposerMemory(channel)
  const [kind, setKind] = field('kind'),
    [body, setBody] = field('body'),
    [mood, setMood] = field('mood'),
    [attachment, setAttachment] = field('attachment'),
    [ttl, setTtl] = field('ttl'),
    [place, setPlace] = field('place'),
    [busy, setBusy] = field('busy'),
    [message, setMessage] = field('message'),
    [more, setMore] = field('more')
  const [recording, setRecording] = useState(false)
  useEffect(() => {
    onBusyChange?.(busy || recording)
  }, [busy, recording, onBusyChange])
  const expiryChoices = [
    {
      value: 'default',
      label: copy.posts.defaultExpiry.replace(
        '{days}',
        String(space?.couple.retention_days ?? 7),
      ),
      note: 'Use your shared setting',
    },
    { value: '24', label: copy.posts.day, note: 'Disappears after one day' },
    { value: '7d', label: copy.posts.week, note: 'Disappears after one week' },
    {
      value: 'keep',
      label: copy.posts.keep,
      note: 'Saved until either of you removes it',
    },
  ]
  const photoInput = useRef<HTMLInputElement>(null)
  function edited() {
    if (attemptedRef.current) {
      idRef.current = crypto.randomUUID()
      attemptedRef.current = false
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
    attemptedRef.current = true
    setBusy(true)
    setMessage('')
    onStopTyping()
    try {
      await sharePost(client, {
        id: idRef.current,
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
      idRef.current = crypto.randomUUID()
      attemptedRef.current = false
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
              <ChoiceSelect
                label={copy.posts.expiry}
                value={ttl}
                options={expiryChoices}
                disabled={busy || recording}
                onChange={(value) => {
                  edited()
                  setTtl(value)
                }}
              />
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
      className="composer moment-studio"
      data-kind={kind}
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {kind === 'photo' && !attachment && (
        <label className="file-picker">
          <span className="photo-picker-art" aria-hidden="true">
            <i />
            <i />
            <ImagePlus size={25} />
          </span>
          <span>Choose photo</span>
          <input
            className="sr-only media-input"
            aria-label={copy.posts.choosePhoto}
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
      {kind === 'voice' && !attachment && (
        <VoiceRecorder
          studio
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
        <div className={`attachment-preview preview-${kind}`}>
          <LocalPreview note={attachment} />
          <button
            className="icon-button remove-preview"
            aria-label={copy.posts.removeAttachment}
            type="button"
            disabled={busy || recording}
            onClick={() => {
              edited()
              setAttachment(undefined)
            }}
          >
            <X size={17} aria-hidden="true" />
          </button>
          {kind === 'photo' && (
            <label className="replace-photo" title="Change photo">
              <ImagePlus size={18} aria-hidden="true" />
              <input
                className="sr-only media-input"
                aria-label="Change photo"
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
        </div>
      )}
      {(kind === 'text' || kind === 'mood' || attachment) && (
        <>
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
        </>
      )}
      <div className="compose-dock">
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
              aria-label={copy.posts.kinds[value]}
              title={copy.posts.kinds[value]}
              onClick={() => mode(value)}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="sr-only">{copy.posts.kinds[value]}</span>
            </button>
          ))}
        </div>
        <Button
          type="submit"
          title="Post"
          aria-label={busy ? copy.posts.sharing : 'Post moment'}
          disabled={
            busy ||
            recording ||
            (kind === 'text' && !body.trim()) ||
            ((kind === 'photo' || kind === 'voice') && !attachment)
          }
        >
          <ArrowUpRight size={22} aria-hidden="true" />
        </Button>
      </div>
      <div className="composer-options">
        <label>
          <Clock3 size={14} aria-hidden="true" />
          <span className="sr-only">{copy.posts.expiry}</span>
          <ChoiceSelect
            label={copy.posts.expiry}
            value={ttl}
            options={expiryChoices}
            disabled={busy || recording}
            onChange={(value) => {
              edited()
              setTtl(value)
            }}
          />
        </label>
        {channel === 'moment' && (
          <label>
            <MapPin size={14} aria-hidden="true" />
            <span className="sr-only">{copy.posts.pin}</span>
            <ChoiceSelect
              label={copy.posts.pin}
              value={place}
              disabled={busy || recording}
              options={[
                { value: '', label: 'Add place' },
                ...(live.places.data ?? []).map((item) => ({
                  value: item.id,
                  label: `${item.emoji} ${item.name}`,
                })),
              ]}
              onChange={(value) => {
                edited()
                setPlace(value)
              }}
            />
          </label>
        )}
      </div>
      {ttl === 'keep' && <p className="muted small">{copy.posts.keepHint}</p>}
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
    </form>
  )
}
