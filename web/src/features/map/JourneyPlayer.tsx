import { ChevronLeft, ChevronRight, X, LocateFixed } from 'lucide-react'
import { distanceLabel } from '@/lib/geo'
import type { Journey, TrailFix } from '@/lib/journeys'

export function JourneyPlayer({
  journey,
  sample,
  timezone,
  onSample,
  onClose,
}: {
  journey: Journey
  sample: TrailFix
  timezone: string
  onSample: (sample: TrailFix) => void
  onClose: () => void
}) {
  const index = Math.max(0, journey.points.indexOf(sample))
  const time = (at: string) =>
    new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(at))
  const seek = (value: number) => {
    const point = journey.points[value]
    if (point) onSample(point)
  }
  return (
    <section className="journey-player" aria-label="Selected journey">
      <header>
        <div>
          <p className="eyebrow">Recorded journey</p>
          <h2>
            {distanceLabel(journey.metres)}{' '}
            <span>· {Math.max(1, Math.round(journey.seconds / 60))} min</span>
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close journey"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </header>
      <div className="journey-sample-readout">
        <time dateTime={sample.recorded_at}>{time(sample.recorded_at)}</time>
        <span>
          <LocateFixed size={14} aria-hidden="true" />±
          {Math.round(sample.accuracy_m ?? 0)} m
        </span>
      </div>
      <div className="journey-seek">
        <button
          className="icon-button"
          aria-label="Previous recorded location"
          disabled={index === 0}
          onClick={() => seek(index - 1)}
        >
          <ChevronLeft size={20} />
        </button>
        <input
          type="range"
          aria-label="Recorded location"
          aria-valuetext={`${time(sample.recorded_at)}, sample ${index + 1} of ${journey.points.length}`}
          min={0}
          max={journey.points.length - 1}
          step={1}
          value={index}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <button
          className="icon-button"
          aria-label="Next recorded location"
          disabled={index === journey.points.length - 1}
          onClick={() => seek(index + 1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="journey-endpoints">
        <span>{time(journey.started)}</span>
        <span>{time(journey.ended)}</span>
      </div>
      <p className="journey-estimate">
        GPS samples ·{' '}
        {journey.state === 'finished'
          ? 'Finished'
          : journey.state === 'moving'
            ? 'Still updating'
            : 'Signal ended'}
      </p>
    </section>
  )
}
