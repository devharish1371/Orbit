import { directionsTo, locationStatus } from '@/lib/location-status'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Link } from 'react-router-dom'
import { nativeTracking } from '@/native/tracker'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNow } from '@/hooks/useNow'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useLiveData } from './LiveContext'
import { useLocationSharing } from '@/features/location/LocationContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { copy } from '@/copy/en'
import { distance, distanceLabel, middleUrl, type Point } from '@/lib/geo'
import { callUrl, whatsappUrl } from '@/lib/connect'
import { type PlaceDraft } from '@/lib/place'
import MapCanvas from './MapCanvas'
import PlaceEditor from './PlaceEditor'
import {
  Crosshair,
  Plus,
  MapPin,
  Phone,
  Video,
  MessageCircle,
} from 'lucide-react'
import type { Database } from '@/lib/database.types'
type Place = Database['public']['Tables']['places']['Row']
export default function MapPage() {
  const { data } = useSpace(),
    { client } = useAuth(),
    live = useLiveData(),
    sharing = useLocationSharing(),
    query = useQueryClient()
  useTheme()
  const now = useNow()
  const [mapAttempt, setMapAttempt] = useState(0)
  const dark = document.documentElement.dataset.theme !== 'light'
  const [fit, setFit] = useState(0),
    [adding, setAdding] = useState(false),
    [editor, setEditor] = useState<{ draft: PlaceDraft; id?: string } | null>(
      null,
    )
  const [selected, setSelected] = useState<string | null>(null),
    [confirmDelete, setConfirmDelete] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [showTrail, setShowTrail] = useState(false)
  const trail = useQuery({
    queryKey: ['trail', data?.partner?.user_id],
    enabled: Boolean(showTrail && data?.partner?.share_mode === 'live'),
    staleTime: 60_000,
    queryFn: async () => {
      const result = await client
        .from('location_history')
        .select('lat,lng,recorded_at')
        .eq('user_id', data!.partner!.user_id)
        .gte('recorded_at', new Date(Date.now() - 86400_000).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(2000)
      if (result.error) throw result.error
      return result.data.reverse()
    },
  })
  if (!data) return null
  const members = [data.self, ...(data.partner ? [data.partner] : [])]
  const people = members.flatMap((member) => {
    const location = live.locations.data?.find(
      (row) => row.user_id === member.user_id,
    )
    return location && member.share_mode !== 'paused'
      ? [{ member, location }]
      : []
  })
  const a = people.find((p) => p.member.user_id === data.self.user_id),
    b = people.find((p) => p.member.user_id === data.partner?.user_id)
  const both = a && b
  const approximate = Boolean(a?.location.fuzzed || b?.location.fuzzed)
  const current =
    members.find((m) => m.user_id === selected) ?? data.partner ?? data.self
  const currentLocation = live.locations.data?.find(
    (row) => row.user_id === current.user_id,
  )
  const status = locationStatus(
    current.share_mode,
    currentLocation?.recorded_at,
    now,
  )
  const directions = currentLocation
    ? directionsTo(
        currentLocation,
        current.share_mode,
        currentLocation.fuzzed,
        currentLocation.recorded_at,
        now,
      )
    : null
  const places = live.places.data ?? []
  const choose = (point: Point) => {
    setEditor({
      draft: {
        ...point,
        name: '',
        emoji: '📍',
        radius_m: 150,
        notify_arrive: true,
        notify_leave: true,
      },
    })
    setAdding(false)
  }
  const edit = (place: Place) => {
    setEditor({ draft: place, id: place.id })
    setAdding(false)
  }
  async function remove(id: string) {
    setBusy(true)
    setMessage('')
    try {
      const result = await client
        .from('places')
        .delete()
        .eq('id', id)
        .select('id')
        .single()
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['places'] })
      setConfirmDelete(null)
    } catch {
      setMessage(copy.map.failed)
    } finally {
      setBusy(false)
    }
  }
  const stamp = currentLocation
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: data.couple.timezone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(currentLocation.recorded_at))
    : null
  return (
    <div className="page map-page">
      <SectionHeading title={copy.map.title} kind="map" />
      <div className="map-connection" role="status">
        <span
          className={`status-dot ${live.connection !== 'live' ? 'is-old' : ''}`}
        />
        {live.connection === 'live' ? copy.map.live : copy.map.reconnecting}
      </div>
      <div className="atlas-frame">
        <MapCanvas
          key={`${dark ? 'dark' : 'light'}-${mapAttempt}`}
          dark={dark}
          people={people}
          places={places}
          trail={
            showTrail && data.partner?.share_mode === 'live'
              ? (trail.data ?? [])
              : []
          }
          fit={fit}
          adding={adding}
          onPick={choose}
          onPerson={setSelected}
          onRetry={() => setMapAttempt((value) => value + 1)}
        />
        <div className="map-toolbar">
          <button
            className="button button-secondary"
            onClick={() => setFit((n) => n + 1)}
            disabled={!people.length}
          >
            <Crosshair size={18} aria-hidden="true" />
            {copy.map.fit}
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setAdding((value) => !value)
              setEditor(null)
            }}
          >
            <Plus size={18} aria-hidden="true" />
            {adding ? copy.map.cancel : copy.map.add}
          </button>
        </div>
      </div>
      {adding && (
        <p className="map-add-hint" role="status">
          {copy.map.addHint}
        </p>
      )}
      {both ? (
        <div className="glass distance-card">
          <p className="eyebrow">
            {approximate ? copy.map.approximate : copy.map.apart}
          </p>
          <strong>{distanceLabel(distance(a.location, b.location))}</strong>
          <a
            className="card-link"
            href={middleUrl(a.location, b.location)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.map.middle} ↗
          </a>
        </div>
      ) : (
        <p className="muted small map-waiting">{copy.map.waiting}</p>
      )}
      <details className="glass location-sheet" open>
        <summary>{copy.map.expand}</summary>
        <div className="map-person-tabs">
          {members.map((member) => (
            <button
              key={member.user_id}
              aria-pressed={current.user_id === member.user_id}
              onClick={() => setSelected(member.user_id)}
            >
              <Avatar
                name={member.display_name}
                color={member.color}
                path={member.avatar_path}
              />
              <span>
                {member.user_id === data.self.user_id
                  ? copy.map.you
                  : data.self.partner_nickname ||
                    member.nickname ||
                    member.display_name}
              </span>
            </button>
          ))}
        </div>
        <div className="map-person-title">
          <Avatar
            name={current.display_name}
            color={current.color}
            path={current.avatar_path}
          />
          <h2>
            {current.user_id === data.self.user_id
              ? current.nickname || current.display_name
              : data.self.partner_nickname ||
                current.nickname ||
                current.display_name}
          </h2>
        </div>
        <div
          className="location-freshness"
          data-state={status.state}
          role="status"
        >
          <span aria-hidden="true" />
          {status.label}
        </div>
        {directions && current.user_id !== data.self.user_id && (
          <a
            className="button directions-link"
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
          >
            Directions in Google Maps ↗
          </a>
        )}
        {status.state === 'old' && (
          <p className="muted small">
            This is the last shared position. A new update needs location and an
            internet connection on that phone.
          </p>
        )}
        {current.share_mode === 'paused' ? (
          <p>{copy.map.paused}</p>
        ) : currentLocation ? (
          <>
            {current.share_mode === 'surprise' && <p>{copy.map.surprise}</p>}
            <p className="small muted">
              {copy.map.lastFix}: {stamp}
            </p>
            {now - Date.parse(currentLocation.recorded_at) > 300_000 && (
              <p className="stale-label">{copy.map.old}</p>
            )}
            <div className="location-metrics">
              <span>
                {currentLocation.battery_pct === null
                  ? copy.map.batteryUnknown
                  : `${currentLocation.battery_pct}% ${currentLocation.charging ? 'ϟ' : ''}`}
              </span>
              <span>
                {currentLocation.is_moving ? copy.map.moving : copy.map.still}
              </span>
              {!currentLocation.fuzzed &&
                currentLocation.speed_mps !== null && (
                  <span>
                    {Math.round(currentLocation.speed_mps * 3.6)} km/h
                  </span>
                )}
              {currentLocation.accuracy_m !== null && (
                <span>
                  ±{Math.round(currentLocation.accuracy_m)} m{' '}
                  {copy.map.accuracy}
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="muted">{copy.map.waiting}</p>
        )}
        {current.user_id !== data.self.user_id && (
          <div className="map-connect">
            {callUrl(current.phone ?? '') && (
              <a href={callUrl(current.phone ?? '')!}>
                <Phone size={18} aria-hidden="true" />
                {copy.home.call}
              </a>
            )}
            {data.couple.meet_url && (
              <a
                href={data.couple.meet_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Video size={18} aria-hidden="true" />
                {copy.home.meet}
              </a>
            )}
            {whatsappUrl(current.phone ?? '') && (
              <a
                href={whatsappUrl(current.phone ?? '')!}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} aria-hidden="true" />
                {copy.home.whatsapp}
              </a>
            )}
          </div>
        )}
        <label className="check-row">
          <input
            type="checkbox"
            checked={showTrail}
            onChange={(event) => setShowTrail(event.target.checked)}
          />
          {copy.map.trail}
        </label>
        <p className="small muted">{copy.map.trailHint}</p>
        {trail.error && <p role="status">{copy.common.error}</p>}
      </details>
      <section className="glass map-sharing">
        <p className="muted small">
          {nativeTracking ? copy.tracking.nativeNotice : copy.map.webNotice}
        </p>
        {nativeTracking ? (
          <Link className="button" to="/tracking">
            {copy.tracking.manage}
          </Link>
        ) : (
          <Button
            type="button"
            onClick={sharing.enabled ? sharing.stop : sharing.start}
            disabled={data.self.share_mode === 'paused'}
          >
            {sharing.enabled ? copy.map.stop : copy.map.start}
          </Button>
        )}
        {(sharing.message || data.self.share_mode === 'paused') && (
          <p className="small" role="status">
            {data.self.share_mode === 'paused'
              ? copy.map.paused
              : sharing.message}
          </p>
        )}
      </section>
      {editor && (
        <PlaceEditor
          key={editor.id ?? `${editor.draft.lat},${editor.draft.lng}`}
          initial={editor.draft}
          id={editor.id}
          onClose={() => setEditor(null)}
        />
      )}
      <section className="our-places">
        <h2>{copy.map.places}</h2>
        {live.places.isPending ? (
          <p role="status">{copy.common.loading}</p>
        ) : live.places.error || live.locations.error ? (
          <p role="alert">
            {copy.common.error}
            <button
              className="text-button"
              onClick={() => {
                void live.places.refetch()
                void live.locations.refetch()
              }}
            >
              {copy.common.retry}
            </button>
          </p>
        ) : !places.length ? (
          <p className="muted">{copy.map.noPlaces}</p>
        ) : (
          places.map((place) => (
            <article key={place.id} className="glass place-row">
              <MapPin size={20} aria-hidden="true" />
              <div>
                <h3>
                  {place.emoji} {place.name}
                </h3>
                <p className="muted small">{place.radius_m} m</p>
              </div>
              <button className="text-button" onClick={() => edit(place)}>
                {copy.map.edit}
              </button>
              <button
                className="text-button"
                onClick={() => setConfirmDelete(place.id)}
              >
                {copy.map.remove}
              </button>
              {confirmDelete === place.id && (
                <div className="place-delete">
                  <p>{copy.map.removeConfirm}</p>
                  <button
                    className="button button-secondary"
                    disabled={busy}
                    onClick={() => {
                      void remove(place.id)
                    }}
                  >
                    {copy.map.remove}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setConfirmDelete(null)}
                  >
                    {copy.map.cancel}
                  </button>
                </div>
              )}
            </article>
          ))
        )}
        {message && <p role="alert">{message}</p>}
      </section>
    </div>
  )
}
