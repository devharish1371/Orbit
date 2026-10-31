import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import { AttentionActions } from './AttentionActions'
export default function ActivityPage() {
  const { client } = useAuth()
  const { data: space } = useSpace()
  const activity = useQuery({
    queryKey: ['activity', space?.couple.id],
    enabled: Boolean(space),
    queryFn: async () => {
      const result = await client
        .from('events')
        .select('*')
        .eq('couple_id', space!.couple.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100)
      if (result.error) throw result.error
      return result.data
    },
  })
  return (
    <div className="page activity-page">
      <Link className="back-link" to="/">
        ← {copy.common.back}
      </Link>
      <header className="page-heading">
        <h1>{copy.alerts.activityTitle}</h1>
        <p className="muted">{copy.alerts.activityHint}</p>
      </header>
      <AttentionActions />
      {activity.isPending ? (
        <p role="status">{copy.common.loading}</p>
      ) : activity.error ? (
        <div className="glass settings-section">
          <p>{copy.common.error}</p>
          <Button
            type="button"
            onClick={() => {
              void activity.refetch()
            }}
          >
            {copy.common.retry}
          </Button>
        </div>
      ) : activity.data.length === 0 ? (
        <section className="glass settings-section">
          <h2>{copy.alerts.noActivity}</h2>
          <p className="muted">{copy.alerts.emptyHint}</p>
        </section>
      ) : (
        <ol className="activity-list">
          {activity.data.map((event) => {
            const who =
              event.user_id === space?.self.user_id
                ? copy.alerts.you
                : space?.self.partner_nickname ||
                  space?.partner?.nickname ||
                  space?.partner?.display_name ||
                  copy.alerts.partner
            return (
              <li key={event.id} className="glass">
                <div>
                  <strong>{who}</strong>
                  <p>
                    {copy.alerts.eventLabels[
                      event.type as keyof typeof copy.alerts.eventLabels
                    ] ?? copy.alerts.update}
                  </p>
                </div>
                <time dateTime={event.created_at}>
                  {new Intl.DateTimeFormat('en-IN', {
                    timeZone: space?.couple.timezone,
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(event.created_at))}
                </time>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
