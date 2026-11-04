import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { CollectionDraft } from './model'
export interface CollectionMemory {
  selected: string | null
  draft: CollectionDraft | null
}
export const CollectionContext = createContext<{
  memory: CollectionMemory
  setMemory: Dispatch<SetStateAction<CollectionMemory>>
} | null>(null)
