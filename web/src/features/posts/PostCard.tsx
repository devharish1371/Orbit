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
  Heart,
  Reply,
  Pencil,
  Check,
  Pin,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Avatar } from '@/components/ui/Avatar'
import { copy } from '@/copy/en'
import {
  canEditChat,
  mediaError,
  remaining,
  validReaction,
  type Post,
} from '@/lib/posts'
import type { Database } from '@/lib/database.types'
import { PostMedia } from './PostMedia'
import { MemoryFaces } from '@/features/memory-sides/MemoryFaces'
import { Comments } from './Comments'
import { PersonLink } from '@/components/ui/PersonLink'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { ReplyPreview } from './ReplyPreview'
import { EditMessage } from './EditMessage'
import { useBackLayer } from '@/app/backLayers'
type Reaction = Database['public']['Tables']['reactions']['Row']
export function PostCard({
  post,
  reactions,
  now,
  quote,
  quoteLoading,
  onReply,
  onOpenQuote,
  enablePin = false,
  pinned = false,
}: {
  post: Post
  reactions: Reaction[]
  now: number
  quote?: Post
  quoteLoading?: boolean
  onReply?: (post: Post) => void
  onOpenQuote?: (id: string) => void
  enablePin?: boolean
  pinned?: boolean
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
  const [reacting, setReacting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [burst, setBurst] = useState<{ emoji: string; key: number } | null>(
    null,
  )
  useEffect(() => {
    if (!burst) return
    const timer = setTimeout(() => setBurst(null), 950)
    return () => clearTimeout(timer)
  }, [burst])
  const card = useRef<HTMLElement>(null)
  function closeActions() {
    setActions(false)
    setReacting(false)
    setPicker(false)
    card.current
      ?.querySelector<HTMLButtonElement>(
        '.chat-message-menu, .moment-react-trigger',
      )
      ?.focus({ preventScroll: true })
  }
  useBackLayer(actions || reacting || picker, closeActions)
  useEffect(() => {
    if (!reacting) return
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !card.current?.contains(event.target)
      ) {
        setReacting(false)
        setPicker(false)
      }
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [reacting])
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
  const authorName = own
    ? copy.posts.you
    : space?.self.partner_nickname ||
      author?.nickname ||
      author?.display_name ||
      'your person'
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
      setReacting(false)
    } catch (error) {
      setMessage(copy.posts.errors[mediaError(error)])
    } finally {
      setBusy(false)
      for (const key of [
        'posts',
        'chat-pin',
        'post-reactions',
        'storage-summary',
        'expiring',
        'on-this-day',
        'kept-memories',
        'collections',
        'collection-links',
      ])
        void query.invalidateQueries({ queryKey: [key] })
    }
  }
  function react(emoji: string) {
    if (busy) return
    setBurst((previous) => ({ emoji, key: (previous?.key ?? 0) + 1 }))
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
    (chat && !actions) || (!chat && !reacting)
      ? [...new Set(reactions.map((row) => row.emoji))]
      : [
          ...new Set([
            '❤️',
            '😂',
            '🥺',
            '🔥',
            ...(chat ? ['👏'] : []),
            ...(chat ? reactions.map((row) => row.emoji) : []),
          ]),
        ]
  return (
    <article
      ref={card}
      className={`glass post-card ${chat ? `chat-bubble ${own ? 'chat-own' : 'chat-partner'}` : ''}`}
      id={`post-${post.id}`}
      data-kind={post.kind}
      data-own={own}
      onKeyDown={(event) => {
        if (
          event.key === 'Escape' &&
          !document.querySelector('dialog[open]') &&
          (actions || reacting || picker)
        ) {
          event.preventDefault()
          closeActions()
        }
      }}
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
      {!chat && burst && (
        <span className="reaction-burst" aria-hidden="true" key={burst.key}>
          <span>{burst.emoji}</span>
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} style={{ '--petal': i } as CSSProperties} />
          ))}
        </span>
      )}
      {!chat && (
        <header className="post-author">
          <PersonLink
            id={author?.user_id}
            name={authorName}
            className="profile-face"
          >
            <Avatar
              name={author?.display_name ?? '?'}
              color={author?.color ?? '#FF6B8A'}
              path={author?.avatar_path}
            />
          </PersonLink>
          <div>
            <strong>
              <PersonLink id={author?.user_id} name={authorName}>
                {own
                  ? copy.posts.you
                  : space?.self.partner_nickname ||
                    author?.nickname ||
                    author?.display_name}
              </PersonLink>
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
      {chat && post.reply_to_id && (
        <ReplyPreview
          post={quote}
          loading={quoteLoading}
          onOpen={onOpenQuote}
        />
      )}
      {['photo', 'voice'].includes(post.kind) &&
        (post.kind === 'photo' && post.keep ? (
          <MemoryFaces post={post} timezone={space?.couple.timezone} />
        ) : (
          <PostMedia post={post} timezone={space?.couple.timezone} />
        ))}
      {post.body && (
        <p
          className={`post-body ${post.kind === 'mood' ? 'post-mood' : ''}`}
          data-note-style={
            !chat && post.kind === 'text'
              ? (post.note_style ?? 'ink')
              : undefined
          }
          data-long={post.body.length > 180}
          data-expanded={expanded}
        >
          {post.body}
        </p>
      )}
      {!chat && post.kind === 'text' && post.body && post.body.length > 280 && (
        <button
          className="note-expand text-button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Less' : 'More'}
        </button>
      )}
      {post.lat !== null && post.lng !== null && (
        <p className="post-pin muted small">
          <MapPin size={14} />
          {copy.posts.pinned}
        </p>
      )}
      {chat && (
        <div className="chat-message-meta">
          {post.edited_at && (
            <span title={new Date(post.edited_at).toLocaleString()}>
              edited
            </span>
          )}
          {own && <Check size={12} aria-label="Sent to Orbit" />}
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
      {(emojiChoices.length > 0 || reacting || actions) && (
        <div
          className={`post-reactions ${!chat && reacting ? 'moment-reaction-palette' : (chat && !actions) || !chat ? 'reaction-summary' : ''}`}
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
          {((!chat && reacting) || actions) && (
            <button
              type="button"
              disabled={busy}
              aria-label={copy.posts.customReaction}
              aria-expanded={picker}
              onClick={() => {
                setPicker(!picker)
                if (!chat) setReacting(false)
              }}
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
          {chat && enablePin && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                void action(() =>
                  client.rpc('set_chat_pin', {
                    p_post_id: post.id,
                    p_remove: pinned,
                  }),
                )
              }}
            >
              <Pin size={16} />
              {pinned ? 'Unpin' : 'Pin for 24h'}
            </button>
          )}
          {chat && onReply && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setActions(false)
                onReply(post)
              }}
            >
              <Reply size={16} />
              Reply
            </button>
          )}
          {chat && own && canEditChat(post, now) && (
            <button
              type="button"
              className="text-button"
              onClick={() => setEditing(true)}
            >
              <Pencil size={16} />
              Edit
            </button>
          )}
          {!chat && (
            <button
              type="button"
              className="text-button moment-react-trigger"
              aria-label="React"
              aria-expanded={reacting}
              onClick={() => {
                setReacting(!reacting)
                setPicker(false)
              }}
            >
              <Heart size={20} fill={selected ? 'currentColor' : 'none'} />
              <span className="sr-only">React</span>
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            className={`text-button ${post.keep ? 'is-kept' : ''}`}
            aria-pressed={post.keep}
            aria-label={post.keep ? copy.posts.unkeep : copy.posts.keep}
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
            {chat && (post.keep ? copy.posts.unkeep : copy.posts.keep)}
          </button>
          {!chat && (
            <button
              className="text-button"
              type="button"
              aria-expanded={comments}
              aria-label="Reply to moment"
              onClick={() => setComments(!comments)}
            >
              <MessageCircle size={16} />
            </button>
          )}
          {chat && post.body && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                if (!navigator.clipboard) {
                  setMessage(copy.posts.errors.failed)
                  return
                }
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
              aria-label={copy.posts.unsend}
              onClick={() => setConfirm(true)}
            >
              <Undo2 size={15} />
              {chat && copy.posts.unsend}
            </button>
          )}
        </footer>
      )}
      {confirm && (
        <ConfirmSheet
          title={copy.posts.unsendTitle}
          description={
            post.keep ? copy.posts.unsendKept : copy.posts.unsendHint
          }
          confirmLabel={copy.posts.unsendBoth}
          busy={busy}
          error={message}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void action(() => client.rpc('request_unsend', { p_id: post.id }))
          }}
        />
      )}
      {editing && <EditMessage post={post} onClose={() => setEditing(false)} />}
      {message && (
        <p role="status" className="form-message">
          {message}
        </p>
      )}
      {comments && !chat && (
        <Comments post={post} onClose={() => setComments(false)} />
      )}
    </article>
  )
}
