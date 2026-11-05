import {
  ArrowUpRight,
  CalendarDays,
  Image,
  Mic,
  MessageCircle,
} from 'lucide-react'
import { JourneyLink as Link, BackLink } from '@/components/ui/JourneyLink'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useSpace } from '@/hooks/useSpace'
import { usePrivateMedia } from '@/hooks/usePrivateMedia'
import { useNow } from '@/hooks/useNow'
import { PostCard } from '@/features/posts/PostCard'
import { usePostReactions, useQuotedPosts } from '@/features/posts/usePosts'
import type { Post } from '@/lib/posts'
import { useOnThisDay } from './usePersonal'
import './personal.css'
function MemorySlip({ post }: { post: Post }) {
  const { data: space } = useSpace(),
    image = usePrivateMedia(post.thumb_path)
  return (
    <Link
      to="/on-this-day"
      className="memory-slip"
      aria-description="Open this memory"
    >
      <span className="memory-slip-art" aria-hidden="true">
        {image.data ? (
          <img src={image.data} alt="" />
        ) : post.kind === 'photo' ? (
          <Image size={25} />
        ) : post.kind === 'voice' ? (
          <Mic size={25} />
        ) : (
          <MessageCircle size={25} />
        )}
      </span>
      <time dateTime={post.created_at}>
        {new Intl.DateTimeFormat('en-IN', {
          timeZone: space?.couple.timezone,
          year: 'numeric',
        }).format(new Date(post.created_at))}
      </time>{' '}
      <strong>
        {post.body || (post.kind === 'voice' ? 'Voice note' : 'Photo')}
      </strong>
    </Link>
  )
}
export function OnThisDay() {
  const memories = useOnThisDay(),
    posts = memories.data?.pages[0] ?? []
  if (!posts.length || memories.error) return null
  return (
    <section className="on-this-day" aria-labelledby="on-this-day-heading">
      <div className="personal-section-heading">
        <h2 id="on-this-day-heading">On this day</h2>
        <Link
          to="/on-this-day"
          className="icon-button"
          aria-label="All on-this-day memories"
        >
          <ArrowUpRight size={20} />
        </Link>
      </div>
      <div className="memory-slip-rail">
        {posts.slice(0, 3).map((post) => (
          <MemorySlip key={post.id} post={post} />
        ))}
      </div>
    </section>
  )
}
export default function OnThisDayPage() {
  const memories = useOnThisDay(),
    now = useNow(),
    { data: space } = useSpace()
  const posts = memories.error ? [] : (memories.data?.pages.flat() ?? [])
  const reactions = usePostReactions(posts.map((post) => post.id)),
    quotes = useQuotedPosts(posts.map((post) => post.reply_to_id))
  return (
    <div className="page keepsakes-page on-this-day-page">
      <BackLink fallback="/us" />
      <SectionHeading title="On this day" kind="moments" />
      <p className="on-this-day-date">
        <CalendarDays size={16} aria-hidden="true" />
        {new Intl.DateTimeFormat('en-IN', {
          timeZone: space?.couple.timezone,
          month: 'long',
          day: 'numeric',
        }).format(new Date(now))}
      </p>
      {memories.isPending && <p role="status">Loading memories…</p>}
      {memories.error && (
        <button
          className="text-button"
          onClick={() => {
            void memories.refetch()
          }}
        >
          Couldn’t load memories. Retry
        </button>
      )}
      {!memories.isPending && !memories.error && !posts.length && (
        <p className="muted">No kept memories from this day in past years.</p>
      )}
      <div className="keepsake-grid">
        {posts.map((post) => (
          <section
            key={post.id}
            className="on-this-day-entry"
            aria-label={new Intl.DateTimeFormat('en-IN', {
              timeZone: space?.couple.timezone,
              dateStyle: 'long',
            }).format(new Date(post.created_at))}
          >
            <time className="memory-year" dateTime={post.created_at}>
              {new Intl.DateTimeFormat('en-IN', {
                timeZone: space?.couple.timezone,
                year: 'numeric',
              }).format(new Date(post.created_at))}
            </time>
            <PostCard
              post={post}
              now={now}
              reactions={
                reactions.data?.filter((row) => row.post_id === post.id) ?? []
              }
              quote={quotes.data?.find((item) => item.id === post.reply_to_id)}
              quoteLoading={quotes.isFetching}
            />
          </section>
        ))}
      </div>
      {memories.hasNextPage && (
        <button
          className="button button-secondary"
          disabled={memories.isFetchingNextPage}
          onClick={() => {
            void memories.fetchNextPage()
          }}
        >
          Earlier years
        </button>
      )}
      <Link className="text-button" to="/keepsakes">
        All keepsakes <ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </div>
  )
}
