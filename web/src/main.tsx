import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { AppBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/app/AuthProvider'
import './index.css'
import '@/hooks/useTheme'
import App from './App'
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
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </HashRouter>
        </AuthProvider>
      </QueryClientProvider>
    </AppBoundary>
  </StrictMode>,
)
