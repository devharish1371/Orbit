import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { BackLink } from '@/components/ui/JourneyLink'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { lazy, Suspense, useContext, useMemo, useState } from 'react'
import { FolderPlus } from 'lucide-react'
import type { Post } from '@/lib/posts'
import { CollectionContext } from '@/features/collections/CollectionContext'
import { useCollections } from '@/features/collections/useCollections'
import { CollectionShelf } from '@/features/collections/CollectionShelf'
import { CollectionEditor } from '@/features/collections/CollectionEditor'
import { CollectionPicker } from '@/features/collections/CollectionPicker'
import type {
  Collection,
  CollectionDraft,
  CollectionTone,
} from '@/features/collections/model'
import '@/features/collections/collections.css'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { useNow } from '@/hooks/useNow'
import { memories as text } from '@/copy/memories'
import { PostCard } from '@/features/posts/PostCard'
import { usePostReactions, useQuotedPosts } from '@/features/posts/usePosts'
import { PostMedia } from '@/features/posts/PostMedia'
import { PostViewContext } from '@/app/FlowContext'
import { useSpace } from '@/hooks/useSpace'
import { useKeptMemories } from './useMemories'
import {
  PhoneCopiesControl,
  PhoneCopyBadge,
} from '@/features/phone-keepsakes/PhoneCopiesControl'
const MemoryMap = lazy(() => import('./MemoryMap'))
export default function KeepsakesPage() {
  const viewMemory = useContext(PostViewContext)
  if (!viewMemory) throw new Error('FlowProvider required')
  const { keptView: view, setKeptView: setView } = viewMemory
  const { data: space } = useSpace()
  const memory = useContext(CollectionContext)
  if (!memory) throw new Error('FlowProvider required')
  const collections = useCollections()
  const selected =
    collections.data?.find(
      (c) => c.id === memory.memory.selected && !c.archived,
    ) ?? null
  const [editor, setEditor] = useState(false),
    [organizing, setOrganizing] = useState<Post | null>(null)
  function newCollection() {
    if (!space) return
    memory!.setMemory((previous) => ({
      ...previous,
      draft:
        previous.draft?.version === null
          ? previous.draft
          : {
              id: crypto.randomUUID(),
              owner: space.self.user_id,
              couple: space.couple.id,
              version: null,
              name: '',
              tone: 'iris',
              archived: false,
            },
    }))
    setEditor(true)
  }
  function editCollection(collection: Collection) {
    if (!space) return
    memory!.setMemory((previous) => ({
      ...previous,
      draft:
        previous.draft?.id === collection.id &&
        previous.draft.version === collection.version
          ? previous.draft
          : {
              id: collection.id,
              owner: space.self.user_id,
              couple: space.couple.id,
              version: collection.version,
              name: collection.name,
              tone: collection.tone as CollectionTone,
              archived: collection.archived,
            },
    }))
    setEditor(true)
  }
  function draftChange(draft: CollectionDraft) {
    memory!.setMemory((previous) => ({ ...previous, draft }))
  }
  const kept = useKeptMemories(view === 'photos', selected?.id ?? null),
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
  const quotes = useQuotedPosts(posts.map((post) => post.reply_to_id))
  const dark =
    theme === 'system'
      ? !window.matchMedia('(prefers-color-scheme: light)').matches
      : theme === 'dark'
  return (
    <div className="page memories-page keepsakes-page">
      <BackLink fallback="/us" />
      <SectionHeading title={text.keepsakes} kind="moments" />
      <CollectionShelf
        collections={collections.data ?? []}
        selected={selected?.id ?? null}
        loading={collections.isPending}
        failed={!!collections.error}
        onRetry={() => {
          void collections.refetch()
        }}
        onSelect={(id) =>
          memory.setMemory((previous) => ({ ...previous, selected: id }))
        }
        onNew={newCollection}
        onEdit={editCollection}
      />
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
      {kept.error && !kept.isFetching && (
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
          {selected ? (
            <div className="collection-empty">
              <p>
                {view === 'photos'
                  ? 'No photos in this collection yet.'
                  : 'Nothing in this collection yet.'}
              </p>
              <button
                className="text-button"
                onClick={() =>
                  memory.setMemory((previous) => ({
                    ...previous,
                    selected: null,
                  }))
                }
              >
                Choose from Keepsakes
              </button>
            </div>
          ) : view === 'photos' ? (
            'No saved photos yet.'
          ) : (
            text.empty
          )}
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
                <button
                  className="text-button keepsake-organize"
                  aria-label="Organize keepsake"
                  onClick={() => setOrganizing(post)}
                >
                  <FolderPlus size={17} aria-hidden="true" />
                  Collections
                </button>
                <PhoneCopyBadge post={post} />
              </div>
            </article>
          ) : (
            <div key={post.id}>
              <PostCard
                key={post.id}
                post={post}
                now={now}
                quote={quotes.data?.find(
                  (item) => item.id === post.reply_to_id,
                )}
                quoteLoading={quotes.isFetching}
                reactions={
                  reactions.data?.filter((row) => row.post_id === post.id) ?? []
                }
              />
              <PhoneCopyBadge post={post} />
              <button
                className="text-button keepsake-organize"
                aria-label="Organize keepsake"
                onClick={() => setOrganizing(post)}
              >
                <FolderPlus size={17} aria-hidden="true" />
                Collections
              </button>
            </div>
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
      <PhoneCopiesControl />
      {editor && memory.memory.draft && (
        <CollectionEditor
          draft={memory.memory.draft}
          onChange={draftChange}
          onClose={() => setEditor(false)}
          onSaved={(id) => {
            memory.setMemory((previous) => ({
              ...previous,
              selected: organizing ? previous.selected : id,
              draft: null,
            }))
            setEditor(false)
          }}
        />
      )}
      {!editor && organizing && (
        <CollectionPicker
          post={organizing}
          collections={collections.data ?? []}
          onClose={() => setOrganizing(null)}
          onNew={newCollection}
        />
      )}
    </div>
  )
}
