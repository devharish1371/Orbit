import { SectionHeading } from '@/components/ui/SectionHeading'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useNow } from '@/hooks/useNow'
import { storyDays, storyMilestones, localDay } from '@/lib/memories'
import { memories as text } from '@/copy/memories'
export default function TimelinePage() {
  const { client, session } = useAuth(),
    { data: space } = useSpace(),
    now = useNow()
  const recap = useQuery({
    queryKey: ['week-recap', session?.user.id],
    queryFn: async () => {
      const result = await client.rpc('week_recap')
      if (result.error) throw result.error
      return result.data as {
        from: string
        through: string
        recorded_km: number
        moments: number
        arrivals: number
        location_points: number
      }
    },
  })
  const anniversary = space?.couple.anniversary,
    zone = space?.couple.timezone ?? 'Asia/Kolkata',
    today = localDay(new Date(now), zone)
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(value))
  return (
    <div className="page memories-page timeline-page">
      <Link className="back-link" to="/us">
        ← Us
      </Link>
      <SectionHeading title={text.timeline} kind="us" />
      {anniversary ? (
        <>
          <section className="glass memory-section story-count">
            <span className="countdown-number">
              {storyDays(anniversary, new Date(now), zone)}
            </span>
            <p>{text.daysTogether}</p>
            <Link className="card-link" to="/reveal">
              {text.replay} ✦
            </Link>
          </section>
          <ol className="story-timeline">
            <li>
              <span>♡</span>
              <div>
                <strong>{text.started}</strong>
                <p>{format(anniversary)}</p>
              </div>
            </li>
            {storyMilestones(anniversary, new Date(now), zone).map(
              (date, index) => (
                <li
                  key={date}
                  className={date > today ? 'future-milestone' : ''}
                >
                  <span>✦</span>
                  <div>
                    <strong>
                      {text.anniversary} {index + 1}
                    </strong>
                    <p>{format(date)}</p>
                  </div>
                </li>
              ),
            )}
          </ol>
        </>
      ) : (
        <p className="muted">{text.addDate}</p>
      )}
      <section className="glass memory-section">
        <h2>{text.recap}</h2>
        {recap.isPending && <p role="status">Loading our week…</p>}
        {recap.error && (
          <button
            className="text-button"
            onClick={() => {
              void recap.refetch()
            }}
          >
            {text.failed} Retry
          </button>
        )}
        {recap.data && (
          <>
            <p className="muted small">
              {format(recap.data.from)} – {format(recap.data.through)}
            </p>
            <div className="recap-grid">
              {[
                [recap.data.moments, text.moments],
                [recap.data.arrivals, text.arrivals],
                [
                  recap.data.location_points
                    ? recap.data.recorded_km.toFixed(1)
                    : '—',
                  text.kilometres,
                ],
              ].map(([value, label]) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="muted small">{text.recapHint}</p>
          </>
        )}
      </section>
    </div>
  )
}
