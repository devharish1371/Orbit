import {
  Link,
  useLocation,
  useNavigate,
  type LinkProps,
} from 'react-router-dom'

const routes = new Set([
  '/',
  '/map',
  '/moments',
  '/chat',
  '/us',
  '/profile',
  '/settings',
  '/tracking',
  '/notifications',
  '/activity',
  '/call',
  '/keepsakes',
  '/capsules',
  '/timeline',
  '/reveal',
])
/** Record the actual entry point for secondary screens, without persisting personal data. */
export function JourneyLink({ state, ...props }: LinkProps) {
  const location = useLocation()
  return <Link {...props} state={{ ...state, orbitFrom: location.pathname }} />
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
    typeof from === 'string' && routes.has(from) && from !== location.pathname
  return (
    <Link
      className="back-link"
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
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  )
}
