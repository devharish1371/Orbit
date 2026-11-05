import './image-viewer.css'
import { createPortal } from 'react-dom'
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { SharedImage } from './SharedImage'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'

import type { ImagePreview } from './imagePreview'
function ImageLayers({
  src,
  preview,
  alt,
  error,
  onRetry,
}: {
  src?: string
  preview?: ImagePreview
  alt: string
  error: boolean
  onRetry: () => void
}) {
  const [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false),
    [previewFailed, setPreviewFailed] = useState(false)
  const unavailable = error || failed
  return (
    <>
      {preview && !previewFailed && (
        <img
          className="viewer-preview"
          src={preview.src}
          alt=""
          aria-hidden="true"
          onError={() => setPreviewFailed(true)}
          style={{ opacity: loaded ? 0 : 1 }}
        />
      )}
      {src && (
        <img
          className="viewer-full"
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{ opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {!loaded && (
        <div
          className={`viewer-image-state ${preview ? 'has-preview' : ''}`}
          role="status"
        >
          {unavailable ? (
            <>
              <span>Couldn’t load the photo.</span>
              <button
                className="icon-button"
                aria-label="Retry photo"
                onClick={onRetry}
              >
                <RotateCcw size={19} />
              </button>
            </>
          ) : (
            <span className="viewer-loading-orbit" aria-label="Loading photo">
              <i />
              <i />
            </span>
          )}
        </div>
      )}
    </>
  )
}
/** Same viewer for portraits and shared photos; signed URLs and previews remain memory-only. */
export function ImageViewer({
  title,
  label = 'Shared photo',
  alt,
  src,
  preview,
  width,
  height,
  error = false,
  caption,
  date,
  transitionName,
  returnFocus,
  onRetry,
  onClose,
  navigation,
}: {
  navigation?: {
    index: number
    count: number
    onPrevious: () => void
    onNext: () => void
  }
  title: string
  label?: string
  alt: string
  src?: string
  preview?: ImagePreview
  width?: number | null
  height?: number | null
  error?: boolean
  caption?: string | null
  date?: { iso: string; label: string }
  transitionName: string
  returnFocus: RefObject<HTMLElement | null>
  onRetry: () => void
  onClose: (animate?: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    captionId = useId(),
    touch = useRef<{ x: number; y: number } | null>(null)
  const [zoomed, setZoomed] = useState(false),
    [attempt, setAttempt] = useState(0)
  const motion = useMotionAllowed()
  const ratio = Math.min(
    8,
    Math.max(
      0.125,
      (width || preview?.width || 1) / (height || preview?.height || 1),
    ),
  )
  useLayoutEffect(() => {
    const node = dialog.current,
      target = returnFocus.current
    node?.showModal()
    return () => {
      node?.close()
      if (target?.isConnected) target.focus({ preventScroll: true })
    }
  }, [returnFocus])
  return createPortal(
    <dialog
      ref={dialog}
      className="photo-dialog"
      data-image-flow={motion}
      aria-label={label}
      aria-describedby={caption ? captionId : undefined}
      onKeyDown={(event) => {
        if (
          zoomed ||
          !navigation ||
          event.altKey ||
          event.metaKey ||
          event.ctrlKey ||
          (event.target instanceof Element &&
            event.target.closest('input,textarea,select'))
        )
          return
        if (event.key === 'ArrowLeft' && navigation.index > 0) {
          event.preventDefault()
          navigation.onPrevious()
        }
        if (
          event.key === 'ArrowRight' &&
          navigation.index < navigation.count - 1
        ) {
          event.preventDefault()
          navigation.onNext()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose(false)
      }}
    >
      <header className="photo-viewer-header">
        <div>
          <strong>{title}</strong>
          {date && <time dateTime={date.iso}>{date.label}</time>}
        </div>
        <div>
          <button
            type="button"
            className="icon-button"
            aria-label={zoomed ? 'Fit photo' : 'Zoom photo'}
            aria-pressed={zoomed}
            onClick={() => setZoomed(!zoomed)}
          >
            {zoomed ? <ZoomOut size={21} /> : <ZoomIn size={21} />}
          </button>
          <button
            autoFocus
            type="button"
            className="icon-button"
            aria-label="Close photo"
            onClick={() => onClose(true)}
          >
            <X size={22} />
          </button>
        </div>
      </header>
      <div
        className="photo-viewer-stage"
        onTouchStart={(event) => {
          if (event.touches.length !== 1 || zoomed || !navigation) {
            touch.current = null
            return
          }
          touch.current = {
            x: event.touches[0]!.clientX,
            y: event.touches[0]!.clientY,
          }
        }}
        onTouchCancel={() => {
          touch.current = null
        }}
        onTouchEnd={(event) => {
          const start = touch.current
          touch.current = null
          if (
            !start ||
            zoomed ||
            !navigation ||
            event.changedTouches.length !== 1
          )
            return
          const dx = event.changedTouches[0]!.clientX - start.x,
            dy = event.changedTouches[0]!.clientY - start.y
          if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
          if (dx < 0 && navigation.index < navigation.count - 1)
            navigation.onNext()
          if (dx > 0 && navigation.index > 0) navigation.onPrevious()
        }}
      >
        <div className={`photo-zoom-content ${zoomed ? 'is-zoomed' : ''}`}>
          <SharedImage name={transitionName}>
            <div
              className="viewer-image-pair"
              style={{ '--photo-ratio': ratio } as CSSProperties}
              onDoubleClick={(event) => {
                if (
                  event.target instanceof Element &&
                  event.target.closest('button')
                )
                  return
                setZoomed(!zoomed)
              }}
            >
              <ImageLayers
                key={`${src ?? 'pending'}:${attempt}`}
                src={src}
                preview={preview}
                alt={alt}
                error={error}
                onRetry={() => {
                  setAttempt((v) => v + 1)
                  onRetry()
                }}
              />
            </div>
          </SharedImage>
        </div>
      </div>
      {navigation && navigation.count > 1 && (
        <nav className="viewer-photo-nav" aria-label="Photos">
          <button
            className="icon-button"
            type="button"
            aria-label="Previous photo"
            disabled={zoomed || navigation.index === 0}
            onClick={navigation.onPrevious}
          >
            <ArrowLeft size={21} />
          </button>
          <output aria-live="polite" aria-label="Photo position">
            {navigation.index + 1} / {navigation.count}
          </output>
          <button
            className="icon-button"
            type="button"
            aria-label="Next photo"
            disabled={zoomed || navigation.index === navigation.count - 1}
            onClick={navigation.onNext}
          >
            <ArrowRight size={21} />
          </button>
        </nav>
      )}
      {caption && (
        <p id={captionId} className="photo-viewer-caption">
          {caption}
        </p>
      )}
    </dialog>,
    document.body,
  )
}
