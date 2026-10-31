import { Heart, MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { JourneyLink as Link } from '@/components/ui/JourneyLink'
import { copy } from '@/copy/en'
export default function EmptyPage({
  page,
}: {
  page: 'map' | 'moments' | 'chat' | 'us'
}) {
  const Icon = {
    map: MapPin,
    moments: Heart,
    chat: MessageCircle,
    us: Sparkles,
  }[page]
  return (
    <div className="page empty-page">
      <div className="empty-icon">
        <Icon size={36} strokeWidth={1.3} aria-hidden="true" />
      </div>
      <p className="eyebrow">{copy.nav[page]}</p>
      <h1>{copy.empty[page]}</h1>
      <p className="muted">{copy.empty[`${page}Body`]}</p>
      {page === 'us' && (
        <Link className="button" to="/settings">
          {copy.common.settings}
        </Link>
      )}
    </div>
  )
}
