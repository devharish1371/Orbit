import { Link } from 'react-router-dom'
import { ArrowUpRight, Heart } from 'lucide-react'
import { useSpace } from '@/hooks/useSpace'
import { Avatar } from '@/components/ui/Avatar'
import { copy } from '@/copy/en'
export default function UsPage() {
  const { data } = useSpace()
  if (!data) return null
  const { self, partner } = data
  return (
    <div className="page us-page">
      <header className="page-heading">
        <p className="eyebrow">{copy.nav.us}</p>
        <h1>{copy.profile.hubTitle}</h1>
      </header>
      <section className="glass person-profile-card">
        <Avatar
          name={self.display_name}
          color={self.color}
          large
          path={self.avatar_path}
        />
        <div>
          <p className="eyebrow">{copy.profile.you}</p>
          <h2>{self.nickname || self.display_name}</h2>
        </div>
        <Link className="card-link" to="/profile">
          {copy.profile.edit}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
      {partner && (
        <section className="glass person-profile-card">
          <Avatar
            name={partner.display_name}
            color={partner.color}
            large
            path={partner.avatar_path}
          />
          <div>
            <p className="eyebrow">{copy.profile.partner}</p>
            <h2>
              {self.partner_nickname ||
                partner.nickname ||
                partner.display_name}
            </h2>
          </div>
          <Heart
            size={22}
            className="person-profile-heart"
            aria-hidden="true"
          />
        </section>
      )}
      <Link className="glass shared-details-link" to="/settings">
        <span>{copy.profile.shared}</span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </Link>
      <p className="muted small profile-privacy">{copy.settings.private}</p>
    </div>
  )
}
