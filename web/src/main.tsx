import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/app/AuthProvider'
import './index.css'
import './styles/orbit-studio.css'
import './styles/orbit-worlds.css'
import './styles/orbit-atelier.css'
import './styles/orbit-foundation.css'
import '@/hooks/useTheme'
import ComfortableApp from '@/app/ComfortableApp'
import './styles/orbit-comfort.css'
const query = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})
window.addEventListener('vite:preloadError', () => {
  // Keep the explicit update choice (and drafts) while checking for a fresh worker.
  if ('serviceWorker' in navigator)
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {})
})
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBoundary>
      <QueryClientProvider client={query}>
        <AuthProvider>
          <HashRouter>
            <ComfortableApp />
          </HashRouter>
        </AuthProvider>
      </QueryClientProvider>
    </AppBoundary>
  </StrictMode>,
)
