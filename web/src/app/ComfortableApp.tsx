import { NativeSurfaceSync } from './NativeSurface'
import { MotionConfig } from 'motion/react'
import { useComfort } from '@/hooks/useComfort'
import App from '@/App'
export default function ComfortableApp() {
  const { reduced } = useComfort()
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <NativeSurfaceSync />
      <App />
    </MotionConfig>
  )
}
