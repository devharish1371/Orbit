import { createContext, useContext } from 'react'
import type { PushState } from '@/native/push'
export const PushContext = createContext({
  state: 'web' as PushState,
  enable: async () => {},
  disable: async () => {},
})
export const usePush = () => useContext(PushContext)
