import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  FlowContext,
  freshComposer,
  PostViewContext,
  freshPostView,
  MapCameraContext,
  type MapCameraMemory,
} from './FlowContext'
export function FlowProvider({ children }: { children: ReactNode }) {
  const cameraRef = useRef<MapCameraMemory | null>(null)
  const [drafts, setDrafts] = useState(() => ({
    chat: freshComposer(),
    moment: freshComposer(),
  }))
  const [keptView, setKeptView] = useState<'all' | 'photos' | 'map'>('all')
  const [views, setViews] = useState(() => ({
    chat: freshPostView(),
    moment: freshPostView(),
  }))
  const chatIdRef = useRef(crypto.randomUUID()),
    chatAttemptedRef = useRef(false),
    chatScrollRef = useRef<number | null>(null),
    chatBottomRef = useRef(true)
  const momentIdRef = useRef(crypto.randomUUID()),
    momentAttemptedRef = useRef(false),
    momentScrollRef = useRef<number | null>(null),
    momentBottomRef = useRef(true)
  const handles = useMemo(
    () => ({
      chat: {
        id: chatIdRef,
        attempted: chatAttemptedRef,
        scroll: chatScrollRef,
        nearBottom: chatBottomRef,
      },
      moment: {
        id: momentIdRef,
        attempted: momentAttemptedRef,
        scroll: momentScrollRef,
        nearBottom: momentBottomRef,
      },
    }),
    [],
  )
  const value = useMemo(
    () => ({ drafts, setDrafts, handles }),
    [drafts, handles],
  )
  const viewValue = useMemo(
    () => ({ views, setViews, handles, keptView, setKeptView }),
    [views, handles, keptView],
  )
  return (
    <FlowContext.Provider value={value}>
      <PostViewContext.Provider value={viewValue}>
        <MapCameraContext.Provider value={cameraRef}>
          {children}
        </MapCameraContext.Provider>
      </PostViewContext.Provider>
    </FlowContext.Provider>
  )
}
