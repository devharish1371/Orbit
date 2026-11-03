import { createContext, useContext } from 'react'
import type { PostDraft } from '@/lib/posts'
import type { PendingText } from './model'
export const OutboxContext = createContext<{
  items: PendingText[]
  sendingId: string | null
  enqueue: (draft: PostDraft) => Promise<void>
  retry: (id: string) => void
  discard: (id: string) => Promise<void>
} | null>(null)
export const useOutbox = () => useContext(OutboxContext)
