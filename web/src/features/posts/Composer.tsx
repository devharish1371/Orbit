import { PhotoSetDraft } from './PhotoSetDraft'
import { MAX_PHOTOS, type DraftPhoto } from '@/lib/photos'
import { useComposerMemory } from '@/hooks/useComposerMemory'
import { ChoiceSelect } from '@/components/ui/ChoiceSelect'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ImagePlus,
  Mic,
  Smile,
  PenLine,
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
import { ReplyPreview } from './ReplyPreview'
import { useQuotedPosts } from './usePosts'
import { useOutbox } from '@/features/outbox/OutboxContext'
import { useBackLayer } from '@/app/backLayers'
import { useAutoSizeTextArea } from '@/hooks/useAutoSizeTextArea'
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
    [photos, setPhotos] = field('photos'),
    [ttl, setTtl] = field('ttl'),
    [place, setPlace] = field('place'),
    [busy, setBusy] = field('busy'),
    [message, setMessage] = field('message'),
    [more, setMore] = field('more'),
    [noteStyle, setNoteStyle] = field('noteStyle'),
    [replyId, setReplyId] = field('replyId'),
    [retryable, setRetryable] = field('retryable')
  const quoted = useQuotedPosts(channel === 'chat' ? [replyId] : [])
  const formRef = useRef<HTMLFormElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null),
    trayId = useId()
  useAutoSizeTextArea(textarea, body)
  const voiceDraft = kind === 'voice' && !attachment
  const wasVoice = useRef(voiceDraft)
  useLayoutEffect(() => {
    if (wasVoice.current && !voiceDraft)
      textarea.current?.focus({ preventScroll: true })
    wasVoice.current = voiceDraft
  }, [voiceDraft])
  const outbox = useOutbox()
  const [recording, setRecording] = useState(false)
  useBackLayer(channel === 'chat' && voiceDraft, () => {
    setKind('text')
    setRecording(false)
  })
  useBackLayer(more, () => {
    setMore(false)
    formRef.current
      ?.querySelector<HTMLButtonElement>('.composer-plus')
      ?.focus({ preventScroll: true })
  })
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
    setRetryable(false)
    setMessage('')
    if (attemptedRef.current) {
      idRef.current = crypto.randomUUID()
      attemptedRef.current = false
    }
  }
  function mode(next: PostDraft['kind']) {
    edited()
    if (next === kind) return
    setKind(next)
    setPhotos([])
    setAttachment(undefined)
    setMessage('')
  }
  async function photo(files: FileList | null) {
    if (!files?.length || busy) return
    if (photos.length + files.length > MAX_PHOTOS) {
      setMessage('Choose up to 6 photos.')
      return
    }
    edited()
    setBusy(true)
    try {
      const ready: DraftPhoto[] = []
      for (const file of Array.from(files))
        ready.push({
          id: crypto.randomUUID(),
          attachment: await preparePhoto(file),
          caption: '',
        })
      setPhotos((previous) => [...previous, ...ready])
      setAttachment(undefined)
      setKind('photo')
      setMore(false)
    } catch {
      setMessage(copy.posts.photoFailed)
    } finally {
      setBusy(false)
    }
  }
  const photoDraft = (
    <PhotoSetDraft
      photos={photos}
      disabled={busy || recording}
      compact={channel === 'chat'}
      onAdd={() => photoInput.current?.click()}
      onChange={(value) => {
        edited()
        setPhotos(value)
        if (!value.length && channel === 'chat') setKind('text')
      }}
    />
  )
  async function submit(event: FormEvent) {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    if (!space || busy || recording) return
    if (
      (kind === 'text' && !body.trim()) ||
      (kind === 'photo' && !photos.length) ||
      (kind === 'voice' && !attachment)
    ) {
      setMessage(copy.posts.empty)
      return
    }
    attemptedRef.current = true
    setRetryable(false)
    setBusy(true)
    setMessage('')
    onStopTyping()
    try {
      const draft: PostDraft = {
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
        photos: kind === 'photo' ? photos : undefined,
        noteStyle,
        replyTo: replyId,
      }
      if (channel === 'chat' && kind === 'text' && !attachment && outbox) {
        try {
          await outbox.enqueue(draft)
        } catch (storageError) {
          const code =
            storageError &&
            typeof storageError === 'object' &&
            'message' in storageError
              ? String(storageError.message)
              : ''
          if (!navigator.onLine || code.startsWith('DRAFT_')) throw storageError
          // Storage can be denied in private browsers. Online sending still works.
          await sharePost(client, draft)
        }
      } else await sharePost(client, draft)
      idRef.current = crypto.randomUUID()
      attemptedRef.current = false
      setBody('')
      const text = form.querySelector('textarea')
      if (text) text.style.height = 'auto'
      setAttachment(undefined)
      setPhotos([])
      setKind('text')
      setPlace('')
      setReplyId(null)
      setMore(false)
      setMessage(channel === 'chat' ? '' : copy.posts.shared)
    } catch (error) {
      setRetryable(true)
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
        ref={formRef}
        className="messenger-composer"
        data-recording={recording}
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        {replyId && (
          <div className="composer-reply">
            <ReplyPreview
              post={quoted.data?.find((post) => post.id === replyId)}
              loading={quoted.isFetching}
            />
            <button
              className="icon-button"
              type="button"
              aria-label="Cancel reply"
              disabled={busy}
              onClick={() => {
                edited()
                setReplyId(null)
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {photos.length > 0 && photoDraft}
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
                textarea.current?.focus({ preventScroll: true })
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        {more && (
          <div
            className="messenger-more chat-media-tray"
            id={trayId}
            role="group"
            aria-label="Message tools"
          >
            <button
              className="chat-tray-action"
              type="button"
              aria-label={copy.posts.choosePhoto}
              disabled={busy || recording}
              onClick={() => photoInput.current?.click()}
            >
              <span aria-hidden="true">
                <ImagePlus size={21} />
              </span>
              <span>Photo</span>
            </button>
            <button
              className="chat-tray-action"
              type="button"
              aria-label="Voice note"
              disabled={
                busy || recording || Boolean(attachment) || photos.length > 0
              }
              onClick={() => {
                mode('voice')
                setMore(false)
              }}
            >
              <span aria-hidden="true">
                <Mic size={21} />
              </span>
              <span>Voice</span>
            </button>
            <ChoiceSelect
              label={copy.posts.expiry}
              icon={<Clock3 size={21} />}
              value={ttl}
              options={expiryChoices}
              disabled={busy || recording}
              onChange={(value) => {
                edited()
                setTtl(value)
              }}
            />
          </div>
        )}
        {voiceDraft && (
          <div className="chat-voice-draft">
            <VoiceRecorder
              studio
              compact
              disabled={busy}
              onReady={(note) => {
                edited()
                setKind('voice')
                setAttachment(note)
              }}
              onBusy={setRecording}
            />
            <button
              className="icon-button"
              type="button"
              aria-label="Cancel voice note"
              onClick={() => {
                setKind('text')
                setRecording(false)
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}
        <input
          hidden
          ref={photoInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || recording}
          onChange={(event) => {
            void photo(event.target.files)
            event.target.value = ''
          }}
        />
        <div className="messenger-input-row">
          <button
            type="button"
            className="icon-button composer-plus"
            aria-label={copy.posts.more}
            aria-expanded={more}
            aria-controls={more ? trayId : undefined}
            disabled={busy || recording}
            onClick={() => setMore(!more)}
          >
            <Plus size={21} />
          </button>
          <label className="sr-only" htmlFor="chat-message">
            {copy.posts.write}
          </label>
          <textarea
            ref={textarea}
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
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                !voiceDraft &&
                body.trim()
              ) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <div
            hidden={
              (!!(body.trim() || attachment || photos.length) && !recording) ||
              voiceDraft
            }
          >
            <VoiceRecorder
              compact
              disabled={busy || voiceDraft}
              onReady={(note) => {
                edited()
                setKind('voice')
                setAttachment(note)
              }}
              onBusy={setRecording}
            />
          </div>
          {!!(body.trim() || attachment || photos.length) && !recording && (
            <button
              type="submit"
              className="chat-send"
              disabled={busy || voiceDraft}
              aria-label={busy ? copy.posts.sending : copy.posts.send}
            >
              <Send size={20} />
            </button>
          )}
        </div>
        {busy && (
          <p className="composer-feedback" role="status">
            {copy.posts.sending}
          </p>
        )}
        {message && (
          <div className="composer-feedback">
            <p className="form-message" role="status">
              {message}
            </p>
            {retryable && !busy && (
              <button
                className="text-button"
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
              >
                {copy.posts.retrySend}
              </button>
            )}
          </div>
        )}
      </form>
    )
  return (
    <form
      className="composer moment-studio"
      data-kind={kind}
      data-note-style={noteStyle}
      data-long={body.length > 180}
      onSubmit={(event) => {
        void submit(event)
      }}
    >
      {kind === 'photo' && !photos.length && (
        <label className="file-picker">
          <span className="photo-picker-art" aria-hidden="true">
            <i />
            <i />
            <ImagePlus size={25} />
          </span>
          <span>Choose photos</span>
          <input
            className="sr-only media-input"
            aria-label={copy.posts.choosePhoto}
            type="file"
            multiple
            ref={photoInput}
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              void photo(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
      )}
      {kind === 'photo' && photos.length > 0 && photoDraft}
      {kind === 'photo' && photos.length > 0 && (
        <input
          hidden
          ref={photoInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            void photo(event.target.files)
            event.target.value = ''
          }}
        />
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
                  void photo(event.target.files)
                  event.target.value = ''
                }}
              />
            </label>
          )}
        </div>
      )}
      {kind === 'text' && (
        <div className="note-style-picker" role="group" aria-label="Text style">
          {(['ink', 'glow', 'paper'] as const).map((value) => (
            <button
              key={value}
              type="button"
              disabled={busy}
              title={value[0]!.toUpperCase() + value.slice(1)}
              aria-label={value[0]!.toUpperCase() + value.slice(1)}
              aria-pressed={noteStyle === value}
              data-style={value}
              onClick={() => {
                edited()
                setNoteStyle(value)
              }}
            >
              <span>{value[0]!.toUpperCase() + value.slice(1)}</span>
            </button>
          ))}
        </div>
      )}
      {(kind === 'text' ||
        kind === 'mood' ||
        attachment ||
        photos.length > 0) && (
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
              ['text', PenLine],
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
            (kind === 'photo' && !photos.length) ||
            (kind === 'voice' && !attachment)
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
