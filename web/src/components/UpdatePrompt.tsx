import { useRegisterSW } from 'virtual:pwa-register/react'
import { copy } from '@/copy/en'
export function UpdatePrompt() {
  const {
    needRefresh: [refresh, setRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!refresh) return null
  return (
    <aside className="update-prompt glass" role="status">
      <p>{copy.common.update}</p>
      <button
        className="text-button"
        onClick={() => {
          void updateServiceWorker(true)
        }}
      >
        {copy.common.updateAction}
      </button>
      <button className="text-button" onClick={() => setRefresh(false)}>
        {copy.common.close}
      </button>
    </aside>
  )
}
