import { useContext, useMemo, useState } from 'react'
import { useBackLayer } from '@/app/backLayers'
import { AtlasContext, freshAtlas } from '@/app/FlowContext'
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
  Radio,
  RadioOff,
} from 'lucide-react'
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
import {
  distance,
  distanceLabel,
  middleUrl,
  validPoint,
  type Point,
} from '@/lib/geo'
import {
  journeysFromFixes,
  selectedSample,
  type TrailFix,
  type Journey,
} from '@/lib/journeys'
import type { PlaceDraft } from '@/lib/place'
import { useLiveData } from './LiveContext'
import { LocationRefresh } from './LocationRefresh'
import { JourneyList } from './JourneyList'
import { JourneyPlayer } from './JourneyPlayer'
import { AtlasSheet } from './AtlasSheet'
import MapCanvas from './MapCanvas'
import PlaceEditor from './PlaceEditor'
import './atlas.css'
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
  const memory = useContext(AtlasContext)
  const [local, setLocal] = useState(freshAtlas)
  const { atlas, setAtlas } = memory ?? { atlas: local, setAtlas: setLocal }
  const patch = (value: Partial<typeof atlas>) =>
    setAtlas((previous) => ({ ...previous, ...value }))
  const [personMenu, setPersonMenu] = useState(false)
  const [fit, setFit] = useState(0),
    [attempt, setAttempt] = useState(0),
    [adding, setAdding] = useState(false)
  const [spot, setSpot] = useState<Spot | null>(null),
    [editor, setEditor] = useState<{ draft: PlaceDraft; id?: string } | null>(
      null,
    )
  const [focus, setFocus] = useState<{
    points: Point[]
    key: number
    sample?: boolean
  } | null>(null)
  const [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  // Expanded browsing is a lower layer; selections and dialogs close before it.
  useBackLayer(atlas.expanded, () => {
    patch({ expanded: false })
    document
      .querySelector<HTMLButtonElement>('.atlas-sheet-handle')
      ?.focus({ preventScroll: true })
  })
  useBackLayer(personMenu, () => {
    setPersonMenu(false)
    document
      .querySelector<HTMLButtonElement>(
        '.atlas-people button[aria-pressed="true"]',
      )
      ?.focus({ preventScroll: true })
  })
  useBackLayer(Boolean(spot), closeSpot)
  useBackLayer(adding, () => setAdding(false))
  const members = data
    ? [data.self, ...(data.partner ? [data.partner] : [])]
    : []
  const current =
    members.find((m) => m.user_id === atlas.person) ??
    data?.partner ??
    data?.self
  const history = useQuery({
    queryKey: ['journeys', current?.user_id, current?.location_epoch],
    enabled: Boolean(atlas.view === 'day' && current?.share_mode === 'live'),
    staleTime: 60_000,
    refetchInterval:
      atlas.view === 'day' && current?.share_mode === 'live' ? 60_000 : false,
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
  useBackLayer(
    atlas.view === 'day' &&
      current?.share_mode === 'live' &&
      journeys.some((journey) => journey.id === atlas.journey),
    closeJourney,
  )
  if (!data || !current) return null
  // Never paint a cached precise fix during a transition into Surprise or Pause.
  const people = members.flatMap((member) => {
    const location = live.locations.data?.find(
      (l) => l.user_id === member.user_id,
    )
    return location &&
      validPoint(location) &&
      member.share_mode !== 'paused' &&
      (member.share_mode !== 'surprise' || location.fuzzed)
      ? [{ member, location }]
      : []
  })
  const location = people.find(
    (p) => p.member.user_id === current.user_id,
  )?.location
  const status = locationStatus(current.share_mode, location?.recorded_at, now)
  const selectedJourney =
    atlas.view === 'day' && current.share_mode === 'live'
      ? journeys.find((j) => j.id === atlas.journey)
      : undefined
  const sample = selectedSample(selectedJourney, atlas.sample)
  const a = people.find((p) => p.member.user_id === data.self.user_id),
    b = people.find((p) => p.member.user_id === data.partner?.user_id)
  const recentPair =
    a &&
    b &&
    people.every((p) => {
      const age = now - Date.parse(p.location.recorded_at)
      return Number.isFinite(age) && age >= -60_000 && age <= 300_000
    })
  const precisePair =
    recentPair &&
    people.every((p) => p.member.share_mode === 'live' && !p.location.fuzzed)
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
  function focusPoints(points: Point[], sample = false) {
    setFocus((previous) => ({ points, sample, key: (previous?.key ?? 0) + 1 }))
  }
  function closeJourney() {
    document
      .querySelector<HTMLButtonElement>('.journey-row[aria-pressed="true"]')
      ?.focus({ preventScroll: true })
    patch({ journey: null, sample: null })
  }
  function closeSpot() {
    document
      .querySelector<HTMLButtonElement>(
        '.atlas-view-switch button[aria-pressed="true"]',
      )
      ?.focus({ preventScroll: true })
    setSpot(null)
  }
  function selectPerson(id: string) {
    patch({ person: id, view: 'now', journey: null, sample: null })
    setPersonMenu(true)
    setSpot(null)
    const selected = people.find((p) => p.member.user_id === id)
    if (selected) focusPoints([selected.location])
  }
  function showSpot(place: Spot) {
    setPersonMenu(false)
    setSpot(place)
    patch({ expanded: true, view: 'places', journey: null, sample: null })
    focusPoints([place])
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
  function toggleAdding() {
    setAdding((value) => !value)
    setPersonMenu(false)
    setSpot(null)
    patch({ expanded: false })
  }
  function chooseJourney(journey: Journey) {
    patch({ journey: journey.id, sample: journey.points[0]!.recorded_at })
    focusPoints(journey.points)
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
  const instruments = location && (
    <div className="atlas-instruments">
      <span title="Battery">
        <Battery size={16} aria-hidden="true" />
        {location.battery_pct === null ? '—' : `${location.battery_pct}%`}
      </span>
      {!location.fuzzed && location.speed_mps !== null && (
        <span title="GPS speed estimate">
          <Gauge size={16} aria-hidden="true" />
          {Math.round(location.speed_mps * 3.6)} km/h
        </span>
      )}
      <span title="GPS accuracy">
        <LocateFixed size={16} aria-hidden="true" />
        {location.fuzzed
          ? 'Approximate'
          : location.accuracy_m === null
            ? 'Accuracy unknown'
            : `±${Math.round(location.accuracy_m)} m`}
      </span>
    </div>
  )
  return (
    <div className="page map-page atlas-page">
      <h1 className="sr-only">Our map</h1>
      <div className="atlas-workspace">
        <div className="atlas-frame">
          <MapCanvas
            key={`${dark}-${attempt}`}
            dark={dark}
            accent={data.self.theme_accent}
            people={selectedJourney ? [] : people}
            places={selectedJourney ? [] : places}
            trail={selectedJourney?.points ?? []}
            sample={sample}
            timezone={data.couple.timezone}
            fit={fit}
            adding={adding}
            focus={focus}
            onPick={choose}
            onPerson={selectPerson}
            onPlace={showSpot}
            onLandmark={showSpot}
            onRetry={() => setAttempt((n) => n + 1)}
          />
          <div className="atlas-map-caption">
            <span
              className={`atlas-connection ${live.connection === 'live' ? 'is-live' : ''}`}
              role="img"
              aria-label={
                live.connection === 'live' ? 'Connected' : 'Reconnecting'
              }
            />
            <span>
              {a && b ? (
                <>
                  <strong>
                    {distanceLabel(distance(a.location, b.location))}
                  </strong>{' '}
                  {a.location.fuzzed || b.location.fuzzed ? 'approx. ' : ''}
                  {recentPair ? 'apart' : 'last shared'}
                </>
              ) : (
                'Our map'
              )}
            </span>
            {precisePair && (
              <a
                href={middleUrl(a.location, b.location)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Meet in the middle"
                title="Meet in the middle"
              >
                <Route size={18} />
              </a>
            )}
          </div>
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
                patch({ view: 'now', journey: null, sample: null })
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
              onClick={toggleAdding}
            >
              {adding ? <X size={20} /> : <Plus size={20} />}
            </button>
          </div>
          {adding && (
            <p className="atlas-map-hint" role="status">
              Tap the map to pin a place
            </p>
          )}
        </div>
        <AtlasSheet
          expanded={atlas.expanded}
          onExpand={(expanded) => patch({ expanded })}
          summary={
            <>
              <div className="atlas-people" aria-label="Choose a person">
                {members.map((member) => (
                  <button
                    key={member.user_id}
                    aria-pressed={current.user_id === member.user_id}
                    onClick={() => selectPerson(member.user_id)}
                  >
                    <Avatar
                      name={member.display_name}
                      color={member.color}
                      path={member.avatar_path}
                    />
                    <span>
                      {member.user_id === data.self.user_id
                        ? 'You'
                        : data.self.partner_nickname ||
                          member.nickname ||
                          member.display_name}
                    </span>
                  </button>
                ))}
              </div>
              <div className="atlas-person-summary">
                <div
                  className="atlas-fix"
                  data-state={status.state}
                  title={stamp}
                >
                  <span className="status-dot" aria-hidden="true" />
                  <span>{status.label}</span>
                </div>
                <LocationRefresh
                  key={current.user_id}
                  member={current}
                  recordedAt={location?.recorded_at}
                />
              </div>
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
                      <Navigation size={20} />
                    </a>
                  ) : (
                    <button
                      disabled
                      aria-label="Directions unavailable"
                      title="Needs a recent precise location"
                    >
                      <Navigation size={20} />
                    </button>
                  )}
                  <Link
                    to={`/person/${current.user_id}`}
                    aria-label="Profile"
                    title="Profile"
                  >
                    <UserRound size={20} />
                  </Link>
                  <Link to="/chat" aria-label="Message" title="Message">
                    <MessageCircle size={20} />
                  </Link>
                  <button
                    onClick={() => setPersonMenu(false)}
                    aria-label="Close person actions"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="atlas-section-head">
                <div className="atlas-view-switch" aria-label="Map view">
                  {(['now', 'day', 'places'] as const).map((view) => (
                    <button
                      key={view}
                      aria-pressed={atlas.view === view}
                      onClick={() => {
                        patch({
                          view,
                          expanded: view !== 'now' || atlas.expanded,
                        })
                        setSpot(null)
                        setPersonMenu(false)
                      }}
                    >
                      {view === 'now'
                        ? 'Now'
                        : view === 'day'
                          ? '24 hours'
                          : 'Places'}
                    </button>
                  ))}
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
                    className="icon-button"
                    disabled={data.self.share_mode === 'paused'}
                    aria-label={
                      sharing.enabled ? 'Stop sharing' : 'Share while open'
                    }
                    title={
                      sharing.enabled ? 'Stop sharing' : 'Share while open'
                    }
                    onClick={sharing.enabled ? sharing.stop : sharing.start}
                  >
                    {sharing.enabled ? (
                      <RadioOff size={19} />
                    ) : (
                      <Radio size={19} />
                    )}
                  </button>
                )}
              </div>
            </>
          }
        >
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
          {atlas.view === 'now' && (
            <div className="atlas-now-detail">
              {instruments}
              {directions && (
                <a
                  className="atlas-directions"
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation size={18} aria-hidden="true" />
                  Directions
                </a>
              )}
              {stamp && <time dateTime={location?.recorded_at}>{stamp}</time>}
              {!location && <p className="atlas-empty">{status.label}</p>}
            </div>
          )}
          {atlas.view === 'day' &&
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
                {selectedJourney && sample && (
                  <JourneyPlayer
                    journey={selectedJourney}
                    sample={sample}
                    timezone={data.couple.timezone}
                    onSample={(point) => {
                      patch({ sample: point.recorded_at })
                      focusPoints([point], true)
                    }}
                    onClose={closeJourney}
                  />
                )}
                {history.data?.partial && (
                  <p className="small muted">Latest samples</p>
                )}
                <JourneyList
                  journeys={journeys}
                  timezone={data.couple.timezone}
                  selected={selectedJourney?.id}
                  onSelect={chooseJourney}
                />
              </>
            ))}
          {atlas.view === 'places' && (
            <section className="atlas-places">
              {spot ? (
                <div className="atlas-spot">
                  <header>
                    <span className="spot-symbol" aria-hidden="true">
                      {spot.emoji ?? '⌖'}
                    </span>
                    <h2>{spot.name}</h2>
                    <button
                      className="icon-button"
                      aria-label="Close place"
                      onClick={closeSpot}
                    >
                      <X size={18} />
                    </button>
                  </header>
                  <div className="atlas-place-actions">
                    <a
                      className="atlas-directions"
                      href={navigateUrl(spot)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Directions to ${spot.name}`}
                      title="Open Google Maps"
                    >
                      <Navigation size={18} aria-hidden="true" />
                      Directions
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
                          <Pencil size={18} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label="Delete place"
                          onClick={() => setDeleting(true)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="atlas-section-head">
                    <h2>Our places</h2>
                    <button
                      className="icon-button"
                      aria-label="Add a saved place"
                      onClick={toggleAdding}
                    >
                      <Plus size={20} />
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
                    <button
                      className="atlas-empty-place"
                      onClick={toggleAdding}
                    >
                      <MapPin size={20} />
                      Pin somewhere
                    </button>
                  ) : (
                    <div className="atlas-place-list">
                      {places.map((place) => (
                        <button key={place.id} onClick={() => showSpot(place)}>
                          <span aria-hidden="true">{place.emoji}</span>
                          <strong>{place.name}</strong>
                          <Navigation size={17} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </AtlasSheet>
      </div>
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
    </div>
  )
}
