import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, MapPin, MessageCircle, Phone, Image } from 'lucide-react'
import { BackLink, JourneyLink as Link } from '@/components/ui/JourneyLink'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { Avatar } from '@/components/ui/Avatar'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
import { callUrl } from '@/lib/connect'
export default function PersonPage() {
  const { id } = useParams(),
    { data } = useSpace(),
    { client } = useAuth()
  const [photo, setPhoto] = useState(false)
  const person = [data?.self, data?.partner].find((m) => m?.user_id === id)
  const image = useQuery({
    queryKey: ['person-photo', person?.avatar_path],
    enabled: Boolean(photo && person?.avatar_path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const result = await client.storage
        .from('media')
        .createSignedUrl(person!.avatar_path!, 3600)
      if (result.error) throw result.error
      return result.data.signedUrl
    },
  })
  if (!data) return null
  if (!person)
    return (
      <div className="page">
        <BackLink fallback="/us" />
        <h1>Profile unavailable</h1>
      </div>
    )
  const own = person.user_id === data.self.user_id
  const name = own
    ? person.nickname || person.display_name
    : data.self.partner_nickname || person.nickname || person.display_name
  const phone = callUrl(person.phone ?? '')
  return (
    <div className="page person-page">
      <BackLink fallback={own ? '/us' : '/chat'} />
      <section
        className="person-cover"
        style={{ '--person-color': person.color } as React.CSSProperties}
      >
        <div className="person-cover-lines" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <button
          className="person-photo-trigger"
          disabled={!person.avatar_path}
          aria-label={`View ${name}’s photo`}
          onClick={() => setPhoto(true)}
        >
          <Avatar
            name={person.display_name}
            color={person.color}
            path={person.avatar_path}
            large
          />
          {person.avatar_path && (
            <span>
              <Image size={16} aria-hidden="true" />
            </span>
          )}
        </button>
        <h1>{name}</h1>
        {name !== person.display_name && (
          <p className="muted">{person.display_name}</p>
        )}
        <div className="person-mode">
          <span
            className={`status-dot ${person.share_mode === 'paused' ? 'is-old' : ''}`}
          />
          {person.share_mode === 'live'
            ? 'Sharing location'
            : person.share_mode === 'surprise'
              ? 'Surprise mode'
              : 'Sharing paused'}
        </div>
      </section>
      <div className="person-actions">
        {!own && (
          <Link to="/chat">
            <MessageCircle size={21} />
            <span>Message</span>
          </Link>
        )}
        {!own && phone && (
          <a href={phone}>
            <Phone size={21} />
            <span>Call</span>
          </a>
        )}
        <Link to="/map">
          <MapPin size={21} />
          <span>Map</span>
        </Link>
      </div>
      {own && (
        <Link className="person-edit" to="/profile">
          Edit your profile
          <ArrowUpRight size={18} />
        </Link>
      )}
      {photo && (
        <DialogSheet
          title={`${name}’s photo`}
          className="person-photo-sheet"
          onClose={() => setPhoto(false)}
        >
          {image.data ? (
            <img src={image.data} alt={name} />
          ) : (
            <p role="status">
              {image.error ? 'Couldn’t load the photo.' : 'Loading photo…'}
            </p>
          )}
        </DialogSheet>
      )}
    </div>
  )
}
