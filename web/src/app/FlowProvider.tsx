import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CollectionContext,
  type CollectionMemory,
} from '@/features/collections/CollectionContext'
import {
  PlanningContext,
  type PlanningMemory,
} from '@/features/plans/PlanningContext'
import {
  FlowContext,
  freshComposer,
  PostViewContext,
  freshPostView,
  MapCameraContext,
  type MapCameraMemory,
  AtlasContext,
  freshAtlas,
} from './FlowContext'
export function FlowProvider({ children }: { children: ReactNode }) {
  const [collection, setCollection] = useState<CollectionMemory>({
    selected: null,
    draft: null,
  })
  const collectionValue = useMemo(
    () => ({ memory: collection, setMemory: setCollection }),
    [collection],
  )
  const cameraRef = useRef<MapCameraMemory | null>(null)
  const [planning, setPlanning] = useState<PlanningMemory>({
    plan: null,
    idea: null,
  })
  const planningValue = useMemo(
    () => ({ drafts: planning, setDrafts: setPlanning }),
    [planning],
  )
  const [atlas, setAtlas] = useState(freshAtlas)
  const atlasValue = useMemo(() => ({ atlas, setAtlas }), [atlas])
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
    <CollectionContext.Provider value={collectionValue}>
      <FlowContext.Provider value={value}>
        <PostViewContext.Provider value={viewValue}>
          <MapCameraContext.Provider value={cameraRef}>
            <AtlasContext.Provider value={atlasValue}>
              <PlanningContext.Provider value={planningValue}>
                {children}
              </PlanningContext.Provider>
            </AtlasContext.Provider>
          </MapCameraContext.Provider>
        </PostViewContext.Provider>
      </FlowContext.Provider>
    </CollectionContext.Provider>
  )
}
