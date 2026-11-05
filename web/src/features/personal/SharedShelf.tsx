import { ArrowUpRight, Plus, Mail, Route } from 'lucide-react'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { useCollections } from '@/features/collections/useCollections'
import { CollectionMark } from '@/features/collections/CollectionMark'
import '@/features/collections/collections.css'
import './personal.css'
export function SharedShelf({ days }: { days: number | null }) {
  const collections = useCollections(),
    active = collections.data?.filter((item) => !item.archived) ?? []
  return (
    <section className="shared-shelf" aria-labelledby="shared-shelf-heading">
      <div className="personal-section-heading">
        <h2 id="shared-shelf-heading">Our shelf</h2>
        <Link
          to="/keepsakes"
          className="icon-button"
          aria-label="Open keepsakes"
        >
          <ArrowUpRight size={20} />
        </Link>
      </div>
      {collections.isPending ? (
        <p role="status" className="muted">
          Loading collections…
        </p>
      ) : collections.error ? (
        <button
          className="text-button"
          onClick={() => {
            void collections.refetch()
          }}
        >
          Couldn’t load collections. Retry
        </button>
      ) : (
        <div className="shared-shelf-rail">
          {active.slice(0, 6).map((item) => (
            <Link
              className="shared-shelf-book"
              aria-description="Open collection"
              key={item.id}
              to={`/keepsakes?collection=${item.id}`}
            >
              <CollectionMark tone={item.tone} />
              <strong>{item.name}</strong>{' '}
              <small>{item.kept_count} saved</small>
            </Link>
          ))}
          {!active.length && (
            <Link className="shared-shelf-start" to="/keepsakes">
              <Plus size={23} aria-hidden="true" />
              <strong>Start a collection</strong>
            </Link>
          )}
        </div>
      )}
      <div className="shelf-destinations">
        <Link to="/capsules">
          <Mail size={22} aria-hidden="true" />
          <span>
            <strong>Capsules</strong>
          </span>
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
        <Link to="/timeline">
          <Route size={22} aria-hidden="true" />
          <span>
            <strong>Our timeline</strong>
            {days !== null && (
              <small>{days.toLocaleString()} days together</small>
            )}
          </span>
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
