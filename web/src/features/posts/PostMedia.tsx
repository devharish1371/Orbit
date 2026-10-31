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
export function PostMedia({ post }: { post: Post }) {
  const [visible, setVisible] = useState(
      typeof IntersectionObserver === 'undefined',
    ),
    [open, setOpen] = useState(false)
  const node = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null)
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
  if (!post.media_path) return null
  return (
    <div
      ref={node}
      className={post.kind === 'photo' ? 'post-photo' : 'post-voice'}
    >
      {post.kind === 'photo' ? (
        <button
          type="button"
          className="photo-open"
          aria-label={copy.posts.openPhoto}
          style={{
            aspectRatio: `${post.media_width ?? 4} / ${post.media_height ?? 3}`,
          }}
          onClick={() => setOpen(true)}
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
      {open && (
        <dialog
          className="photo-dialog"
          ref={dialog}
          onCancel={() => setOpen(false)}
        >
          <button
            autoFocus
            type="button"
            className="button button-secondary"
            onClick={() => setOpen(false)}
          >
            {copy.posts.closePhoto}
          </button>
          <Asset path={post.media_path} alt={post.body ?? copy.posts.photo} />
        </dialog>
      )}
    </div>
  )
}
