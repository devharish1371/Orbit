import { useState } from 'react'
import { Plus, Layers3, Archive, Pencil, RotateCcw } from 'lucide-react'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { CollectionMark } from './CollectionMark'
import { collectionError, type Collection } from './model'
export function CollectionShelf({
  collections,
  selected,
  loading,
  failed,
  onRetry,
  onSelect,
  onNew,
  onEdit,
}: {
  collections: Collection[]
  selected: string | null
  loading: boolean
  failed: boolean
  onRetry: () => void
  onSelect: (id: string | null) => void
  onNew: () => void
  onEdit: (collection: Collection) => void
}) {
  const [manage, setManage] = useState(false),
    [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState('')
  const { client, session } = useAuth(),
    query = useQueryClient()
  const own = (collection: Collection) =>
    collection.created_by === session?.user.id
  async function archive(collection: Collection) {
    if (busy || !session) return
    setBusy(collection.id)
    setError('')
    try {
      const result = await client.rpc('save_memory_collection', {
        p_id: collection.id,
        p_expected_user: session.user.id,
        p_expected_couple: collection.couple_id,
        p_version: collection.version,
        p_name: collection.name,
        p_tone: collection.tone,
        p_archived: !collection.archived,
      })
      if (result.error) throw result.error
      if (!collection.archived && selected === collection.id) onSelect(null)
      await Promise.all(
        ['collections', 'kept-memories', 'collection-links'].map((key) =>
          query.invalidateQueries({ queryKey: [key] }),
        ),
      )
    } catch (e) {
      setError(collectionError(e))
    } finally {
      setBusy(null)
    }
  }
  return (
    <section className="collection-shelf" aria-label="Collections">
      <div className="collection-shelf-heading">
        <h2>Collections</h2>
        <div>
          <button
            className="icon-button"
            aria-label="Manage collections"
            disabled={loading || failed || !collections.length}
            onClick={() => setManage(true)}
          >
            <Layers3 size={18} aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            aria-label="New collection"
            disabled={loading || failed}
            onClick={onNew}
          >
            <Plus size={19} aria-hidden="true" />
          </button>
        </div>
      </div>
      {failed ? (
        <>
          <button className="text-button" onClick={onRetry}>
            Couldn’t load collections. Retry
          </button>
          <button className="text-button" onClick={() => onSelect(null)}>
            All keepsakes
          </button>
        </>
      ) : (
        <div
          className="collection-rail"
          role="group"
          aria-label="Choose collection"
        >
          <button
            className="collection-tile collection-all"
            aria-pressed={!selected}
            onClick={() => onSelect(null)}
          >
            <span className="collection-all-mark">
              <Layers3 size={24} aria-hidden="true" />
            </span>
            <strong>All keepsakes</strong>
          </button>
          {collections
            .filter((c) => !c.archived)
            .map((collection) => (
              <button
                className="collection-tile"
                key={collection.id}
                aria-pressed={selected === collection.id}
                onClick={() => onSelect(collection.id)}
              >
                <CollectionMark tone={collection.tone} />
                <strong>{collection.name}</strong>
                <small>{collection.kept_count} saved</small>
              </button>
            ))}
          {!loading && !collections.some((c) => !c.archived) && (
            <button
              className="collection-tile collection-start"
              onClick={onNew}
            >
              <span>
                <Plus size={20} aria-hidden="true" />
              </span>
              <strong>Your first collection</strong>
            </button>
          )}
        </div>
      )}
      {manage && (
        <DialogSheet
          title="Your collections"
          onClose={() => setManage(false)}
          dismissible={!busy}
          className="collection-manager"
        >
          <div className="collection-manage-list">
            {collections.map((collection) => (
              <div key={collection.id}>
                <CollectionMark tone={collection.tone} />
                <span>
                  <strong>{collection.name}</strong>
                  <small>
                    {collection.archived
                      ? 'Archived'
                      : `${collection.kept_count} saved`}
                  </small>
                </span>
                {own(collection) && (
                  <>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${collection.name}`}
                      disabled={!!busy}
                      onClick={() => {
                        setManage(false)
                        onEdit(collection)
                      }}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${collection.archived ? 'Restore' : 'Archive'} ${collection.name}`}
                      disabled={!!busy}
                      onClick={() => {
                        void archive(collection)
                      }}
                    >
                      {collection.archived ? (
                        <RotateCcw size={17} />
                      ) : (
                        <Archive size={17} />
                      )}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="muted small">
            Archiving a collection leaves its keepsakes saved.
          </p>
          {error && <p role="alert">{error}</p>}
        </DialogSheet>
      )}
    </section>
  )
}
