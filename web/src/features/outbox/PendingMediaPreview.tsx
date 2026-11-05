import { useCallback, useEffect, useRef, useState } from 'react'
import { Images, Mic } from 'lucide-react'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import type { PostDraft } from '@/lib/posts'
import type { PendingMedia } from './model'
import { useOutbox } from './OutboxContext'
export function PendingMediaPreview({ item }: { item: PendingMedia }) {
  const preview = useOutbox()?.preview,
    trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false),
    [attempt, setAttempt] = useState(0),
    [draft, setDraft] = useState<PostDraft>(),
    [error, setError] = useState(false),
    [index, setIndex] = useState(0)
  const position = useRef(0),
    objectUrl = useRef<string | undefined>(undefined)
  const [image, setImage] = useState<{ blob: Blob; url: string }>()
  const showPhoto = useCallback((blob?: Blob) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = blob ? URL.createObjectURL(blob) : undefined
    setImage(blob ? { blob, url: objectUrl.current! } : undefined)
  }, [])
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )
  useEffect(() => {
    if (!open || !preview) return
    let active = true
    void preview(item.id)
      .then((value) => {
        if (active) {
          setDraft(value)
          showPhoto(value.photos?.[position.current]?.attachment.blob)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [open, preview, item.id, attempt, showPhoto])
  const photo = draft?.photos?.[index]
  const select = (next: number) => {
    position.current = next
    setIndex(next)
    showPhoto(draft?.photos?.[next]?.attachment.blob)
  }
  const count = item.photos?.length ?? 1,
    voice = item.kind === 'voice'
  const close = () => {
    setOpen(false)
    setDraft(undefined)
    showPhoto(undefined)
    setError(false)
    setIndex(0)
    position.current = 0
  }
  const retry = () => {
    setError(false)
    setAttempt((value) => value + 1)
  }
  return (
    <>
      <button
        type="button"
        className="pending-media-preview"
        ref={trigger}
        onClick={() => setOpen(true)}
        aria-label={
          voice
            ? 'Preview pending voice note'
            : `Preview pending ${count} ${count === 1 ? 'photo' : 'photos'}`
        }
      >
        {voice ? (
          <Mic size={19} aria-hidden="true" />
        ) : (
          <Images size={19} aria-hidden="true" />
        )}
        <span>
          {voice
            ? 'Voice note'
            : `${count} ${count === 1 ? 'photo' : 'photos'}`}
        </span>
      </button>
      {open && !voice && (
        <ImageViewer
          title="Pending photos"
          label="Pending photos"
          alt={photo?.caption || item.body || 'Pending photo'}
          src={photo?.attachment.blob === image?.blob ? image?.url : undefined}
          width={photo?.attachment.width}
          height={photo?.attachment.height}
          error={error}
          caption={photo?.caption || item.body}
          transitionName={`orbit-pending-${item.id}`}
          returnFocus={trigger}
          onClose={close}
          onRetry={retry}
          navigation={{
            index,
            count: draft ? count : 1,
            onPrevious: () => select(Math.max(0, index - 1)),
            onNext: () => select(Math.min(count - 1, index + 1)),
          }}
        />
      )}
      {open && voice && (
        <DialogSheet title="Pending voice note" onClose={close}>
          {draft?.attachment ? (
            <AudioPlayer
              blob={draft.attachment.blob}
              label="Pending voice note"
              duration={draft.attachment.duration}
              waveform={draft.attachment.waveform}
            />
          ) : error ? (
            <div role="status">
              <p>Couldn’t open this copy.</p>
              <button type="button" className="text-button" onClick={retry}>
                Try again
              </button>
            </div>
          ) : (
            <p role="status">Opening voice note…</p>
          )}
        </DialogSheet>
      )}
    </>
  )
}
