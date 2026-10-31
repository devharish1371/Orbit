import { useContext, type Dispatch, type SetStateAction } from 'react'
import {
  FlowContext,
  PostViewContext,
  type ComposerMemory,
  type PostViewMemory,
} from '@/app/FlowContext'
import type { Channel } from '@/lib/posts'
/** Route-safe drafts stay in memory only and disappear when the signed-in shell unmounts. */
export function useComposerMemory(channel: Channel) {
  const memory = useContext(FlowContext)
  if (!memory) throw new Error('FlowProvider required')
  function field<K extends keyof ComposerMemory>(
    key: K,
  ): [ComposerMemory[K], Dispatch<SetStateAction<ComposerMemory[K]>>] {
    return [
      memory!.drafts[channel][key],
      (value) =>
        memory!.setDrafts((previous) => ({
          ...previous,
          [channel]: {
            ...previous[channel],
            [key]:
              typeof value === 'function'
                ? (value as (before: ComposerMemory[K]) => ComposerMemory[K])(
                    previous[channel][key],
                  )
                : value,
          },
        })),
    ]
  }
  return { field, ...memory.handles[channel] }
}

export function usePostViewMemory(channel: Channel) {
  const memory = useContext(PostViewContext)
  if (!memory) throw new Error('FlowProvider required')
  function field<K extends keyof PostViewMemory>(
    key: K,
  ): [PostViewMemory[K], Dispatch<SetStateAction<PostViewMemory[K]>>] {
    return [
      memory!.views[channel][key],
      (value) =>
        memory!.setViews((previous) => ({
          ...previous,
          [channel]: {
            ...previous[channel],
            [key]:
              typeof value === 'function'
                ? (value as (before: PostViewMemory[K]) => PostViewMemory[K])(
                    previous[channel][key],
                  )
                : value,
          },
        })),
    ]
  }
  return { field, ...memory.handles[channel] }
}
