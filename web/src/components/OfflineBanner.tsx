import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'
import { copy } from '@/copy/en'
const subscribe = (listener: () => void) => {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  return online ? null : (
    <div className="offline-banner" role="status">
      <WifiOff size={16} aria-hidden="true" />
      {copy.common.offline}
    </div>
  )
}
