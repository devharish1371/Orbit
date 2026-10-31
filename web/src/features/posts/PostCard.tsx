import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  MapPin,
  Sparkles,
  MessageCircle,
  Undo2,
  MoreHorizontal,
  Copy,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Avatar } from '@/components/ui/Avatar'
import { copy } from '@/copy/en'
import { mediaError, remaining, validReaction, type Post } from '@/lib/posts'
import type { Database } from '@/lib/database.types'
import { PostMedia } from './PostMedia'
import { Comments } from './Comments'
type Reaction = Database['public']['Tables']['reactions']['Row']
export function PostCard({
  post,
  reactions,
  now,
}: {
  post: Post
  reactions: Reaction[]
  now: number
}) {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [comments, setComments] = useState(false),
    [confirm, setConfirm] = useState(false),
    [picker, setPicker] = useState(false),
    [custom, setCustom] = useState(''),
    [actions, setActions] = useState(false)
  const press = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    origin = useRef({ x: 0, y: 0 }),
    held = useRef(false)
  useEffect(() => () => clearTimeout(press.current), [])
  const chat = post.channel === 'chat',
    own = post.author_id === session?.user.id,
    author = own ? space?.self : space?.partner,
    expiry = remaining(post, now)
  const selected = reactions.find(
    (row) => row.user_id === session?.user.id,
  )?.emoji
  async function action(run: () => PromiseLike<{ error: unknown }>) {
    if (busy) return
    setBusy(true)
    setMessage('')
    try {
      const result = await run()
      if (result.error) throw result.error
      setConfirm(false)
      setPicker(false)
      setActions(false)
    } catch (error) {
      setMessage(copy.posts.errors[mediaError(error)])
    } finally {
      setBusy(false)
      for (const key of [
        'posts',
        'post-reactions',
        'storage-summary',
        'expiring',
        'kept-memories',
      ])
        void query.invalidateQueries({ queryKey: [key] })
    }
  }
  function react(emoji: string) {
    void action(() =>
      client.rpc('set_post_reaction', {
        p_id: post.id,
        ...(selected === emoji ? {} : { p_emoji: emoji }),
      }),
    )
  }
  function customReaction(event: FormEvent) {
    event.preventDefault()
    const emoji = custom.trim()
    if (validReaction(emoji)) {
      react(emoji)
      setCustom('')
    } else setMessage(copy.posts.invalidEmoji)
  }
  const emojiChoices =
    chat && !actions
      ? [...new Set(reactions.map((row) => row.emoji))]
      : [
          ...new Set([
            '❤️',
            '😂',
            '🥺',
            '🔥',
            '👏',
            ...reactions.map((row) => row.emoji),
          ]),
        ]
  return (
    <article
      className={`glass post-card ${chat ? `chat-bubble ${own ? 'chat-own' : 'chat-partner'}` : ''}`}
      id={`post-${post.id}`}
      style={{ '--bubble-color': author?.color ?? '#FF6B8A' } as CSSProperties}
      onContextMenu={(event) => {
        if (chat) {
          event.preventDefault()
          setActions(true)
        }
      }}
      onPointerDown={(event) => {
        if (
          chat &&
          event.pointerType === 'touch' &&
          !(event.target as HTMLElement).closest('button, input, a, audio')
        ) {
          held.current = false
          origin.current = { x: event.clientX, y: event.clientY }
          press.current = setTimeout(() => {
            held.current = true
            setActions(true)
          }, 450)
        }
      }}
      onPointerMove={(event) => {
        if (
          Math.hypot(
            event.clientX - origin.current.x,
            event.clientY - origin.current.y,
          ) > 10
        )
          clearTimeout(press.current)
      }}
      onPointerUp={() => clearTimeout(press.current)}
      onPointerCancel={() => clearTimeout(press.current)}
      onClickCapture={(event) => {
        if (held.current) {
          event.preventDefault()
          event.stopPropagation()
          held.current = false
        }
      }}
    >
      {!chat && (
        <header className="post-author">
          <Avatar
            name={author?.display_name ?? '?'}
            color={author?.color ?? '#FF6B8A'}
            path={author?.avatar_path}
          />
          <div>
            <strong>
              {own
                ? copy.posts.you
                : space?.self.partner_nickname ||
                  author?.nickname ||
                  author?.display_name}
            </strong>
            <time dateTime={post.created_at}>
              {new Intl.DateTimeFormat('en-IN', {
                timeZone: space?.couple.timezone,
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }).format(new Date(post.created_at))}
            </time>
          </div>
          <span
            className={`expiry-ring ${post.keep ? 'is-kept' : ''}`}
            role="img"
            style={
              { '--expiry': `${expiry.fraction * 360}deg` } as CSSProperties
            }
            aria-label={
              post.keep
                ? copy.posts.kept
                : copy.posts.fades.replace('{time}', expiry.label)
            }
          >
            {post.keep ? <Sparkles size={14} /> : expiry.label}
          </span>
        </header>
      )}
      {['photo', 'voice'].includes(post.kind) && (
        <PostMedia post={post} timezone={space?.couple.timezone} />
      )}
      {post.body && (
        <p className={`post-body ${post.kind === 'mood' ? 'post-mood' : ''}`}>
          {post.body}
        </p>
      )}
      {post.lat !== null && post.lng !== null && (
        <p className="post-pin muted small">
          <MapPin size={14} />
          {copy.posts.pinned}
        </p>
      )}
      {chat && (
        <div className="chat-message-meta">
          {post.keep && <Sparkles size={11} aria-label={copy.posts.kept} />}
          <time dateTime={post.created_at}>
            {new Intl.DateTimeFormat('en-IN', {
              timeZone: space?.couple.timezone,
              hour: 'numeric',
              minute: '2-digit',
            }).format(new Date(post.created_at))}
          </time>
          {chat && (
            <button
              className="chat-message-menu"
              type="button"
              aria-label={copy.posts.messageOptions}
              aria-expanded={actions}
              onClick={() => setActions(!actions)}
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>
      )}
      {(emojiChoices.length > 0 || !chat || actions) && (
        <div
          className={`post-reactions ${chat && !actions ? 'reaction-summary' : ''}`}
          aria-label={copy.posts.reactions}
        >
          {emojiChoices.map((emoji) => {
            const count = reactions.filter((row) => row.emoji === emoji).length
            return (
              <button
                type="button"
                key={emoji}
                disabled={busy}
                aria-label={emoji}
                aria-pressed={selected === emoji}
                onClick={() => react(emoji)}
              >
                {emoji}
                {count > 0 && <span>{count}</span>}
              </button>
            )
          })}
          {(!chat || actions) && (
            <button
              type="button"
              disabled={busy}
              aria-label={copy.posts.customReaction}
              aria-expanded={picker}
              onClick={() => setPicker(!picker)}
            >
              +
            </button>
          )}
        </div>
      )}
      {picker && (
        <form className="custom-reaction" onSubmit={customReaction}>
          <label htmlFor={`emoji-${post.id}`}>
            {copy.posts.customReaction}
          </label>
          <input
            id={`emoji-${post.id}`}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            maxLength={32}
            placeholder="🫶"
          />
          <button className="text-button" disabled={busy} type="submit">
            {copy.posts.react}
          </button>
        </form>
      )}
      {(!chat || actions) && (
        <footer className="post-actions">
          <button
            type="button"
            disabled={busy}
            className={`text-button ${post.keep ? 'is-kept' : ''}`}
            aria-pressed={post.keep}
            onClick={() => {
              void action(() =>
                client
                  .from('posts')
                  .update({ keep: !post.keep })
                  .eq('id', post.id)
                  .select('id')
                  .single(),
              )
            }}
          >
            <Sparkles size={16} />
            {post.keep ? copy.posts.unkeep : copy.posts.keep}
          </button>
          {!chat && (
            <button
              className="text-button"
              type="button"
              aria-expanded={comments}
              onClick={() => setComments(!comments)}
            >
              <MessageCircle size={16} />
              {copy.posts.comments}
            </button>
          )}
          {chat && post.body && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(post.body!)
                  .then(() => setMessage(copy.posts.copied))
                  .catch(() => setMessage(copy.posts.errors.failed))
              }}
            >
              <Copy size={15} />
              {copy.posts.copyText}
            </button>
          )}
          {own && (
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={() => setConfirm(true)}
            >
              <Undo2 size={15} />
              {copy.posts.unsend}
            </button>
          )}
        </footer>
      )}
      {confirm && (
        <div
          className="unsend-confirm"
          role="group"
          aria-label={copy.posts.unsendTitle}
        >
          <p>{copy.posts.unsendTitle}</p>
          <p className="muted small">
            {post.keep ? copy.posts.unsendKept : copy.posts.unsendHint}
          </p>
          <div className="attention-buttons">
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => {
                void action(() =>
                  client.rpc('request_unsend', { p_id: post.id }),
                )
              }}
            >
              {copy.posts.unsendBoth}
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setConfirm(false)}
            >
              {copy.posts.cancel}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
      {comments && !chat && <Comments post={post} />}
    </article>
  )
}
