import type { Database } from '@/lib/database.types'
export const collectionTones = ['iris', 'rose', 'tide', 'moss'] as const
export type CollectionTone = (typeof collectionTones)[number]
export type Collection =
  Database['public']['Tables']['memory_collections']['Row'] & {
    kept_count: number
  }
export interface CollectionDraft {
  id: string
  owner: string
  couple: string
  version: number | null
  name: string
  tone: CollectionTone
  archived: boolean
}
export function collectionIndex(input: unknown): Collection[] {
  if (
    !Array.isArray(input) ||
    input.some(
      (value) =>
        !value ||
        typeof value !== 'object' ||
        !/^[0-9a-f-]{36}$/.test(value.id) ||
        typeof value.name !== 'string' ||
        !collectionTones.includes(value.tone) ||
        !Number.isInteger(value.version) ||
        value.version < 1 ||
        typeof value.archived !== 'boolean' ||
        !Number.isInteger(value.kept_count) ||
        value.kept_count < 0,
    )
  )
    throw new Error('COLLECTIONS_UNAVAILABLE')
  return input as Collection[]
}
export function collectionError(error: unknown) {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : ''
  if (/COLLECTION_CHANGED|KEEPSAKE_CHANGED/.test(message))
    return 'This changed elsewhere. Close and reopen to get the latest.'
  if (/COLLECTION_OWNER_REQUIRED/.test(message))
    return 'Only the person who made this collection can change it.'
  if (/collection_active_name|23505|duplicate key/.test(message))
    return 'There’s already a collection with that name.'
  if (/COLLECTION_ITEM_LIMIT/.test(message))
    return 'This collection is full. Start another one.'
  if (/COLLECTION_LIMIT/.test(message))
    return 'The shelf is full. Try reusing an existing collection.'
  if (/KEEPSAKE_UNAVAILABLE/.test(message))
    return 'This item is no longer kept. Refresh Keepsakes.'
  if (/ARCHIVED|UNAVAILABLE/.test(message))
    return 'This collection isn’t available. Refresh Keepsakes.'
  return 'Couldn’t save that. Your changes are still here.'
}
