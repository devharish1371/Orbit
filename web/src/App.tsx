import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { OfflineBanner } from '@/components/OfflineBanner'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { copy } from '@/copy/en'
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const Shell = lazy(() => import('@/app/Shell'))
const HomePage = lazy(() => import('@/features/home/HomePage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const UsPage = lazy(() => import('@/features/profile/UsPage'))
const MapPage = lazy(() => import('@/features/map/MapPage'))
const EmptyPage = lazy(() => import('@/features/EmptyPage'))
export default function App() {
  const { session, restoring, restoreError, retryRestore } = useAuth()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname, session?.user.id])
  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <OfflineBanner />
      <Suspense
        fallback={
          <main className="loading-shell" role="status">
            {copy.common.loading}
          </main>
        }
      >
        {restoring ? (
          <main className="loading-shell" role="status">
            {copy.common.loading}
          </main>
        ) : restoreError ? (
          <main className="fallback">
            <h1>{copy.common.reconnectTitle}</h1>
            <p>{copy.common.reconnectBody}</p>
            <button
              className="button"
              onClick={() => {
                void retryRestore()
              }}
            >
              {copy.common.retry}
            </button>
          </main>
        ) : !session ? (
          <LoginPage />
        ) : (
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<HomePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="us" element={<UsPage />} />
              <Route path="map" element={<MapPage />} />
              {(['moments', 'chat'] as const).map((page) => (
                <Route
                  path={page}
                  key={page}
                  element={<EmptyPage page={page} />}
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </Suspense>
      <UpdatePrompt />
    </>
  )
}
