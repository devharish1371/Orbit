import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { BackLink } from '@/components/ui/JourneyLink'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { lazy, Suspense, useContext, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { useNow } from '@/hooks/useNow'
import { memories as text } from '@/copy/memories'
import { PostCard } from '@/features/posts/PostCard'
import { usePostReactions } from '@/features/posts/usePosts'
import { PostMedia } from '@/features/posts/PostMedia'
import { PostViewContext } from '@/app/FlowContext'
import { useSpace } from '@/hooks/useSpace'
import { useKeptMemories } from './useMemories'
const MemoryMap = lazy(() => import('./MemoryMap'))
export default function KeepsakesPage() {
  const viewMemory = useContext(PostViewContext)
  if (!viewMemory) throw new Error('FlowProvider required')
  const { keptView: view, setKeptView: setView } = viewMemory
  const { data: space } = useSpace()
  const kept = useKeptMemories(view === 'photos'),
    query = useQueryClient(),
    now = useNow(),
    { theme } = useTheme()
  const map = view === 'map'
  const posts = useMemo(() => kept.data?.pages.flat() ?? [], [kept.data])
  const pins = useMemo(
    () => posts.filter((post) => post.lat !== null && post.lng !== null),
    [posts],
  )
  const reactions = usePostReactions(posts.map((post) => post.id))
  const dark =
    theme === 'system'
      ? !window.matchMedia('(prefers-color-scheme: light)').matches
      : theme === 'dark'
  return (
    <div className="page memories-page keepsakes-page">
      <BackLink fallback="/us" />
      <SectionHeading title={text.keepsakes} kind="moments" />
      <div className="theme-options">
        {(['all', 'photos', 'map'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={view === value}
            onClick={() => {
              setView(value)
              window.scrollTo({ top: 0, behavior: 'instant' })
            }}
          >
            {value === 'all' ? 'All' : value === 'photos' ? 'Photos' : text.map}
          </button>
        ))}
      </div>
      {kept.isPending && <p role="status">Loading keepsakes…</p>}
      {kept.error && (
        <button
          className="text-button"
          onClick={() => {
            void kept.refetch()
          }}
        >
          {text.failed} Retry
        </button>
      )}
      {!kept.isPending && !kept.error && posts.length === 0 && (
        <section className="glass memory-section muted">
          {view === 'photos' ? 'No saved photos yet.' : text.empty}
        </section>
      )}
      {map &&
        (pins.length ? (
          <Suspense fallback={<p role="status">Opening our map…</p>}>
            <MemoryMap
              posts={pins}
              dark={dark}
              onSelect={(id) => {
                document.getElementById(`post-${id}`)?.scrollIntoView({
                  behavior: window.matchMedia(
                    '(prefers-reduced-motion: reduce)',
                  ).matches
                    ? 'instant'
                    : 'smooth',
                  block: 'center',
                })
              }}
            />
          </Suspense>
        ) : (
          <p className="muted">{text.mapEmpty}</p>
        ))}
      <div
        className={view === 'photos' ? 'keepsake-photo-grid' : 'keepsake-grid'}
      >
        {posts.map((post) =>
          view === 'photos' ? (
            <article
              key={post.id}
              className="keepsake-photo-card"
              id={`post-${post.id}`}
            >
              <PostMedia post={post} timezone={space?.couple.timezone} />
              <div>
                <time dateTime={post.created_at}>
                  {new Intl.DateTimeFormat('en-IN', {
                    dateStyle: 'medium',
                    timeZone: space?.couple.timezone,
                  }).format(new Date(post.created_at))}
                </time>
                {post.body && <p>{post.body}</p>}
              </div>
            </article>
          ) : (
            <PostCard
              key={post.id}
              post={post}
              now={now}
              reactions={
                reactions.data?.filter((row) => row.post_id === post.id) ?? []
              }
            />
          ),
        )}
      </div>
      {kept.hasNextPage && (
        <button
          className="button button-secondary"
          disabled={kept.isFetchingNextPage}
          onClick={() => {
            void kept.fetchNextPage()
          }}
        >
          {text.more}
        </button>
      )}
      {(kept.data?.pages.length ?? 0) > 1 && (
        <button
          className="text-button"
          onClick={() => {
            void query.resetQueries({ queryKey: ['kept-memories'] })
          }}
        >
          Back to latest keepsakes
        </button>
      )}
      {map && posts.length > 0 && (
        <p className="muted small">
          Map pins follow the keepsakes loaded on this page. Load earlier
          keepsakes to explore further back.
        </p>
      )}
      <Link className="collection-settings-link" to="/settings">
        Storage & export <span aria-hidden="true">↗</span>
      </Link>
    </div>
  )
}
