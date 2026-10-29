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
import { useSpace } from '@/hooks/useSpace'
import { Avatar } from '@/components/ui/Avatar'
import { callUrl, whatsappUrl } from '@/lib/connect'
import { anniversaryDays, localDateParts } from '@/lib/calendar'

export default function HomePage() {
  const { data: space } = useSpace()
  if (!space) return null
  const { self, partner, couple } = space
  const hour = localDateParts(new Date(), couple.timezone).hour
  const greeting =
    copy.home.greeting[hour < 5 ? 3 : hour < 12 ? 0 : hour < 17 ? 1 : 2]
  const phone = partner?.phone ?? ''
  const days = couple.anniversary
    ? anniversaryDays(couple.anniversary, new Date(), couple.timezone)
    : null
  return (
    <div className="page home-page">
      <header className="page-heading">
        <p className="muted">
          {greeting}, {self.nickname || self.display_name}{' '}
          <span aria-hidden="true">☾</span>
        </p>
        <h1>{copy.home.title}</h1>
        <span className="heading-star" aria-hidden="true">
          ✦
        </span>
      </header>
      <section className="partner-card glass" aria-label={copy.home.yourPerson}>
        <div className="partner-heading">
          <Avatar
            name={partner?.display_name ?? '?'}
            color={partner?.color ?? '#FF6B8A'}
            large
            path={partner?.avatar_path}
          />
          <div>
            <p className="eyebrow">{copy.home.yourPerson}</p>
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
          <Heart className="partner-heart" size={22} aria-hidden="true" />
        </div>
        <div className="location-status">
          <MapPin size={18} aria-hidden="true" />
          <div>
            <p>{copy.home.waiting}</p>
            <p className="muted small">{copy.home.waitingDetail}</p>
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
      <Link className="map-preview glass" to="/map">
        <div className="map-lines" aria-hidden="true">
          <span />
          <span />
          <span />
          <i />
        </div>
        <MapPin size={21} aria-hidden="true" />
        <h2>{copy.home.mapTitle}</h2>
        <p>{copy.home.mapDescription}</p>
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
      <section className="little-things">
        <p className="eyebrow">{copy.home.smallThings}</p>
        <h2>{copy.home.smallTitle}</h2>
        <p className="muted">{copy.home.smallBody}</p>
      </section>
    </div>
  )
}
