import { splitCopyId } from '@/lib/photos'
import { useContext, useEffect, useRef, useState } from 'react'
import { AuthContext } from '@/app/AuthContext'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Smartphone,
  Image,
  Mic,
  AlignLeft,
  RefreshCw,
} from 'lucide-react'
import { AudioPlayer } from '@/components/ui/AudioPlayer'
import { ImageViewer } from '@/components/ui/ImageViewer'
import {
  phone,
  phoneCopiesSupported,
  phoneItems,
  phoneOperation,
  readPhoneMedia,
} from './native'
import type { PhoneCopy, PhoneIdentity } from './model'
import './phone-keepsakes.css'
export default function OfflineKeepsakesPage() {
  // Native identity remains sufficient for cold offline access; a known live account must agree.
  const account = useContext(AuthContext)?.session?.user.id
  const returnFocus = useRef<HTMLElement | null>(null)
  const [identity, setIdentity] = useState<PhoneIdentity>(),
    [items, setItems] = useState<PhoneCopy[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<PhoneCopy | null>(null),
    [url, setUrl] = useState<string>(),
    [mediaError, setMediaError] = useState(false)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        if (!phoneCopiesSupported) throw new Error('ANDROID_REQUIRED')
        const result = await phoneOperation(async () => {
          const id = await phone.identity(),
            rows = await phoneItems(id)
          return { id, rows }
        })
        if (account && result.id.owner !== account)
          throw new Error('ACCOUNT_CHANGED')
        if (active) {
          setIdentity(result.id)
          setItems(
            result.rows.sort(
              (a, b) =>
                b.created_at.localeCompare(a.created_at) ||
                splitCopyId(a.id).post.localeCompare(splitCopyId(b.id).post) ||
                (a.photo_position ?? 0) - (b.photo_position ?? 0),
            ),
          )
          setError('')
        }
      } catch {
        if (active) {
          setItems([])
          setIdentity(undefined)
          setSelected(null)
          setUrl(undefined)
          setError(
            phoneCopiesSupported
              ? 'Set up phone copies in Keepsakes while you’re connected.'
              : 'Open the Android app to use phone copies.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    const clear = () => {
      active = false
      setItems([])
      setSelected(null)
      setIdentity(undefined)
    }
    window.addEventListener('orbit-signing-out', clear)
    return () => {
      active = false
      window.removeEventListener('orbit-signing-out', clear)
    }
  }, [reload, account])
  useEffect(() => {
    if (
      !identity ||
      !selected ||
      !selected.bytes ||
      (account && identity.owner !== account)
    )
      return
    let active = true,
      objectUrl: string | undefined
    void readPhoneMedia(identity, selected.id, () => active && !document.hidden)
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob)
          setUrl(objectUrl)
        }
      })
      .catch(() => {
        if (active) setMediaError(true)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [identity, selected, reload, account])
  const close = () => {
    setSelected(null)
    setUrl(undefined)
    setMediaError(false)
  }
  const sameAccount = !account || identity?.owner === account
  const visibleItems = sameAccount ? items : []
  const visibleSelection = sameAccount ? selected : null
  const setPhotos = visibleSelection?.photo_set
    ? visibleItems.filter(
        (copy) =>
          copy.photo_set &&
          splitCopyId(copy.id).post === splitCopyId(visibleSelection.id).post,
      )
    : []
  const photoIndex = setPhotos.findIndex(
    (copy) => copy.id === visibleSelection?.id,
  )
  const selectPhoto = (index: number) => {
    setUrl(undefined)
    setMediaError(false)
    setSelected(setPhotos[index] ?? null)
  }
  return (
    <main className="page phone-library">
      <Link
        className="back-link"
        to="/keepsakes"
        aria-label="Back to keepsakes"
      >
        <ArrowLeft size={20} />
      </Link>
      <header className="phone-library-heading">
        <Smartphone size={28} aria-hidden="true" />
        <h1>On this phone</h1>
        <button
          className="icon-button"
          aria-label="Check saved files"
          disabled={loading}
          onClick={(event) => {
            returnFocus.current = event.currentTarget
            setLoading(true)
            close()
            setReload((v) => v + 1)
          }}
        >
          <RefreshCw size={19} aria-hidden="true" />
        </button>
      </header>
      <p className="muted">
        {visibleItems.length} saved · Opens without internet
      </p>
      {loading && <p role="status">Checking saved files…</p>}
      {error && <p role="status">{error}</p>}
      {!loading && !error && !items.length && (
        <p>No phone copies yet. Open Keepsakes while connected to sync.</p>
      )}
      <div className="phone-library-list">
        {visibleItems.map((copy) => (
          <article key={copy.id} className="phone-library-item">
            <div className="phone-library-kind" aria-hidden="true">
              {copy.kind === 'photo' ? (
                <Image />
              ) : copy.kind === 'voice' ? (
                <Mic />
              ) : (
                <AlignLeft />
              )}
            </div>
            <div>
              <time dateTime={copy.created_at}>
                {new Intl.DateTimeFormat('en-IN', {
                  dateStyle: 'medium',
                }).format(new Date(copy.created_at))}
              </time>
              {copy.body && <p>{copy.body}</p>}
              {copy.photo_caption && <p>{copy.photo_caption}</p>}
              {copy.photo_set && (
                <span className="muted">
                  Photo {(copy.photo_position ?? 0) + 1}
                </span>
              )}
              {copy.bytes > 0 && (
                <button
                  className="text-button"
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget
                    close()
                    setSelected(copy)
                  }}
                >
                  {copy.kind === 'voice' ? 'Play voice note' : 'Open photo'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="phone-library-note">
        These copies were checked on this phone. Changes made while offline
        appear after your next sync. Phone copies aren’t a backup; signing out
        or uninstalling removes them.
      </p>
      {visibleSelection?.kind === 'photo' && (
        <ImageViewer
          transitionName="orbit-phone-photo"
          returnFocus={returnFocus}
          title="Saved photo"
          alt={visibleSelection.body ?? 'Saved photo'}
          src={url}
          error={mediaError}
          caption={visibleSelection.photo_caption || visibleSelection.body}
          navigation={
            setPhotos.length > 1
              ? {
                  index: photoIndex,
                  count: setPhotos.length,
                  onPrevious: () => selectPhoto(photoIndex - 1),
                  onNext: () => selectPhoto(photoIndex + 1),
                }
              : undefined
          }
          onRetry={() => {
            setMediaError(false)
            setReload((v) => v + 1)
          }}
          onClose={close}
        />
      )}
      {visibleSelection?.kind === 'voice' && (
        <section className="phone-library-voice" aria-label="Saved voice note">
          <button className="text-button" onClick={close}>
            Close
          </button>
          {url ? (
            <AudioPlayer
              src={url}
              label="Saved voice note"
              onError={() => setMediaError(true)}
            />
          ) : (
            <p role="status">
              {mediaError
                ? 'Couldn’t open this copy. Check saved files or sync again.'
                : 'Opening voice note…'}
            </p>
          )}
        </section>
      )}
    </main>
  )
}
