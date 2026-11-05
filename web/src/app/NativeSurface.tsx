import { useNativeReady } from '@/hooks/useNativeSurface'
import { useEffect } from 'react'
import { nativeSurfaceSupported, surface } from '@/native/surface'
import { useTheme } from '@/hooks/useTheme'
import { useComfort } from '@/hooks/useComfort'
/** No user data crosses this bridge: palette, comfort and an opaque load ticket only. */
export function NativeSurfaceSync() {
  const { theme, accent } = useTheme(),
    { text, reduced } = useComfort()
  const resolved = document.documentElement.dataset.theme
  useEffect(() => {
    if (nativeSurfaceSupported)
      void surface.appearance({ theme, accent, text, reduced }).catch(() => {})
  }, [theme, accent, text, reduced, resolved])
  return null
}
export function NativeReady() {
  useNativeReady()
  return null
}
