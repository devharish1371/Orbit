import { StatusLine } from '@/features/personal/StatusLine'
import { useId, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ArrowUpRight, MapPin, MessageCircle, Phone, Image } from 'lucide-react'
import { BackLink, JourneyLink as Link } from '@/components/ui/JourneyLink'
import { ImageViewer } from '@/components/ui/ImageViewer'
import { imagePreview, type ImagePreview } from '@/components/ui/imagePreview'
import { Avatar } from '@/components/ui/Avatar'
import { useSpace } from '@/hooks/useSpace'
import { usePrivateMedia } from '@/hooks/usePrivateMedia'
import { useMotionAllowed } from '@/hooks/useMotionAllowed'
import { portraitName, createPortraitName } from '@/app/PortraitContext'
import { changeImageSurface } from '@/app/imageMotion'
import { callUrl } from '@/lib/connect'
export default function PersonPage() {
  const { id } = useParams()
  const { data } = useSpace()
  const path = [data?.self, data?.partner].find(
    (member) => member?.user_id === id,
  )?.avatar_path
  return <PersonProfile key={`${id}:${path ?? ''}`} id={id} />
}
function PersonProfile({ id }: { id?: string }) {
  const { data } = useSpace(),
    { state } = useLocation(),
    uid = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const motion = useMotionAllowed()
  const [photo, setPhoto] = useState(false)
  const [preview, setPreview] = useState<ImagePreview>()
  const transitionName =
    portraitName(state?.orbitPortrait) ?? createPortraitName(uid)
  const person = [data?.self, data?.partner].find((m) => m?.user_id === id)
  const image = usePrivateMedia(person?.avatar_path ?? null, photo)
  function closePhoto(animate = false) {
    changeImageSurface(() => setPhoto(false), animate)
  }
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
    <div className="page person-page" data-image-flow={motion}>
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
          ref={trigger}
          className="person-photo-trigger"
          disabled={!person.avatar_path}
          aria-label={`View ${name}’s photo`}
          aria-haspopup="dialog"
          aria-expanded={photo}
          onClick={() => {
            const ready = imagePreview(trigger.current)
            setPreview(ready)
            changeImageSurface(() => setPhoto(true), Boolean(ready))
          }}
        >
          <Avatar
            name={person.display_name}
            color={person.color}
            path={person.avatar_path}
            large
            transitionName={photo ? null : transitionName}
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
        <StatusLine user={person.user_id} editable={own} />
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
          <Link to="/chat" aria-label="Message" title="Message">
            <MessageCircle size={21} />
          </Link>
        )}
        {!own && phone && (
          <a href={phone} aria-label="Call" title="Call">
            <Phone size={21} />
          </a>
        )}
        <Link to="/map" aria-label="Map" title="Map">
          <MapPin size={21} />
        </Link>
      </div>
      {own && (
        <Link className="person-edit" to="/profile">
          Edit your profile
          <ArrowUpRight size={18} />
        </Link>
      )}
      {photo && (
        <ImageViewer
          title={name}
          label={`${name}’s photo`}
          alt={name}
          src={image.data}
          preview={preview}
          width={1}
          height={1}
          error={Boolean(image.error)}
          transitionName={transitionName}
          returnFocus={trigger}
          onRetry={() => {
            void image.refetch()
          }}
          onClose={closePhoto}
        />
      )}
    </div>
  )
}
