import {
  Link,
  useLocation,
  useNavigate,
  useResolvedPath,
  type LinkProps,
} from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useId } from 'react'
import { PortraitContext, createPortraitName } from '@/app/PortraitContext'

const routes = new Set([
  '/',
  '/map',
  '/moments',
  '/chat',
  '/us',
  '/profile',
  '/settings',
  '/widget',
  '/safety',
  '/tracking',
  '/notifications',
  '/activity',
  '/call',
  '/keepsakes',
  '/archives',
  '/on-this-day',
  '/capsules',
  '/timeline',
  '/reveal',
  '/plans',
  '/offline',
])
/** Record the actual entry point for secondary screens, without persisting personal data. */
export function JourneyLink({ state, children, ...props }: LinkProps) {
  const location = useLocation()
  const target = useResolvedPath(props.to),
    uid = useId()
  const portrait = /^\/person\/[0-9a-f-]{36}$/i.test(target.pathname)
    ? createPortraitName(uid)
    : null
  return (
    <Link
      {...props}
      state={{
        ...state,
        orbitFrom: location.pathname,
        orbitPortrait: portrait,
      }}
    >
      <PortraitContext.Provider
        value={location.pathname !== target.pathname ? portrait : null}
      >
        {children}
      </PortraitContext.Provider>
    </Link>
  )
}
export function BackLink({
  fallback,
  label = 'Back',
}: {
  fallback: string
  label?: string
}) {
  const location = useLocation(),
    navigate = useNavigate()
  const from = location.state?.orbitFrom
  const canReturn =
    typeof from === 'string' &&
    (routes.has(from) || /^\/person\/[0-9a-f-]{36}$/i.test(from)) &&
    from !== location.pathname
  return (
    <Link
      className="back-link"
      aria-label={label}
      title={label}
      replace={!canReturn}
      to={canReturn ? from : fallback}
      onClick={(event) => {
        if (
          canReturn &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          !event.altKey &&
          event.button === 0
        ) {
          event.preventDefault()
          navigate(-1)
        }
      }}
    >
      <ArrowLeft size={20} aria-hidden="true" />
    </Link>
  )
}
