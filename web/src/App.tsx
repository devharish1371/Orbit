import { useNativeReady } from '@/hooks/useNativeSurface'
import { ScrollContinuity } from '@/app/ScrollContinuity'
import { NativeNavigation } from '@/app/NativeNavigation'
import { MotionSafety } from '@/app/MotionSafety'
import { LoadingView } from '@/components/ui/LoadingView'
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { phoneCopiesSupported } from '@/features/phone-keepsakes/native'
import { useAuth } from '@/hooks/useAuth'
import { OfflineBanner } from '@/components/OfflineBanner'
import { copy } from '@/copy/en'
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const Shell = lazy(() => import('@/app/Shell'))
const HomePage = lazy(() => import('@/features/home/HomePage'))
const SafetyPage = lazy(() => import('@/features/safety/SafetyPage'))
const WidgetPage = lazy(() => import('@/features/widget/WidgetPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const PersonPage = lazy(() => import('@/features/profile/PersonPage'))
const UsPage = lazy(() => import('@/features/profile/UsPage'))
const TrackingPage = lazy(() => import('@/features/tracking/TrackingPage'))
const MapPage = lazy(() => import('@/features/map/MapPage'))
const PostsPage = lazy(() => import('@/features/posts/PostsPage'))
const NotificationsPage = lazy(
  () => import('@/features/alerts/NotificationsPage'),
)
const ActivityPage = lazy(() => import('@/features/alerts/ActivityPage'))
const CallPage = lazy(() => import('@/features/alerts/CallPage'))
const ArchivePage = lazy(() => import('@/features/cloud-archive/ArchivePage'))
const KeepsakesPage = lazy(() => import('@/features/memories/KeepsakesPage'))
const CapsulesPage = lazy(() => import('@/features/memories/CapsulesPage'))
const TimelinePage = lazy(() => import('@/features/memories/TimelinePage'))
const ReplayReveal = lazy(() => import('@/features/memories/AnniversaryReveal'))
const OnThisDayPage = lazy(() => import('@/features/personal/OnThisDay'))
const PlansPage = lazy(() => import('@/features/plans/PlansPage'))
const OfflineKeepsakesPage = lazy(
  () => import('@/features/phone-keepsakes/OfflineKeepsakesPage'),
)
export default function App() {
  const { pathname } = useLocation()
  const { session, restoring, restoreError, retryRestore } = useAuth()
  useNativeReady(!!restoreError && !session)
  return (
    <>
      <ScrollContinuity userId={session?.user.id} />
      <NativeNavigation enabled={Boolean(session)} />
      <MotionSafety />
      <div className="aurora" aria-hidden="true" />
      <OfflineBanner />
      <Suspense fallback={<LoadingView />}>
        {pathname === '/offline' ? (
          <OfflineKeepsakesPage />
        ) : restoring && !session ? (
          <LoadingView />
        ) : restoreError && !session ? (
          <main className="fallback">
            <h1>{copy.common.reconnectTitle}</h1>
            <p>{copy.common.reconnectBody}</p>
            {phoneCopiesSupported && (
              <Link className="text-button" to="/offline">
                Open phone keepsakes
              </Link>
            )}
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
              <Route path="safety" element={<SafetyPage />} />
              <Route path="widget" element={<WidgetPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="tracking" element={<TrackingPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="call" element={<CallPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="person/:id" element={<PersonPage />} />
              <Route path="us" element={<UsPage />} />
              <Route path="on-this-day" element={<OnThisDayPage />} />
              <Route path="plans" element={<PlansPage />} />
              <Route path="archives" element={<ArchivePage />} />
              <Route path="keepsakes" element={<KeepsakesPage />} />
              <Route path="capsules" element={<CapsulesPage />} />
              <Route path="timeline" element={<TimelinePage />} />
              <Route path="reveal" element={<ReplayReveal />} />
              <Route path="map" element={<MapPage />} />
              {(['moments', 'chat'] as const).map((page) => (
                <Route
                  path={page}
                  key={page}
                  element={
                    <PostsPage
                      key={page}
                      channel={page === 'chat' ? 'chat' : 'moment'}
                    />
                  }
                />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </Suspense>
    </>
  )
}
