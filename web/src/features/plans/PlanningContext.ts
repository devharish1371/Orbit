import { createContext, type Dispatch, type SetStateAction } from 'react'
export interface PlanDraft {
  id: string
  version: number | null
  title: string
  notes: string
  venue: string
  starts: string
  zone: string
}
export interface IdeaDraft {
  id: string
  version: number | null
  title: string
  notes: string
  kind: 'idea' | 'place'
  private: boolean
  archived: boolean
}
export interface PlanningMemory {
  plan: PlanDraft | null
  idea: IdeaDraft | null
}
export const PlanningContext = createContext<{
  drafts: PlanningMemory
  setDrafts: Dispatch<SetStateAction<PlanningMemory>>
} | null>(null)
