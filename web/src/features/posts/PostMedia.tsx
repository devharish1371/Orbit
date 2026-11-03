import { useEffect, useId, useRef, useState } from 'react'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { imagePreview, type ImagePreview } from '@/components/ui/imagePreview'
import { SharedImage } from '@/components/ui/SharedImage'
import { changeImageSurface } from '@/app/imageMotion'
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
    [preview, setPreview] = useState<ImagePreview>()
  const node = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null)
  const uid = useId(),
    transitionName = `orbit-photo-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const full = useSignedMedia(
    post.kind === 'photo' ? post.media_path : null,
    open,
  )
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
  function closeViewer(animate = false) {
    changeImageSurface(() => setOpen(false), animate)
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
          aria-haspopup="dialog"
          aria-expanded={open}
          style={{
            aspectRatio: `${post.media_width ?? 4} / ${post.media_height ?? 3}`,
          }}
          onClick={() => {
            const ready = imagePreview(trigger.current)
            setPreview(ready)
            changeImageSurface(() => setOpen(true), Boolean(ready))
          }}
        >
          <SharedImage name={open ? null : transitionName}>
            {visible ? (
              <Asset
                path={post.thumb_path ?? post.media_path}
                alt={post.body ?? copy.posts.photo}
              />
            ) : (
              <div className="skeleton media-skeleton" />
            )}
          </SharedImage>
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
      {open && (
        <ImageViewer
          title="Photo"
          alt={post.body ?? copy.posts.photo}
          src={full.data}
          preview={preview}
          width={post.media_width}
          height={post.media_height}
          error={Boolean(full.error)}
          caption={post.body}
          date={{
            iso: post.created_at,
            label: new Intl.DateTimeFormat('en-IN', {
              dateStyle: 'medium',
              timeZone: timezone,
            }).format(new Date(post.created_at)),
          }}
          transitionName={transitionName}
          returnFocus={trigger}
          onRetry={() => {
            void full.refetch()
          }}
          onClose={closeViewer}
        />
      )}
    </div>
  )
}
