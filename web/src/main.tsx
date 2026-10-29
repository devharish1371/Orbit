import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AuthProvider } from '@/app/AuthProvider'
import './index.css'
import '@/hooks/useTheme'
import App from './App'
const query = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={query}>
        <AuthProvider>
          <HashRouter>
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </HashRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
