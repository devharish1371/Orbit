import { Settings } from 'lucide-react'
import { OrbitGlyph } from '@/components/ui/OrbitGlyph'
import { surfaceFeedback } from '@/components/ui/surfaceFeedback'
import { useEffect } from 'react'
import { setAppearance, normalizeTheme } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { copy } from '@/copy/en'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
import { LiveProvider } from '@/features/map/LiveContext'
import { LocationProvider } from '@/features/location/LocationProvider'
import { Button } from '@/components/ui/Button'
import { PushProvider } from '@/features/alerts/PushProvider'
import { AutomaticReveal } from '@/features/memories/AnniversaryReveal'
const tabs = [
  { to: '/', key: 'home' },
  { to: '/map', key: 'map' },
  { to: '/moments', key: 'moments' },
  { to: '/chat', key: 'chat' },
  { to: '/us', key: 'us' },
] as const
export default function Shell() {
  const { pathname } = useLocation()
  const chat = pathname === '/chat'
  const parentRoute = [
    '/profile',
    '/settings',
    '/keepsakes',
    '/capsules',
    '/timeline',
    '/reveal',
    '/notifications',
    '/activity',
  ].includes(pathname)
    ? '/us'
    : pathname === '/tracking'
      ? '/map'
      : pathname
  const activeTab = Math.max(
    0,
    tabs.findIndex(({ to }) => to === parentRoute),
  )
  const space = useSpace()
  const { signOut } = useAuth()
  const mode = space.data?.self.theme_mode
  const accent = space.data?.self.theme_accent
  useEffect(() => {
    if (mode && accent) setAppearance(normalizeTheme(mode), accent)
  }, [mode, accent])
  if (space.isPending)
    return (
      <main
        className="loading-shell"
        aria-busy="true"
        aria-label={copy.common.loading}
      >
        <div className="skeleton skeleton-heading" />
        <div className="skeleton skeleton-card" />
        <div className="skeleton skeleton-card" />
      </main>
    )
  if (space.error)
    return (
      <main className="fallback">
        <h1>{copy.common.unavailable}</h1>
        <p>
          {space.error.message === 'MEMBERSHIP_REQUIRED'
            ? copy.common.needMembership
            : copy.common.error}
        </p>
        <Button
          onClick={() => {
            void space.refetch()
          }}
        >
          {copy.common.retry}
        </Button>
        <button
          className="text-button"
          onClick={() => {
            void signOut()
          }}
        >
          {copy.common.signOut}
        </button>
      </main>
    )
  return (
    <LiveProvider>
      <LocationProvider>
        <PushProvider>
          <AutomaticReveal />
          <div
            className={`app-shell ${chat ? 'app-shell-chat' : ''}`}
            data-scene={tabs[activeTab]?.key}
            onPointerDownCapture={surfaceFeedback}
          >
            {!chat && (
              <header className="app-top">
                <Link to="/" className="brand">
                  <img
                    src={`${import.meta.env.BASE_URL}orbit.svg`}
                    alt=""
                    width="28"
                    height="28"
                  />
                  <span>{copy.appName}</span>
                </Link>
                <div className="header-actions">
                  <Link
                    to="/profile"
                    className="profile-shortcut"
                    aria-label={copy.profile.title}
                  >
                    <Avatar
                      name={space.data?.self.display_name ?? '?'}
                      color={space.data?.self.color ?? '#FF6B8A'}
                      path={space.data?.self.avatar_path}
                    />
                  </Link>
                  <Link
                    className="icon-button"
                    to="/settings"
                    aria-label={copy.common.settings}
                  >
                    <Settings size={21} aria-hidden="true" />
                  </Link>
                </div>
              </header>
            )}
            <main id="content">
              <Outlet />
            </main>
            <nav className="bottom-nav glass" aria-label={copy.appName}>
              <span
                className="nav-orbit"
                aria-hidden="true"
                style={{ transform: `translateX(${activeTab * 100}%)` }}
              />
              {tabs.map(({ to, key }, index) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={() => (activeTab === index ? 'active' : '')}
                >
                  <OrbitGlyph name={key} width={25} height={25} />
                  <span>{copy.nav[key]}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </PushProvider>
      </LocationProvider>
    </LiveProvider>
  )
}
