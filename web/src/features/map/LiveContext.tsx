import { createContext, useContext, type ReactNode } from 'react'
import { useLiveSpace } from '@/hooks/useLiveSpace'
const Context = createContext<ReturnType<typeof useLiveSpace> | null>(null)
export function LiveProvider({ children }: { children: ReactNode }) {
  const value = useLiveSpace()
  return <Context.Provider value={value}>{children}</Context.Provider>
}
// Hook stays here beside its provider; Fast Refresh is disabled just for this export.
// eslint-disable-next-line react-refresh/only-export-components
export function useLiveData() {
  const value = useContext(Context)
  if (!value) throw new Error('LiveProvider required')
  return value
}
