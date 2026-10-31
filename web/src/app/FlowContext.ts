import {
  createContext,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from 'react'
import type { Attachment, Channel, PostDraft } from '@/lib/posts'
export interface ComposerMemory {
  kind: PostDraft['kind']
  body: string
  mood: string
  attachment: Attachment | undefined
  ttl: string
  place: string
  busy: boolean
  message: string
  more: boolean
}
export const freshComposer = (): ComposerMemory => ({
  kind: 'text',
  body: '',
  mood: '💛',
  attachment: undefined,
  ttl: 'default',
  place: '',
  busy: false,
  message: '',
  more: false,
})
export type DraftHandles = {
  id: { current: string }
  attempted: { current: boolean }
  scroll: { current: number | null }
  nearBottom: { current: boolean }
}
export const FlowContext = createContext<{
  drafts: Record<Channel, ComposerMemory>
  setDrafts: Dispatch<SetStateAction<Record<Channel, ComposerMemory>>>
  handles: Record<Channel, DraftHandles>
} | null>(null)

export interface PostViewMemory {
  search: string
  filter: 'all' | 'text' | 'photo' | 'voice'
  kept: boolean
  composing: boolean
}
export const freshPostView = (): PostViewMemory => ({
  search: '',
  filter: 'all',
  kept: false,
  composing: false,
})
export const PostViewContext = createContext<{
  keptView: 'all' | 'photos' | 'map'
  setKeptView: Dispatch<SetStateAction<'all' | 'photos' | 'map'>>
  views: Record<Channel, PostViewMemory>
  setViews: Dispatch<SetStateAction<Record<Channel, PostViewMemory>>>
  handles: Record<Channel, DraftHandles>
} | null>(null)

export type MapCameraMemory = {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}
export const MapCameraContext =
  createContext<RefObject<MapCameraMemory | null> | null>(null)
