import {
  ArrowUpRight,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Video,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { copy } from '@/copy/en'
import { useLiveData } from '@/features/map/LiveContext'
import { useSpace } from '@/hooks/useSpace'
import { OrbitPortraits } from '@/components/ui/OrbitPortraits'
import { callUrl, whatsappUrl } from '@/lib/connect'
import { anniversaryDays, localDateParts } from '@/lib/calendar'
import { AttentionActions } from '@/features/alerts/AttentionActions'
import { ExpiringSoon } from '@/features/posts/ExpiringSoon'
import { DailyQuestion } from '@/features/memories/DailyQuestion'
import { useNow } from '@/hooks/useNow'

export default function HomePage() {
  const now = useNow()
  const { data: space } = useSpace()
  const live = useLiveData()
  if (!space) return null
  const { self, partner, couple } = space
  const hour = localDateParts(new Date(now), couple.timezone).hour
  const greeting =
    copy.home.greeting[hour < 5 ? 3 : hour < 12 ? 0 : hour < 17 ? 1 : 2]
  const phone = partner?.phone ?? ''
  const partnerLocation = live.locations.data?.find(
    (row) => row.user_id === partner?.user_id,
  )
  const locationAvailable = partnerLocation && partner?.share_mode !== 'paused'
  const days = couple.anniversary
    ? anniversaryDays(couple.anniversary, new Date(now), couple.timezone)
    : null
  return (
    <div className="page home-page">
      <header className="page-heading">
        <p className="eyebrow">{greeting}</p>
        <h1>{self.nickname || self.display_name}</h1>
      </header>
      <section
        className="partner-card connection-card"
        aria-label={copy.home.yourPerson}
      >
        <OrbitPortraits />
        <div className="partner-heading">
          <div>
            <h2>
              {self.partner_nickname ||
                partner?.nickname ||
                partner?.display_name ||
                '…'}
            </h2>
            <p className="status-chip">
              <span className="status-dot" />
              {partner?.share_mode === 'paused'
                ? copy.home.paused
                : partner?.share_mode === 'surprise'
                  ? copy.home.surprise
                  : copy.home.live}
            </p>
          </div>
          <Link
            className="partner-chat-link"
            to="/chat"
            aria-label={copy.nav.chat}
          >
            <MessageCircle size={21} />
          </Link>
        </div>
        <div className="location-status">
          <MapPin size={18} aria-hidden="true" />
          <div>
            <p>
              {locationAvailable
                ? `${copy.map.lastFix}: ${new Intl.DateTimeFormat('en-IN', { timeZone: couple.timezone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(partnerLocation.recorded_at))}`
                : partner?.share_mode === 'paused'
                  ? copy.home.paused
                  : copy.home.waiting}
            </p>
            {locationAvailable && partnerLocation.fuzzed && (
              <p className="muted small">{copy.map.surprise}</p>
            )}
          </div>
        </div>
        <div className="quick-actions">
          {callUrl(phone) && (
            <a href={callUrl(phone)!}>
              <span>
                <Phone size={21} aria-hidden="true" />
              </span>
              {copy.home.call}
            </a>
          )}
          {couple.meet_url ? (
            <a href={couple.meet_url} target="_blank" rel="noopener noreferrer">
              <span>
                <Video size={22} aria-hidden="true" />
              </span>
              {copy.home.meet}
            </a>
          ) : (
            <Link to="/settings" title={copy.home.meetSetup}>
              <span>
                <Video size={22} aria-hidden="true" />
              </span>
              {copy.home.meet}
            </Link>
          )}
          {whatsappUrl(phone) && (
            <a
              href={whatsappUrl(phone)!}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                <MessageCircle size={22} aria-hidden="true" />
              </span>
              {copy.home.whatsapp}
            </a>
          )}
        </div>
      </section>
      <AttentionActions />
      <div className="home-tiles">
        <Link className="map-preview glass" to="/map">
          <div className="map-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <i />
          </div>
          <MapPin size={21} aria-hidden="true" />
          <h2>{copy.home.mapTitle}</h2>

          <span className="card-link">
            {copy.home.openMap}
            <ArrowUpRight size={17} aria-hidden="true" />
          </span>
        </Link>
        <section className="anniversary-card glass">
          <div>
            <p className="eyebrow">{copy.home.together}</p>
            {days === null ? (
              <>
                <h2>{copy.home.addDate}</h2>
                <Link to="/settings" className="card-link">
                  {copy.home.addDateAction}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </>
            ) : days === 0 ? (
              <h2>{copy.home.today}</h2>
            ) : (
              <>
                <p className="countdown-number">
                  {days}
                  <span>✦</span>
                </p>
                <p className="muted small">{copy.home.countdown}</p>
              </>
            )}
          </div>
          <Heart size={44} strokeWidth={1} aria-hidden="true" />
        </section>
      </div>
      <DailyQuestion />
      <ExpiringSoon />
    </div>
  )
}
