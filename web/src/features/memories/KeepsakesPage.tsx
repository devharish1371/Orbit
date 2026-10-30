import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '@/hooks/useTheme'
import { useNow } from '@/hooks/useNow'
import { memories as text } from '@/copy/memories'
import { PostCard } from '@/features/posts/PostCard'
import { usePostReactions } from '@/features/posts/usePosts'
import { StorageStatus } from '@/features/posts/StorageStatus'
import { useKeptMemories } from './useMemories'
const MemoryMap = lazy(() => import('./MemoryMap'))
export default function KeepsakesPage() {
  const kept = useKeptMemories(),
    now = useNow(),
    { theme } = useTheme()
  const [map, setMap] = useState(false)
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
    <div className="page memories-page">
      <Link className="back-link" to="/us">
        ← Us
      </Link>
      <header className="page-heading">
        <p className="eyebrow">For as long as we like</p>
        <h1>{text.keepsakes}</h1>
      </header>
      <div className="theme-options">
        <button aria-pressed={!map} onClick={() => setMap(false)}>
          {text.keepsakes}
        </button>
        <button aria-pressed={map} onClick={() => setMap(true)}>
          {text.map}
        </button>
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
      {!kept.isPending && posts.length === 0 && (
        <section className="glass memory-section muted">{text.empty}</section>
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
      <div className="keepsake-grid">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            now={now}
            reactions={
              reactions.data?.filter((row) => row.post_id === post.id) ?? []
            }
          />
        ))}
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
      {map && posts.length > 0 && (
        <p className="muted small">
          Map pins follow the keepsakes loaded on this page. Load earlier
          keepsakes to explore further back.
        </p>
      )}
      <StorageStatus />
    </div>
  )
}
