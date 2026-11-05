import { createContext, useContext } from 'react'
import type { PostDraft } from '@/lib/posts'
import type { PendingMessage } from './model'
export const OutboxContext = createContext<{
  items: PendingMessage[]
  sendingId: string | null
  enqueue: (draft: PostDraft) => Promise<void>
  preview: (id: string) => Promise<PostDraft>
  retry: (id: string) => void
  discard: (id: string) => Promise<void>
} | null>(null)
export const useOutbox = () => useContext(OutboxContext)
