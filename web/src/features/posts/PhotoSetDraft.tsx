import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react'
import { MAX_PHOTOS, movePhoto, type DraftPhoto } from '@/lib/photos'
import './photo-sets.css'
function DraftImage({ photo, alt = '' }: { photo: DraftPhoto; alt?: string }) {
  const attach = useCallback(
    (node: HTMLImageElement | null) => {
      if (!node) return
      const url = URL.createObjectURL(photo.attachment.blob)
      node.src = url
      return () => URL.revokeObjectURL(url)
    },
    [photo.attachment.blob],
  )
  return <img ref={attach} alt={alt} />
}
export function PhotoSetDraft({
  photos,
  disabled,
  compact = false,
  onChange,
  onAdd,
}: {
  photos: DraftPhoto[]
  disabled: boolean
  compact?: boolean
  onChange: (photos: DraftPhoto[]) => void
  onAdd: () => void
}) {
  const [selected, setSelected] = useState<string>()
  const at = Math.max(
    0,
    photos.findIndex((photo) => photo.id === selected),
  )
  const photo = photos[at]
  const railRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const reveal = () => {
      const selected = rail.querySelector('button[aria-pressed="true"]')
      if (!selected) return
      const item = selected.getBoundingClientRect(),
        bounds = rail.getBoundingClientRect()
      const delta =
        item.left < bounds.left + 4
          ? item.left - bounds.left - 4
          : item.right > bounds.right - 4
            ? item.right - bounds.right + 4
            : 0
      if (delta) rail.scrollBy?.({ left: delta, behavior: 'instant' })
    }
    reveal()
    const resize =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(reveal)
    resize?.observe(rail)
    return () => resize?.disconnect()
  }, [photo?.id, at, photos.length])
  if (!photo) return null
  return (
    <section
      className="photo-set-draft"
      data-compact={compact}
      aria-label="Photo set"
    >
      <div className="photo-set-preview">
        <DraftImage photo={photo} alt={`Photo ${at + 1} preview`} />
        <span className="photo-set-position" aria-live="polite">
          {at + 1} / {photos.length}
        </span>
        <button
          className="icon-button photo-set-remove"
          type="button"
          aria-label={`Remove photo ${at + 1}`}
          disabled={disabled}
          onClick={() => {
            setSelected(photos[at + 1]?.id ?? photos[at - 1]?.id)
            onChange(photos.filter((item) => item.id !== photo.id))
          }}
        >
          <X size={18} />
        </button>
      </div>
      <div className="photo-set-rail" role="group" aria-label="Arrange photos">
        <div className="photo-set-thumbnails" ref={railRef}>
          {photos.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Select photo ${index + 1}`}
              aria-pressed={item.id === photo.id}
              disabled={disabled}
              onClick={() => setSelected(item.id)}
            >
              <DraftImage photo={item} />
            </button>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              className="photo-set-add"
              aria-label="Add photos"
              disabled={disabled}
              onClick={onAdd}
            >
              <ImagePlus size={20} />
            </button>
          )}
        </div>
        {photos.length > 1 && (
          <div className="photo-set-order">
            <button
              type="button"
              className="icon-button"
              disabled={disabled || at === 0}
              aria-label="Move photo earlier"
              onClick={() => {
                setSelected(photo.id)
                onChange(movePhoto(photos, photo.id, -1))
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              disabled={disabled || at === photos.length - 1}
              aria-label="Move photo later"
              onClick={() => {
                setSelected(photo.id)
                onChange(movePhoto(photos, photo.id, 1))
              }}
            >
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
      {(photos.length > 1 || photo.caption) && (
        <label className="photo-set-caption">
          <span className="sr-only">Caption for photo {at + 1}</span>
          <input
            type="text"
            placeholder="A caption for this one…"
            maxLength={400}
            value={photo.caption}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                photos.map((item) =>
                  item.id === photo.id
                    ? { ...item, caption: event.target.value }
                    : item,
                ),
              )
            }
          />
        </label>
      )}
    </section>
  )
}
