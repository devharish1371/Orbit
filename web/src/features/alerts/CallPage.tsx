import { Link } from 'react-router-dom'
import { useSpace } from '@/hooks/useSpace'
import { callUrl } from '@/lib/connect'
import { copy } from '@/copy/en'
export default function CallPage() {
  const { data: space } = useSpace()
  const phone = callUrl(space?.partner?.phone ?? '')
  return (
    <div className="page">
      <Link className="back-link" to="/activity">
        ← {copy.common.back}
      </Link>
      <header className="page-heading">
        <p className="eyebrow">{copy.alerts.callMe}</p>
        <h1>{copy.alerts.callTitle}</h1>
      </header>
      <section className="glass settings-section">
        {phone && (
          <a className="button" href={phone}>
            {copy.home.call}
          </a>
        )}
        {space?.couple.meet_url && (
          <a
            className="button button-secondary"
            href={space.couple.meet_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.home.meet}
          </a>
        )}
      </section>
    </div>
  )
}
