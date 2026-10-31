import { SectionHeading } from '@/components/ui/SectionHeading'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { nativeTracking, tracker, trackingReady } from '@/native/tracker'
import { useTrackingHealth } from '@/native/useTrackingHealth'
import { modeUntil, type Duration } from '@/native/share-duration'
import { copy } from '@/copy/en'
import { Button } from '@/components/ui/Button'
export default function TrackingPage() {
  const { client } = useAuth(),
    { data } = useSpace(),
    health = useTrackingHealth(),
    query = useQueryClient()
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [duration, setDuration] = useState<Duration>('hour'),
    [showDiagnostics, setShowDiagnostics] = useState(false)
  const diagnostics = useQuery({
    queryKey: ['tracking-diagnostics'],
    queryFn: () => tracker.diagnostics(),
    enabled: nativeTracking && showDiagnostics,
    refetchInterval: showDiagnostics ? 15000 : false,
  })
  const h = health.data
  async function step(action: () => Promise<unknown>) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      await query.invalidateQueries({ queryKey: ['tracking-health'] })
    } catch {
      setMessage(copy.tracking.permissionFailed)
    } finally {
      setBusy(false)
    }
  }
  async function change(mode: 'live' | 'paused' | 'surprise') {
    if (!data) return
    setBusy(true)
    setMessage('')
    const until =
      mode === 'live'
        ? undefined
        : modeUntil(
            mode === 'surprise' && duration === 'indefinite'
              ? 'fourHours'
              : duration,
            new Date(),
            data.couple.timezone,
          )
    try {
      if (nativeTracking) {
        await tracker.mode({ mode, until })
        setMessage(copy.tracking.modeSaved)
      } else {
        const result = await client
          .from('members')
          .update({ share_mode: mode, share_mode_until: until ?? null })
          .eq('user_id', data.self.user_id)
          .select('user_id')
          .single()
        if (result.error) throw result.error
      }
      await query.invalidateQueries({ queryKey: ['space'] })
      await query.invalidateQueries({ queryKey: ['tracking-health'] })
    } catch {
      setMessage(copy.tracking.modeFailed)
    } finally {
      setBusy(false)
    }
  }
  const stamp = (time: number) =>
    time
      ? new Intl.DateTimeFormat('en-IN', {
          timeZone: data?.couple.timezone ?? 'Asia/Kolkata',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date(time))
      : copy.tracking.never
  const steps = h
    ? [
        {
          key: 'location',
          title: copy.tracking.location,
          body: copy.tracking.locationBody,
          action: copy.tracking.locationAction,
          run: () => tracker.requestLocation(),
          ready: h.location,
          available: true,
        },
        {
          key: 'background',
          title: copy.tracking.background,
          body: copy.tracking.backgroundBody,
          action: copy.tracking.backgroundAction,
          run: () => tracker.requestBackground(),
          ready: h.background,
          available: h.location,
        },
        {
          key: 'notifications',
          title: copy.tracking.notifications,
          body: copy.tracking.notificationsBody,
          action: copy.tracking.notificationsAction,
          run: () => tracker.requestNotifications(),
          ready: h.notifications,
          available: h.location && h.background,
        },
        {
          key: 'battery',
          title: copy.tracking.battery,
          body: copy.tracking.batteryBody,
          action: copy.tracking.batteryAction,
          run: () => tracker.requestIgnore(),
          ready: h.battery,
          available: h.location && h.background && h.notifications,
        },
      ]
    : []
  return (
    <div className="page tracking-page">
      <Link className="back-link" to="/settings">
        <ArrowLeft size={18} aria-hidden="true" />
        {copy.common.back}
      </Link>
      <SectionHeading title={copy.tracking.heading} kind="map" />
      <section className="sharing-signal" data-mode={data?.self.share_mode}>
        <div className="signal-illustration" aria-hidden="true">
          <i />
          <i />
          <span>↗</span>
        </div>
        <div>
          <p className="eyebrow">Your location</p>
          <h2>
            {data?.self.share_mode === 'paused'
              ? 'Sharing paused'
              : data?.self.share_mode === 'surprise'
                ? 'Surprise mode'
                : 'Sharing on'}
          </h2>
          <p className="small muted">
            {data?.self.share_mode === 'paused'
              ? 'Your partner can see that sharing is paused.'
              : data?.self.share_mode === 'surprise'
                ? 'Your partner sees an approximate area.'
                : 'Your partner can see your shared location.'}
          </p>
        </div>
      </section>
      {!nativeTracking ? (
        <section className="glass settings-section">
          <ShieldCheck aria-hidden="true" />
          <p>{copy.tracking.web}</p>
          <Link className="card-link" to="/map">
            {copy.home.openMap} ↗
          </Link>
        </section>
      ) : health.isPending ? (
        <p role="status">{copy.common.loading}</p>
      ) : health.error ? (
        <section className="glass settings-section">
          <p role="alert">{copy.common.error}</p>
          <Button
            onClick={() => {
              void health.refetch()
            }}
          >
            {copy.common.retry}
          </Button>
        </section>
      ) : (
        h && (
          <>
            <section className="glass settings-section tracking-overview">
              <p className="eyebrow">
                {h.running ? copy.tracking.active : copy.tracking.inactive}
              </p>
              <p className="small muted">
                {h.manufacturer} {h.model} · Android {h.os}
              </p>
              <dl>
                <div>
                  <dt>{copy.tracking.upload}</dt>
                  <dd>{stamp(h.lastUpload)}</dd>
                </div>
                <div>
                  <dt>{copy.tracking.fix}</dt>
                  <dd>{stamp(h.lastFix)}</dd>
                </div>
                <div>
                  <dt>{copy.tracking.queued}</dt>
                  <dd>{h.queue}</dd>
                </div>
              </dl>
              {h.pendingMode && (
                <p className="form-message" role="status">
                  {copy.tracking.pending}
                </p>
              )}
              <p className="small muted">{copy.tracking.reboot}</p>
            </section>
            {h.issue === 'clock' && (
              <section className="glass settings-section">
                <p role="status">{copy.tracking.clock}</p>
              </section>
            )}
            {!h.services && (
              <section className="glass settings-section">
                <p>{copy.tracking.servicesOff}</p>
                <Button
                  onClick={() => {
                    void step(() => tracker.openDeviceLocation())
                  }}
                >
                  {copy.tracking.servicesAction}
                </Button>
              </section>
            )}
            {!h.enabled && (
              <section className="glass settings-section">
                <h2>{copy.tracking.setup}</h2>
                <label className="check-row tracking-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  {copy.tracking.consent}
                </label>
              </section>
            )}
            <details
              className="tracking-setup"
              open={!steps.every((item) => item.ready)}
            >
              <summary>
                Phone setup{' '}
                <span>
                  {steps.filter((item) => item.ready).length}/{steps.length}{' '}
                  ready
                </span>
              </summary>
              {steps.map((item) => (
                <section key={item.key} className="glass tracking-step">
                  <div className="tracking-step-heading">
                    <h2>{item.title}</h2>
                    <span
                      className={item.ready ? 'step-ready' : 'step-missing'}
                    >
                      {item.ready ? (
                        <Check size={17} aria-label={copy.tracking.ready} />
                      ) : (
                        copy.tracking.missing
                      )}
                    </span>
                  </div>
                  <p className="muted small">{item.body}</p>
                  {!item.ready && (
                    <Button
                      disabled={
                        busy || (!consent && !h.enabled) || !item.available
                      }
                      onClick={() => {
                        void step(item.run)
                      }}
                    >
                      {item.action}
                    </Button>
                  )}
                </section>
              ))}
            </details>
            <section className="settings-section">
              <p className="small muted">
                {/nothing/i.test(h.manufacturer)
                  ? copy.tracking.nothing
                  : copy.tracking.genericBattery}
              </p>
              {!h.running && (
                <Button
                  disabled={
                    busy || !trackingReady(h) || (!consent && !h.enabled)
                  }
                  onClick={() => {
                    void step(() => tracker.start())
                  }}
                >
                  {busy ? copy.tracking.enabling : copy.tracking.enable}
                </Button>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  void step(() => tracker.openAppSettings())
                }}
              >
                {copy.tracking.settings}
              </button>
              <button
                className="text-button"
                onClick={() => {
                  void health.refetch()
                }}
              >
                {copy.tracking.refresh}
              </button>
            </section>
          </>
        )
      )}
      <section className="glass settings-section">
        <h2>{copy.tracking.shareMode}</h2>
        <p className="small muted">
          {copy.tracking.current}:{' '}
          {data?.self.share_mode === 'paused'
            ? copy.tracking.paused
            : data?.self.share_mode === 'surprise'
              ? copy.tracking.surprise
              : copy.tracking.live}
        </p>
        <label htmlFor="share-duration">{copy.tracking.duration}</label>
        <select
          id="share-duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value as Duration)}
        >
          {(['hour', 'fourHours', 'tomorrow', 'indefinite'] as const).map(
            (value) => (
              <option key={value} value={value}>
                {copy.tracking[value]}
              </option>
            ),
          )}
        </select>
        <div className="share-mode-options">
          <Button
            className="button-secondary"
            disabled={busy}
            onClick={() => {
              void change('paused')
            }}
          >
            {copy.tracking.paused}
          </Button>
          <Button
            className="button-secondary"
            disabled={busy}
            onClick={() => {
              void change('surprise')
            }}
          >
            {copy.tracking.surprise}
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              void change('live')
            }}
          >
            {copy.tracking.resume}
          </Button>
        </div>
        <p className="small muted">{copy.tracking.surpriseBody}</p>
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
      </section>
      {nativeTracking && (
        <details
          className="glass settings-section"
          onToggle={(event) => setShowDiagnostics(event.currentTarget.open)}
        >
          <summary>{copy.tracking.diagnostics}</summary>
          <p className="muted small">{copy.tracking.diagnosticsBody}</p>
          {diagnostics.data?.entries.length ? (
            <>
              <pre className="diagnostics-log">
                {diagnostics.data.entries
                  .map(
                    (entry) =>
                      `${new Date(entry.at).toISOString()}  ${entry.code}`,
                  )
                  .join('\n')}
              </pre>
              <button
                className="text-button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      JSON.stringify(diagnostics.data.entries, null, 2),
                    )
                    .then(() => setMessage(copy.tracking.copied))
                    .catch(() => setMessage(copy.tracking.permissionFailed))
                }}
              >
                {copy.tracking.copy}
              </button>
            </>
          ) : (
            <p className="small muted">{copy.tracking.noDiagnostics}</p>
          )}
        </details>
      )}
    </div>
  )
}
