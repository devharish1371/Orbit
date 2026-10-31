import { useLocation } from 'react-router-dom'
export function LoadingView({ label = 'Opening Orbit…' }: { label?: string }) {
  return (
    <main className="orbit-loading" role="status" aria-label={label}>
      <div className="loading-emblem" aria-hidden="true">
        <img
          src={`${import.meta.env.BASE_URL}orbit.svg`}
          alt=""
          width="56"
          height="56"
        />
        <span />
      </div>
      <strong>Orbit</strong>
      <p>{label}</p>
    </main>
  )
}
/** Keep app chrome mounted while a route chunk loads; never add an artificial delay. */
export function RouteLoading() {
  const { pathname } = useLocation()
  return (
    <div
      className={`route-loading ${pathname === '/chat' ? 'route-loading-chat' : ''}`}
      role="status"
      aria-label="Loading…"
      aria-busy="true"
    >
      <span className="route-loading-line" />
      <div className="route-loading-shapes" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}
