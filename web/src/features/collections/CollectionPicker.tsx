import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { useAuth } from '@/hooks/useAuth'
import type { Post } from '@/lib/posts'
import { collectionError, type Collection } from './model'
import { useCollectionLinks } from './useCollections'
import { CollectionMark } from './CollectionMark'
export function CollectionPicker({
  post,
  collections,
  onClose,
  onNew,
}: {
  post: Post
  collections: Collection[]
  onClose: () => void
  onNew: () => void
}) {
  const { client, session } = useAuth(),
    query = useQueryClient(),
    links = useCollectionLinks(post.id)
  const [identity] = useState(() => ({
    owner: session?.user.id,
    couple: post.couple_id,
  }))
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState('')
  async function toggle(collection: Collection, add: boolean) {
    if (busy || !identity.owner || !post.kept_at) return
    setBusy(collection.id)
    setError('')
    try {
      const result = await client.rpc('set_collection_post', {
        p_expected_user: identity.owner,
        p_expected_couple: identity.couple,
        p_collection: collection.id,
        p_version: collection.version,
        p_post: post.id,
        p_kept_at: post.kept_at,
        p_add: add,
      })
      if (result.error) throw result.error
      await Promise.all(
        ['collections', 'collection-links', 'kept-memories'].map((key) =>
          query.invalidateQueries({ queryKey: [key] }),
        ),
      )
    } catch (e) {
      setError(collectionError(e))
      if (
        e &&
        typeof e === 'object' &&
        'message' in e &&
        /CHANGED|UNAVAILABLE|ARCHIVED/.test(String(e.message))
      )
        for (const key of ['collections', 'collection-links', 'kept-memories'])
          void query.invalidateQueries({ queryKey: [key] })
    } finally {
      setBusy(null)
    }
  }
  return (
    <DialogSheet
      title="Add to collection"
      onClose={onClose}
      dismissible={!busy}
      className="collection-picker"
    >
      {links.isPending && <p role="status">Loading collections…</p>}
      {links.error && (
        <button
          className="text-button"
          onClick={() => {
            void links.refetch()
          }}
        >
          Couldn’t load this item. Retry
        </button>
      )}
      <div className="collection-picker-list">
        {collections
          .filter((c) => !c.archived)
          .map((collection) => {
            const selected =
              links.data?.some(
                (link) => link.collection_id === collection.id,
              ) ?? false
            return (
              <button
                key={collection.id}
                type="button"
                aria-label={`${collection.name}, ${collection.kept_count} saved`}
                disabled={
                  !!busy || links.isPending || !!links.error || !post.kept_at
                }
                aria-pressed={selected}
                onClick={() => {
                  void toggle(collection, !selected)
                }}
              >
                <CollectionMark tone={collection.tone} />
                <span>
                  <strong>{collection.name}</strong>
                  <small>{collection.kept_count} saved</small>
                </span>
                {selected && <Check size={18} aria-hidden="true" />}
              </button>
            )
          })}
      </div>
      {!collections.some((c) => !c.archived) && (
        <p className="muted">Make a collection for this keepsake.</p>
      )}
      <button
        className="text-button collection-new"
        disabled={!!busy}
        onClick={onNew}
      >
        <Plus size={18} aria-hidden="true" />
        New collection
      </button>
      {error && <p role="alert">{error}</p>}
    </DialogSheet>
  )
}
