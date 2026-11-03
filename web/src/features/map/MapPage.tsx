import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  X,
  MapPin,
  Navigation,
  Pencil,
  Trash2,
  Battery,
  Gauge,
  ShieldCheck,
  Route,
  LocateFixed,
  UserRound,
  MessageCircle,
} from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Avatar } from '@/components/ui/Avatar'
import { nativeTracking } from '@/native/tracker'
import { useNow } from '@/hooks/useNow'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useLocationSharing } from '@/features/location/LocationContext'
import { locationStatus, directionsTo } from '@/lib/location-status'
import { distance, distanceLabel, middleUrl, type Point } from '@/lib/geo'
import { journeysFromFixes, type TrailFix, type Journey } from '@/lib/journeys'
import type { PlaceDraft } from '@/lib/place'
import { useLiveData } from './LiveContext'
import { LocationRefresh } from './LocationRefresh'
import { JourneyList } from './JourneyList'
import MapCanvas from './MapCanvas'
import PlaceEditor from './PlaceEditor'
type Spot = Point & { name: string; emoji?: string; id?: string }
const navigateUrl = (p: Point) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
export default function MapPage() {
  const { data } = useSpace(),
    { client } = useAuth(),
    live = useLiveData(),
    sharing = useLocationSharing(),
    query = useQueryClient()
  useTheme()
  const now = useNow(),
    dark = document.documentElement.dataset.theme !== 'light'
  const [selected, setSelected] = useState<string | null>(null),
    [view, setView] = useState<'now' | 'day'>('now')
  const [personMenu, setPersonMenu] = useState(false)
  const [fit, setFit] = useState(0),
    [attempt, setAttempt] = useState(0),
    [adding, setAdding] = useState(false)
  const [spot, setSpot] = useState<Spot | null>(null),
    [editor, setEditor] = useState<{ draft: PlaceDraft; id?: string } | null>(
      null,
    )
  const [focus, setFocus] = useState<{ points: Point[]; key: number } | null>(
      null,
    ),
    [journeyId, setJourneyId] = useState<string>()
  const [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const members = data
    ? [data.self, ...(data.partner ? [data.partner] : [])]
    : []
  const current =
    members.find((m) => m.user_id === selected) ?? data?.partner ?? data?.self
  const history = useQuery({
    queryKey: ['journeys', current?.user_id, current?.location_epoch],
    enabled: Boolean(view === 'day' && current?.share_mode === 'live'),
    staleTime: 60_000,
    refetchInterval: view === 'day' ? 60_000 : false,
    queryFn: async () => {
      const fixes: TrailFix[] = []
      for (let offset = 0; offset < 6000; offset += 1000) {
        const result = await client
          .from('location_history')
          .select('lat,lng,recorded_at,accuracy_m,speed_mps')
          .eq('user_id', current!.user_id)
          .gte('recorded_at', new Date(Date.now() - 86400_000).toISOString())
          .order('recorded_at', { ascending: false })
          .range(offset, offset + 999)
        if (result.error) throw result.error
        fixes.push(...result.data)
        if (result.data.length < 1000) return { fixes, partial: false }
      }
      return { fixes, partial: true }
    },
  })
  const journeys = useMemo(
    () => journeysFromFixes(history.data?.fixes ?? [], now),
    [history.data, now],
  )
  if (!data || !current) return null
  const people = members.flatMap((member) => {
    const location = live.locations.data?.find(
      (l) => l.user_id === member.user_id,
    )
    return location && member.share_mode !== 'paused'
      ? [{ member, location }]
      : []
  })
  const location = live.locations.data?.find(
    (l) => l.user_id === current.user_id,
  )
  const status = locationStatus(current.share_mode, location?.recorded_at, now)
  const selectedJourney = journeys.find((j) => j.id === journeyId)
  const trail =
    view === 'day' && current.share_mode === 'live'
      ? (selectedJourney?.points ?? [])
      : []
  const a = people.find((p) => p.member.user_id === data.self.user_id),
    b = people.find((p) => p.member.user_id === data.partner?.user_id)
  const directions = location
    ? directionsTo(
        location,
        current.share_mode,
        location.fuzzed,
        location.recorded_at,
        now,
      )
    : null
  const stamp = location
    ? new Intl.DateTimeFormat('en-IN', {
        timeZone: data.couple.timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(location.recorded_at))
    : undefined
  const places = live.places.data ?? []
  function focusPoints(points: Point[]) {
    setFocus((previous) => ({ points, key: (previous?.key ?? 0) + 1 }))
  }
  function choose(p: Point) {
    setEditor({
      draft: {
        ...p,
        name: '',
        emoji: '📍',
        radius_m: 150,
        notify_arrive: true,
        notify_leave: true,
      },
    })
    setAdding(false)
  }
  function chooseJourney(j: Journey) {
    setJourneyId(j.id)
    focusPoints(j.points)
  }
  async function remove() {
    if (!spot?.id || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await client
        .from('places')
        .delete()
        .eq('id', spot.id)
        .select('id')
        .single()
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['places'] })
      setSpot(null)
      setDeleting(false)
    } catch {
      setError('Couldn’t delete this place.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page map-page atlas-page">
      <SectionHeading title="Map" kind="map" />
      <div className="atlas-frame">
        <MapCanvas
          key={`${dark}-${attempt}`}
          dark={dark}
          accent={data.self.theme_accent}
          people={people}
          places={places}
          trail={trail}
          fit={fit}
          adding={adding}
          focus={focus}
          onPick={choose}
          onPerson={(id) => {
            setSelected(id)
            setPersonMenu(true)
            setJourneyId(undefined)
            setSpot(null)
          }}
          onPlace={(place) => {
            setPersonMenu(false)
            setSpot(place)
            focusPoints([place])
          }}
          onLandmark={(place) => {
            setPersonMenu(false)
            setSpot(place)
          }}
          onRetry={() => setAttempt((n) => n + 1)}
        />
        <div className="map-toolbar">
          <button
            className="atlas-tool"
            aria-label="Show both of us"
            title="Show both of us"
            disabled={!people.length}
            onClick={() => {
              setFit((n) => n + 1)
              setPersonMenu(false)
              setSpot(null)
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <ellipse
                cx="16"
                cy="16"
                rx="14"
                ry="7"
                transform="rotate(-32 16 16)"
              />
              <circle cx="9" cy="20" r="2.8" fill="currentColor" />
              <circle cx="23" cy="12" r="2.8" fill="currentColor" />
            </svg>
          </button>
          <button
            className="atlas-tool"
            aria-label={adding ? 'Cancel adding place' : 'Add a place'}
            title={adding ? 'Cancel' : 'Add a place'}
            onClick={() => {
              setAdding(!adding)
              setPersonMenu(false)
              setSpot(null)
            }}
          >
            {adding ? <X size={20} /> : <Plus size={20} />}
          </button>
        </div>
        {adding && (
          <p className="atlas-map-hint" role="status">
            Tap the map to pin a place
          </p>
        )}
        {personMenu && (
          <div
            className="map-person-menu"
            role="group"
            aria-label="Person actions"
          >
            {directions ? (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Directions"
                title="Directions"
              >
                <Navigation size={21} />
              </a>
            ) : (
              <button
                disabled
                aria-label="Directions unavailable"
                title="Needs a recent precise location"
              >
                <Navigation size={21} />
              </button>
            )}
            <Link
              to={`/person/${current.user_id}`}
              aria-label="Profile"
              title="Profile"
            >
              <UserRound size={21} />
            </Link>
            <Link to="/chat" aria-label="Message" title="Message">
              <MessageCircle size={21} />
            </Link>
            <button
              onClick={() => setPersonMenu(false)}
              aria-label="Close person actions"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="atlas-distance">
        {a && b ? (
          <>
            <span>
              <strong>{distanceLabel(distance(a.location, b.location))}</strong>{' '}
              {a.location.fuzzed || b.location.fuzzed
                ? 'approximately apart'
                : 'apart'}
            </span>
            <a
              href={middleUrl(a.location, b.location)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Meet in the middle"
              title="Meet in the middle"
            >
              <Route size={18} />
            </a>
          </>
        ) : (
          <span className="muted">{status.label}</span>
        )}
        <span
          role="img"
          className={`atlas-connection ${live.connection === 'live' ? 'is-live' : ''}`}
          title={live.connection === 'live' ? 'Connected' : 'Reconnecting'}
          aria-label={live.connection === 'live' ? 'Connected' : 'Reconnecting'}
        />
      </div>
      {spot && (
        <section className="atlas-spot">
          <span className="spot-symbol" aria-hidden="true">
            {spot.emoji ?? '⌖'}
          </span>
          <h2>{spot.name}</h2>
          <a
            className="icon-button"
            href={navigateUrl(spot)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Navigate to ${spot.name}`}
            title="Open Google Maps"
          >
            <Navigation size={19} />
          </a>
          {spot.id && (
            <>
              <button
                className="icon-button"
                aria-label="Edit place"
                onClick={() => {
                  const place = places.find((p) => p.id === spot.id)
                  if (place) setEditor({ draft: place, id: place.id })
                }}
              >
                <Pencil size={17} />
              </button>
              <button
                className="icon-button"
                aria-label="Delete place"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={17} />
              </button>
            </>
          )}
          <button
            className="icon-button"
            aria-label="Close place"
            onClick={() => setSpot(null)}
          >
            <X size={17} />
          </button>
        </section>
      )}
      <section className="atlas-person">
        <div className="atlas-people" aria-label="Choose a person">
          {members.map((m) => (
            <button
              key={m.user_id}
              aria-pressed={current.user_id === m.user_id}
              onClick={() => {
                setSelected(m.user_id)
                setSpot(null)
                setPersonMenu(true)
                setJourneyId(undefined)
              }}
            >
              <Avatar
                name={m.display_name}
                color={m.color}
                path={m.avatar_path}
              />
              <span>
                {m.user_id === data.self.user_id
                  ? 'You'
                  : data.self.partner_nickname || m.nickname || m.display_name}
              </span>
            </button>
          ))}
        </div>
        <div className="atlas-person-summary">
          <div className="atlas-fix" data-state={status.state} title={stamp}>
            <span className="status-dot" />
            <span>{status.label}</span>
          </div>
          <LocationRefresh
            key={current.user_id}
            member={current}
            recordedAt={location?.recorded_at}
          />
        </div>
        {current.share_mode !== 'paused' && location && (
          <div className="atlas-instruments">
            <span title="Battery">
              <Battery size={16} />
              {location.battery_pct === null ? '—' : `${location.battery_pct}%`}
            </span>
            {!location.fuzzed && location.speed_mps !== null && (
              <span title="Speed">
                <Gauge size={16} />
                {Math.round(location.speed_mps * 3.6)} km/h
              </span>
            )}
            <span title="GPS accuracy">
              <LocateFixed size={16} />
              {location.fuzzed
                ? 'Approximate'
                : `±${Math.round(location.accuracy_m ?? 0)} m`}
            </span>
            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Navigate to this location"
                title="Google Maps"
              >
                <Navigation size={18} />
              </a>
            )}
          </div>
        )}
      </section>
      <div className="atlas-section-head">
        <div className="atlas-view-switch" aria-label="Map view">
          <button aria-pressed={view === 'now'} onClick={() => setView('now')}>
            Now
          </button>
          <button aria-pressed={view === 'day'} onClick={() => setView('day')}>
            24 hours
          </button>
        </div>
        {nativeTracking ? (
          <Link
            className="icon-button"
            to="/tracking"
            aria-label="Tracking settings"
            title="Tracking settings"
          >
            <ShieldCheck size={20} />
          </Link>
        ) : (
          <button
            className="text-button"
            disabled={data.self.share_mode === 'paused'}
            onClick={sharing.enabled ? sharing.stop : sharing.start}
          >
            {sharing.enabled ? 'Stop sharing' : 'Share while open'}
          </button>
        )}
      </div>
      {view === 'day' &&
        (current.share_mode !== 'live' ? (
          <p className="atlas-empty">
            History hidden in{' '}
            {current.share_mode === 'paused' ? 'Pause' : 'Surprise'} mode
          </p>
        ) : history.isPending ? (
          <p role="status" className="atlas-empty">
            Loading journeys…
          </p>
        ) : history.error ? (
          <button
            className="text-button"
            onClick={() => {
              void history.refetch()
            }}
          >
            Retry journeys
          </button>
        ) : (
          <>
            {history.data?.partial && (
              <p className="small muted">Latest samples</p>
            )}
            <JourneyList
              journeys={journeys}
              timezone={data.couple.timezone}
              selected={journeyId}
              onSelect={chooseJourney}
            />
          </>
        ))}
      <section className="atlas-places">
        <div className="atlas-section-head">
          <h2>Our places</h2>
          <button
            className="icon-button"
            aria-label="Add a saved place"
            onClick={() => setAdding(!adding)}
          >
            <Plus size={19} />
          </button>
        </div>
        {live.places.error ? (
          <button
            className="text-button"
            onClick={() => {
              void live.places.refetch()
            }}
          >
            Retry places
          </button>
        ) : !places.length ? (
          <button className="atlas-empty-place" onClick={() => setAdding(true)}>
            <MapPin size={20} />
            Pin somewhere
          </button>
        ) : (
          <div className="atlas-place-list">
            {places.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSpot(p)
                  focusPoints([p])
                }}
              >
                <span aria-hidden="true">{p.emoji}</span>
                <strong>{p.name}</strong>
                <Navigation size={15} aria-hidden="true" />
              </button>
            ))}
          </div>
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
      {deleting && (
        <ConfirmSheet
          title="Delete this place?"
          description="This removes the shared pin and its arrival alerts."
          confirmLabel="Delete place"
          busy={busy}
          error={error}
          onCancel={() => setDeleting(false)}
          onConfirm={() => {
            void remove()
          }}
        />
      )}
      {live.locations.error && (
        <p role="status" className="atlas-error">
          Couldn’t update locations.{' '}
          <button
            className="text-button"
            onClick={() => {
              void live.locations.refetch()
            }}
          >
            Retry
          </button>
        </p>
      )}
    </div>
  )
}
