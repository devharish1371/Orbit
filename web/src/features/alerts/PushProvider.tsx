import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { startPush, type PushState } from '@/native/push'
import { PushContext } from './PushContext'
export function PushProvider({ children }: { children: ReactNode }) {
  const { client, session } = useAuth()
  const user = session?.user.id
  const navigate = useNavigate()
  const [state, setState] = useState<PushState>('web')
  const controller = useRef<ReturnType<typeof startPush> | null>(null)
  useEffect(() => {
    if (!user) return
    const push = startPush(client, user, setState, (route) => {
      void navigate(route)
    })
    controller.current = push
    return () => {
      push.dispose()
      controller.current = null
    }
  }, [client, user, navigate])
  return (
    <PushContext.Provider
      value={{
        state,
        enable: async () => {
          await controller.current?.enable()
        },
        disable: async () => {
          await controller.current?.disable()
        },
      }}
    >
      {children}
    </PushContext.Provider>
  )
}
