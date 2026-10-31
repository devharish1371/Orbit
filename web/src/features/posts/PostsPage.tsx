import { PostExplorer, type PostFilter } from './PostExplorer'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Fragment, useEffect, useRef, useState } from 'react'
import {
  Phone,
  Video,
  Bookmark,
  ArrowDown,
  Plus,
  X,
  Sparkles,
} from 'lucide-react'
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
  const [search, setSearch] = useState('')
  const [needle, setNeedle] = useState('')
  const [kind, setKind] = useState<PostFilter>('all')
  useEffect(() => {
    const timer = setTimeout(() => setNeedle(search), 300)
    return () => clearTimeout(timer)
  }, [search])
  const filtered = kind !== 'all' || !!needle.trim()
  const [composing, setComposing] = useState(false)
  const [composerBusy, setComposerBusy] = useState(false)
  const [away, setAway] = useState(false)
  const scrollArea = useRef<HTMLDivElement>(null)
  const [kept, setKept] = useState(false),
    posts = usePosts(channel, kept, kind, needle),
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
    const area = scrollArea.current
    if (!area) return
    const resize = new ResizeObserver(() => {
      if (stick.current) area.scrollTop = area.scrollHeight
    })
    resize.observe(area)
    if (area.firstElementChild) resize.observe(area.firstElementChild)
    return () => resize.disconnect()
  }, [channel])
  useEffect(() => {
    if (channel === 'chat' && newest && stick.current) {
      const area = scrollArea.current
      if (area) area.scrollTop = area.scrollHeight
    }
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
      onBusyChange={setComposerBusy}
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
              <span
                className={`chat-presence ${typing.typing ? 'is-typing' : ''}`}
                aria-hidden="true"
              >
                <i />
                <i />
                <i />
              </span>
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
        <SectionHeading title={copy.posts.momentsTitle} kind="moments" />
      )}
      {channel === 'moment' && (
        <section
          className={`moment-create glass ${composing ? 'is-open' : ''}`}
        >
          <button
            type="button"
            className="moment-create-toggle"
            aria-expanded={composing}
            disabled={composerBusy}
            onClick={() => setComposing(!composing)}
          >
            <span className="moment-create-icon" aria-hidden="true">
              {composing ? <X size={22} /> : <Plus size={24} />}
            </span>
            <span>
              <strong>{copy.posts.createMoment}</strong>
              <small>{copy.posts.createMomentHint}</small>
            </span>
            <Sparkles size={20} aria-hidden="true" />
          </button>
          <div hidden={!composing}>{composer}</div>
        </section>
      )}
      <PostExplorer
        search={search}
        onSearch={setSearch}
        kind={kind}
        onKind={setKind}
        chat={channel === 'chat'}
      />
      <div
        ref={scrollArea}
        className={channel === 'chat' ? 'chat-scroll' : 'moments-scroll'}
        onScroll={(event) => {
          if (channel !== 'chat') return
          const node = event.currentTarget
          stick.current =
            node.scrollHeight - node.scrollTop - node.clientHeight < 120
          setAway(!stick.current)
        }}
      >
        <div className="conversation-content">
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
                {filtered
                  ? 'No matches'
                  : kept
                    ? copy.posts.noKept
                    : channel === 'chat'
                      ? copy.posts.chatEmpty
                      : copy.posts.momentsEmpty}
              </h2>
              <p className="muted">
                {filtered
                  ? 'Try another word or clear your filters.'
                  : kept
                    ? copy.posts.noKeptHint
                    : copy.posts.emptyHint}
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
                      reactions.data?.filter(
                        (row) => row.post_id === post.id,
                      ) ?? []
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
          <div ref={anchor} />
        </div>
      </div>
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
          <div className="chat-composer">
            {away && (
              <button
                className="chat-latest"
                type="button"
                onClick={() => {
                  stick.current = true
                  if (scrollArea.current)
                    scrollArea.current.scrollTop =
                      scrollArea.current.scrollHeight
                  setAway(false)
                }}
              >
                <ArrowDown size={16} />
                {copy.posts.jumpLatest}
              </button>
            )}
            {composer}
          </div>
        </>
      )}
    </div>
  )
}
