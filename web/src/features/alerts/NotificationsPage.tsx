import { SectionHeading } from '@/components/ui/SectionHeading'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import { usePush } from './PushContext'
const preferences = [
  'arrive',
  'leave',
  'low_battery',
  'sharing_stopped',
  'nudge',
  'moments',
  'chat',
  'reactions',
  'capsule',
] as const
export default function NotificationsPage() {
  const { client } = useAuth()
  const { data: space } = useSpace()
  const push = usePush()
  const query = useQueryClient()
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!space) return
    const form = new FormData(event.currentTarget)
    const prefs = Object.fromEntries(
      preferences.map((key) => [key, form.get(key) === 'on']),
    )
    setBusy(true)
    setMessage('')
    try {
      const result = await client
        .from('members')
        .update({
          notify_prefs: prefs,
          quiet_start: String(form.get('quiet_start')),
          quiet_end: String(form.get('quiet_end')),
        })
        .eq('user_id', space.self.user_id)
        .select('user_id')
        .single()
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['space'] })
      setMessage(copy.common.saved)
    } catch {
      setMessage(copy.alerts.failed)
    } finally {
      setBusy(false)
    }
  }
  const prefs = space?.self.notify_prefs
  const enabled =
    prefs && typeof prefs === 'object' && !Array.isArray(prefs) ? prefs : {}
  return (
    <div className="page settings-page">
      <Link className="back-link" to="/settings">
        ← {copy.common.back}
      </Link>
      <SectionHeading title={copy.alerts.notificationTitle} kind="chat" />
      <section className="glass settings-section">
        <h2>{copy.alerts.thisDevice}</h2>
        <p role="status">{copy.alerts.pushState[push.state]}</p>
        {!['web', 'unavailable'].includes(push.state) && (
          <Button
            type="button"
            disabled={busy || push.state === 'registering'}
            className="button-secondary"
            onClick={() => {
              setBusy(true)
              void (push.state === 'ready' ? push.disable() : push.enable())
                .catch(() => setMessage(copy.alerts.failed))
                .finally(() => setBusy(false))
            }}
          >
            {push.state === 'ready' ? copy.alerts.disable : copy.alerts.enable}
          </Button>
        )}
      </section>
      {space && (
        <form
          className="glass settings-section notification-form"
          key={JSON.stringify([
            prefs,
            space.self.quiet_start,
            space.self.quiet_end,
          ])}
          onSubmit={(event) => {
            void save(event)
          }}
        >
          <h2>{copy.alerts.sendMe}</h2>
          {preferences.map((key) => (
            <label className="preference-row" key={key}>
              <span>{copy.alerts.preferenceLabels[key]}</span>
              <input
                type="checkbox"
                name={key}
                defaultChecked={enabled[key] !== false}
              />
            </label>
          ))}
          <h2>{copy.alerts.quietHours}</h2>
          <p className="muted small">
            {copy.alerts.quietHint} ({space.couple.timezone})
          </p>
          <div className="quiet-hours">
            <label>
              {copy.alerts.from}
              <input
                type="time"
                name="quiet_start"
                required
                defaultValue={space.self.quiet_start.slice(0, 5)}
              />
            </label>
            <label>
              {copy.alerts.until}
              <input
                type="time"
                name="quiet_end"
                required
                defaultValue={space.self.quiet_end.slice(0, 5)}
              />
            </label>
          </div>
          <Button disabled={busy}>
            {busy ? copy.common.saving : copy.common.save}
          </Button>
        </form>
      )}
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </div>
  )
}
