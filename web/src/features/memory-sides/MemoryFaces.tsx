import { useId, useState } from 'react'
import { Rotate3d, Plus, Pencil, Mic, ArrowLeft } from 'lucide-react'
import type { Post } from '@/lib/posts'
import { sidesOf, type MemorySide } from '@/lib/memory-sides'
import { useSpace } from '@/hooks/useSpace'
import { usePrivateMedia } from '@/hooks/usePrivateMedia'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { Avatar } from '@/components/ui/Avatar'
import { PersonLink } from '@/components/ui/PersonLink'
import { PostMedia } from '@/features/posts/PostMedia'
import { SideEditor } from './SideEditor'
import './memory-sides.css'
function Content({ side, post }: { side: MemorySide; post: Post }) {
  const media = usePrivateMedia(side.kind === 'voice' ? side.path : null)
  return (
    <>
      {side.kind === 'photo' && (
        <PostMedia
          post={{
            ...post,
            kind: 'photo',
            media_path: side.path,
            thumb_path: side.thumb_path,
            media_width: side.width,
            media_height: side.height,
            photo_items: [],
            body: side.body,
          }}
        />
      )}
      {side.kind === 'voice' &&
        (media.error ? (
          <button
            className="text-button"
            onClick={() => {
              void media.refetch()
            }}
          >
            Couldn’t open voice. Retry
          </button>
        ) : media.data ? (
          <AudioPlayer
            src={media.data}
            duration={side.duration}
            label="Voice on this memory"
          />
        ) : (
          <p role="status">Opening voice…</p>
        ))}
      {side.body && <p className="memory-side-words">{side.body}</p>}
    </>
  )
}
export function MemoryFaces({
  post,
  timezone,
}: {
  post: Post
  timezone?: string
}) {
  const { data: space } = useSpace(),
    [back, setBack] = useState(false),
    [editing, setEditing] = useState(false),
    id = useId()
  const sides = sidesOf(post),
    own = sides.find((s) => s.author_id === space?.self.user_id)
  const canAdd = !!post.keep && !!space
  return (
    <div className="memory-faces" data-face={back ? 'back' : 'front'}>
      {back ? (
        <section
          id={id}
          className="memory-back"
          aria-label="The other side of this memory"
        >
          {sides.length ? (
            sides.map((side) => {
              const person =
                side.author_id === space?.self.user_id
                  ? space?.self
                  : space?.partner
              const name =
                side.author_id === space?.self.user_id
                  ? space.self.nickname || space.self.display_name
                  : space?.self.partner_nickname ||
                    person?.nickname ||
                    person?.display_name ||
                    'Your person'
              return (
                <article
                  key={`${side.id}:${side.version}`}
                  className="memory-side"
                >
                  <PersonLink
                    id={side.author_id}
                    name={name}
                    className="memory-side-person"
                  >
                    <Avatar
                      name={name}
                      color={person?.color ?? '#A98EFF'}
                      path={person?.avatar_path}
                    />
                    <span>
                      {side.author_id === space?.self.user_id
                        ? 'Your side'
                        : name}
                    </span>
                    {side.kind === 'voice' && (
                      <Mic size={16} aria-hidden="true" />
                    )}
                  </PersonLink>
                  <Content side={side} post={post} />
                </article>
              )
            })
          ) : (
            <p className="muted">No sides added.</p>
          )}
        </section>
      ) : (
        <PostMedia post={post} timezone={timezone} />
      )}
      <div className="memory-turn-actions">
        {!!sides.length && (
          <button
            className="memory-turn"
            aria-expanded={back}
            aria-controls={back ? id : undefined}
            onClick={() => setBack(!back)}
          >
            {back ? <ArrowLeft size={17} /> : <Rotate3d size={18} />}
            <span>
              {back
                ? 'Front'
                : sides.some((s) => s.kind === 'voice')
                  ? 'Voices & sides'
                  : 'The other side'}
            </span>
          </button>
        )}
        {canAdd && (
          <button
            className="memory-add-side"
            aria-label={own ? 'Edit your side' : 'Add your side'}
            onClick={() => setEditing(true)}
          >
            {own ? <Pencil size={16} /> : <Plus size={17} />}
            <span>{own ? 'Your side' : 'Add your side'}</span>
          </button>
        )}
      </div>
      {editing && (
        <SideEditor
          key={`${post.id}:${space?.self.user_id}`}
          post={post}
          own={own}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
