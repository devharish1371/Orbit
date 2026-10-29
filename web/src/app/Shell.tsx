import {
  Home,
  MapPin,
  Heart,
  MessageCircle,
  Sparkles,
  Settings,
} from 'lucide-react'
import { useEffect } from 'react'
import { setAppearance, normalizeTheme } from '@/hooks/useTheme'
import { Avatar } from '@/components/ui/Avatar'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { copy } from '@/copy/en'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
const tabs = [
  { to: '/', key: 'home', icon: Home },
  { to: '/map', key: 'map', icon: MapPin },
  { to: '/moments', key: 'moments', icon: Heart },
  { to: '/chat', key: 'chat', icon: MessageCircle },
  { to: '/us', key: 'us', icon: Sparkles },
] as const
export default function Shell() {
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
    <div className="app-shell">
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
      <main id="content">
        <Outlet />
      </main>
      <nav className="bottom-nav glass" aria-label={copy.appName}>
        {tabs.map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon size={21} strokeWidth={1.75} aria-hidden="true" />
            <span>{copy.nav[key]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
