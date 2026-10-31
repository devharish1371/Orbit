import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Post } from '@/lib/posts'
import { copy } from '@/copy/en'
import { useSignedMedia } from './usePosts'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
function Asset({
  path,
  alt,
  audio = false,
  waveform,
  duration,
}: {
  path: string
  alt: string
  audio?: boolean
  waveform?: number[] | null
  duration?: number | null
}) {
  const url = useSignedMedia(path),
    [failed, setFailed] = useState(false)
  if (url.error || failed)
    return (
      <div className="media-unavailable">
        <p>{copy.posts.mediaFailed}</p>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setFailed(false)
            void url.refetch()
          }}
        >
          {copy.common.retry}
        </button>
      </div>
    )
  if (!url.data)
    return (
      <div
        className="skeleton media-skeleton"
        role="status"
        aria-label={copy.common.loading}
      />
    )
  return audio ? (
    <AudioPlayer
      key={url.data}
      src={url.data}
      label={alt}
      waveform={waveform}
      duration={duration}
      onError={() => setFailed(true)}
    />
  ) : (
    <img
      src={url.data}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
export function PostMedia({
  post,
  timezone,
}: {
  post: Post
  timezone?: string
}) {
  const [visible, setVisible] = useState(
      typeof IntersectionObserver === 'undefined',
    ),
    [open, setOpen] = useState(false),
    [zoomed, setZoomed] = useState(false)
  const node = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (visible || !node.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(node.current)
    return () => observer.disconnect()
  }, [visible])
  useEffect(() => {
    const element = dialog.current
    if (open) element?.showModal()
    return () => element?.close()
  }, [open])
  function closeViewer() {
    dialog.current?.close()
    setOpen(false)
    trigger.current?.focus({ preventScroll: true })
  }
  if (!post.media_path) return null
  return (
    <div
      ref={node}
      className={post.kind === 'photo' ? 'post-photo' : 'post-voice'}
    >
      {post.kind === 'photo' ? (
        <button
          ref={trigger}
          type="button"
          className="photo-open"
          aria-label={copy.posts.openPhoto}
          style={{
            aspectRatio: `${post.media_width ?? 4} / ${post.media_height ?? 3}`,
          }}
          onClick={() => {
            setZoomed(false)
            setOpen(true)
          }}
        >
          {visible ? (
            <Asset
              path={post.thumb_path ?? post.media_path}
              alt={post.body ?? copy.posts.photo}
            />
          ) : (
            <div className="skeleton media-skeleton" />
          )}
        </button>
      ) : (
        <>
          {visible && (
            <Asset
              path={post.media_path}
              alt={copy.posts.voice}
              audio
              waveform={post.waveform}
              duration={post.media_duration_s}
            />
          )}
        </>
      )}
      {open &&
        createPortal(
          <dialog
            className="photo-dialog"
            ref={dialog}
            aria-label="Shared photo"
            onCancel={(event) => {
              event.preventDefault()
              closeViewer()
            }}
            onClose={() => {
              setOpen(false)
              trigger.current?.focus({ preventScroll: true })
            }}
          >
            <header className="photo-viewer-header">
              <div>
                <strong>Photo</strong>
                <time dateTime={post.created_at}>
                  {new Intl.DateTimeFormat('en-IN', {
                    dateStyle: 'medium',
                    timeZone: timezone,
                  }).format(new Date(post.created_at))}
                </time>
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
                  aria-label={copy.posts.closePhoto}
                  onClick={closeViewer}
                >
                  <X size={22} />
                </button>
              </div>
            </header>
            <div className="photo-viewer-stage">
              <div
                className={`photo-zoom-content ${zoomed ? 'is-zoomed' : ''}`}
              >
                <Asset
                  path={post.media_path}
                  alt={post.body ?? copy.posts.photo}
                />
              </div>
            </div>
            {post.body && <p className="photo-viewer-caption">{post.body}</p>}
          </dialog>,
          document.body,
        )}
    </div>
  )
}
