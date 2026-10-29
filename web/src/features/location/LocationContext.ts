import { createContext, useContext } from 'react'
export interface LocationState {
  enabled: boolean
  message: string
  start: () => void
  stop: () => void
}
export const LocationContext = createContext<LocationState>({
  enabled: false,
  message: '',
  start: () => {},
  stop: () => {},
})
export const useLocationSharing = () => useContext(LocationContext)
