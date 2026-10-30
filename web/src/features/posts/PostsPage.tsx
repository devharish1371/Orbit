import { Fragment, useEffect, useRef, useState } from 'react'
import { Phone, Video, Bookmark } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import { visiblePost, type Channel } from '@/lib/posts'
import { usePostReactions, usePosts } from './usePosts'
import { useTyping } from './useTyping'
import { Composer } from './Composer'
import { PostCard } from './PostCard'
import { Avatar } from '@/components/ui/Avatar'
import { callUrl } from '@/lib/connect'
export default function PostsPage({ channel }: { channel: Channel }) {
  const [kept, setKept] = useState(false),
    posts = usePosts(channel, kept),
    now = useNow(),
    { data: space } = useSpace(),
    query = useQueryClient()
  const typing = useTyping(channel === 'chat'),
    anchor = useRef<HTMLDivElement>(null),
    stick = useRef(true)
  const rows =
    posts.data?.pages.flat().filter((post) => visiblePost(post, now)) ?? []
  const unique = [...new Map(rows.map((post) => [post.id, post])).values()]
  const ids = unique.map((post) => post.id),
    reactions = usePostReactions(ids),
    newest = unique[0]?.id
  useEffect(() => {
    if (channel !== 'chat') return
    const scroll = () => {
      stick.current =
        document.documentElement.scrollHeight -
          window.scrollY -
          window.innerHeight <
        360
    }
    window.addEventListener('scroll', scroll, { passive: true })
    return () => window.removeEventListener('scroll', scroll)
  }, [channel])
  useEffect(() => {
    if (channel === 'chat' && newest && stick.current)
      anchor.current?.scrollIntoView({ block: 'center' })
  }, [channel, newest])
  const cards = channel === 'chat' ? [...unique].reverse() : unique
  const partnerName =
    space?.self.partner_nickname ||
    space?.partner?.nickname ||
    space?.partner?.display_name ||
    copy.alerts.partner
  const phone = callUrl(space?.partner?.phone ?? '')
  const day = (value: string | number) =>
    new Intl.DateTimeFormat('en-IN', {
      timeZone: space?.couple.timezone,
      dateStyle: 'medium',
    }).format(new Date(value))
  const composer = (
    <Composer
      key={channel}
      channel={channel}
      onTyping={typing.changed}
      onStopTyping={typing.stopped}
    />
  )
  return (
    <div className={`page posts-page ${channel === 'chat' ? 'chat-page' : ''}`}>
      {channel === 'chat' ? (
        <header className="chat-heading">
          <Avatar
            name={space?.partner?.display_name ?? '?'}
            color={space?.partner?.color ?? '#FF6B8A'}
            path={space?.partner?.avatar_path}
          />
          <div>
            <h1>{partnerName}</h1>
            <p className="muted small" role="status">
              {typing.typing
                ? copy.posts.typing.replace('{name}', partnerName)
                : copy.posts.privateChat}
            </p>
          </div>
          {phone && (
            <a className="icon-button" href={phone} aria-label={copy.home.call}>
              <Phone size={19} />
            </a>
          )}
          {space?.couple.meet_url && (
            <a
              className="icon-button"
              href={space.couple.meet_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.home.meet}
            >
              <Video size={20} />
            </a>
          )}
          <button
            className="icon-button"
            type="button"
            aria-label={copy.posts.kept}
            aria-pressed={kept}
            onClick={() => setKept(!kept)}
          >
            <Bookmark size={19} />
          </button>
        </header>
      ) : (
        <header className="page-heading">
          <p className="eyebrow">{copy.posts.momentsEyebrow}</p>
          <h1>{copy.posts.momentsTitle}</h1>
          <p className="muted">{copy.posts.momentsDescription}</p>
        </header>
      )}
      {channel === 'moment' && composer}
      {(channel === 'moment' || (posts.data?.pages.length ?? 0) > 1) && (
        <div className="post-filters">
          {channel === 'moment' && (
            <>
              <button
                type="button"
                aria-pressed={!kept}
                onClick={() => setKept(false)}
              >
                {copy.posts.all}
              </button>
              <button
                type="button"
                aria-pressed={kept}
                onClick={() => setKept(true)}
              >
                {copy.posts.kept}
              </button>
            </>
          )}
          {(posts.data?.pages.length ?? 0) > 1 && (
            <button
              className="text-button"
              type="button"
              onClick={() => {
                stick.current = true
                void query.resetQueries({
                  queryKey: ['posts', space?.couple.id, channel, kept],
                })
              }}
            >
              {copy.posts.latest}
            </button>
          )}
        </div>
      )}
      {posts.hasNextPage && channel === 'chat' && (
        <Button
          className="button-secondary load-older"
          type="button"
          disabled={posts.isFetchingNextPage}
          onClick={() => {
            stick.current = false
            void posts.fetchNextPage()
          }}
        >
          {copy.posts.older}
        </Button>
      )}
      {posts.isPending ? (
        <div
          className="post-list"
          role="status"
          aria-label={copy.common.loading}
        >
          {[0, 1].map((n) => (
            <div className="skeleton skeleton-card" key={n} />
          ))}
        </div>
      ) : posts.error ? (
        <section className="glass settings-section">
          <p>{copy.common.error}</p>
          <Button
            type="button"
            onClick={() => {
              void posts.refetch()
            }}
          >
            {copy.common.retry}
          </Button>
        </section>
      ) : !cards.length ? (
        <section className="glass posts-empty">
          <span aria-hidden="true">{channel === 'chat' ? '💌' : '✦'}</span>
          <h2>
            {kept
              ? copy.posts.noKept
              : channel === 'chat'
                ? copy.posts.chatEmpty
                : copy.posts.momentsEmpty}
          </h2>
          <p className="muted">
            {kept ? copy.posts.noKeptHint : copy.posts.emptyHint}
          </p>
        </section>
      ) : (
        <div
          className={`post-list ${channel === 'chat' ? 'chat-list' : ''}`}
          aria-label={channel === 'chat' ? copy.nav.chat : copy.nav.moments}
        >
          {cards.map((post, index) => (
            <Fragment key={post.id}>
              {channel === 'chat' &&
                (index === 0 ||
                  day(cards[index - 1]!.created_at) !==
                    day(post.created_at)) && (
                  <div className="chat-day">
                    {day(post.created_at) === day(now)
                      ? copy.posts.today
                      : day(post.created_at)}
                  </div>
                )}
              <PostCard
                key={post.id}
                post={post}
                reactions={
                  reactions.data?.filter((row) => row.post_id === post.id) ?? []
                }
                now={now}
              />
            </Fragment>
          ))}
        </div>
      )}
      {posts.hasNextPage && channel === 'moment' && (
        <Button
          type="button"
          className="button-secondary load-older"
          disabled={posts.isFetchingNextPage}
          onClick={() => {
            void posts.fetchNextPage()
          }}
        >
          {copy.posts.older}
        </Button>
      )}
      {channel === 'chat' && (
        <>
          <p className="sr-only" role="status">
            {typing.typing
              ? copy.posts.typing.replace(
                  '{name}',
                  space?.self.partner_nickname ||
                    space?.partner?.nickname ||
                    space?.partner?.display_name ||
                    copy.alerts.partner,
                )
              : '\u00a0'}
          </p>
          <div ref={anchor} />
          <div className="chat-composer">{composer}</div>
        </>
      )}
    </div>
  )
}
