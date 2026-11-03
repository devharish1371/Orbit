import { Car, Footprints, Route, ChevronRight, Info } from 'lucide-react'
import { distanceLabel } from '@/lib/geo'
import { journeyPath, type Journey } from '@/lib/journeys'
export function JourneyList({
  journeys,
  timezone,
  selected,
  onSelect,
}: {
  journeys: Journey[]
  timezone: string
  selected?: string
  onSelect: (journey: Journey) => void
}) {
  const time = (value: string) =>
    new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value))
  return (
    <div className="journey-list">
      {!journeys.length ? (
        <div className="journey-empty">
          <Route size={32} strokeWidth={1} />
          <p>No journeys yet</p>
        </div>
      ) : (
        journeys.map((j) => {
          const Icon =
            j.mode === 'walk' ? Footprints : j.mode === 'drive' ? Car : Route
          return (
            <button
              key={j.id}
              className="journey-row"
              aria-pressed={selected === j.id}
              onClick={() => onSelect(j)}
            >
              <span className="journey-mini" aria-hidden="true">
                <svg viewBox="0 0 100 100">
                  <path d={journeyPath(j.points)} />
                </svg>
                <Icon size={16} />
              </span>
              <span className="journey-copy">
                <strong>
                  {j.mode === 'walk'
                    ? 'Walk'
                    : j.mode === 'drive'
                      ? 'Drive'
                      : 'Journey'}{' '}
                  <span
                    title="Estimated from GPS; vehicle travel may include a passenger or public transport."
                    aria-label="GPS estimate"
                  >
                    <Info size={12} />
                  </span>
                </strong>
                <span>
                  {time(j.started)}–{time(j.ended)}
                </span>
                <small>
                  {j.state === 'finished'
                    ? 'Finished'
                    : j.state === 'moving'
                      ? 'Tracking'
                      : 'Last tracked'}
                </small>
              </span>
              <span className="journey-numbers">
                <strong>{distanceLabel(j.metres)}</strong>
                <small>{Math.max(1, Math.round(j.seconds / 60))} min</small>
              </span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          )
        })
      )}
    </div>
  )
}
