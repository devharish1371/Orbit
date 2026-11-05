import { useNow } from '@/hooks/useNow'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Image, CalendarDays, RefreshCw, Plus, Shield } from 'lucide-react'
import { BackLink } from '@/components/ui/JourneyLink'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { DialogSheet } from '@/components/ui/DialogSheet'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { Button } from '@/components/ui/Button'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
import { usePrivateMedia } from '@/hooks/usePrivateMedia'
import { useKeptMemories } from '@/features/memories/useMemories'
import { usePlans } from '@/features/plans/usePlanning'
import {
  surface,
  nativeSurfaceSupported,
  type WidgetKind,
  type WidgetState,
} from '@/native/surface'
import { WidgetPreview } from './WidgetPreview'
import { useWidget } from './useWidget'
import type { Post } from '@/lib/posts'
import './widget.css'
type Choice = {
  kind: 'photo' | 'plan'
  id: string
  version: number
  label: string
}
function PhotoChoice({
  post,
  onChoose,
}: {
  post: Post
  onChoose: (choice: Choice) => void
}) {
  const image = usePrivateMedia(post.thumb_path ?? post.media_path)
  return (
    <button
      className="widget-photo-choice"
      onClick={() =>
        onChoose({
          kind: 'photo',
          id: post.id,
          version: post.archive_revision,
          label: 'this photo',
        })
      }
    >
      {image.data ? (
        <img src={image.data} alt="" />
      ) : (
        <Image size={25} aria-hidden="true" />
      )}
      <span>{post.body || new Date(post.created_at).toLocaleDateString()}</span>
    </button>
  )
}
function PhotoPicker({
  onChoose,
  onClose,
}: {
  onChoose: (choice: Choice) => void
  onClose: () => void
}) {
  const photos = useKeptMemories(true)
  return (
    <DialogSheet
      title="Choose a kept photo"
      onClose={onClose}
      className="widget-picker"
    >
      {photos.isPending && <p role="status">Loading photos…</p>}
      {photos.error ? (
        <button
          className="text-button"
          onClick={() => {
            void photos.refetch()
          }}
        >
          Couldn’t load photos. Retry
        </button>
      ) : (
        <div className="widget-photo-grid">
          {photos.data?.pages.flat().map((post) => (
            <PhotoChoice key={post.id} post={post} onChoose={onChoose} />
          ))}
        </div>
      )}
      {!photos.isPending &&
        !photos.error &&
        !photos.data?.pages.flat().length && (
          <p className="muted">Keep a photo in Moments or Chat first.</p>
        )}
      {photos.hasNextPage && (
        <Button
          className="button-secondary"
          disabled={photos.isFetchingNextPage}
          onClick={() => {
            void photos.fetchNextPage()
          }}
        >
          Earlier photos
        </Button>
      )}
    </DialogSheet>
  )
}
function PlanPicker({
  onChoose,
  onClose,
}: {
  onChoose: (choice: Choice) => void
  onClose: () => void
}) {
  const now = useNow()
  const plans = usePlans(),
    future =
      plans.data
        ?.filter((item) => !item.cancelled && Date.parse(item.starts_at) > now)
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)) ?? []
  return (
    <DialogSheet
      title="Choose a plan"
      onClose={onClose}
      className="widget-picker"
    >
      {plans.isPending && <p role="status">Loading plans…</p>}
      {plans.error ? (
        <button
          className="text-button"
          onClick={() => {
            void plans.refetch()
          }}
        >
          Couldn’t load plans. Retry
        </button>
      ) : (
        <div className="widget-plan-choices">
          {future.map((plan) => (
            <button
              key={plan.id}
              onClick={() =>
                onChoose({
                  kind: 'plan',
                  id: plan.id,
                  version: plan.version,
                  label: plan.title,
                })
              }
            >
              <CalendarDays size={22} aria-hidden="true" />
              <span>
                <strong>{plan.title}</strong>
                <time dateTime={plan.starts_at}>
                  {new Intl.DateTimeFormat('en-IN', {
                    timeZone: plan.timezone,
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(plan.starts_at))}
                </time>
              </span>
            </button>
          ))}
        </div>
      )}
      {!plans.isPending && !plans.error && !future.length && (
        <p className="muted">No upcoming plans.</p>
      )}
    </DialogSheet>
  )
}
function SelectedPreview({ state }: { state: WidgetState }) {
  const { client } = useAuth(),
    { data: space } = useSpace()
  const preview = useQuery({
    queryKey: [
      'widget-preview',
      space?.self.user_id,
      state.kind,
      state.id,
      space?.couple.social_revision,
    ],
    enabled:
      !!space && !!state.id && !state.covered && state.kind !== 'private',
    queryFn: async () => {
      if (state.kind === 'photo') {
        const result = await client
          .from('posts')
          .select('*')
          .eq('id', state.id!)
          .eq('keep', true)
          .is('unsent_at', null)
          .eq('kind', 'photo')
          .maybeSingle()
        if (result.error) throw result.error
        return {
          path: result.data?.thumb_path ?? result.data?.media_path ?? null,
          title: undefined,
          date: undefined,
        }
      }
      const result = await client
        .from('plans')
        .select('*')
        .eq('id', state.id!)
        .eq('cancelled', false)
        .maybeSingle()
      if (result.error) throw result.error
      return {
        path: null,
        title: result.data?.title,
        date: result.data
          ? new Intl.DateTimeFormat('en-IN', {
              timeZone: result.data.timezone,
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(result.data.starts_at))
          : undefined,
      }
    },
  })
  const photo = usePrivateMedia(preview.data?.path ?? null)
  return (
    <WidgetPreview
      kind={state.kind}
      covered={state.covered}
      src={photo.data}
      title={preview.data?.title}
      date={preview.data?.date}
    />
  )
}
function WidgetEditor() {
  const { data: space } = useSpace(),
    { session } = useAuth(),
    query = useQueryClient(),
    widget = useWidget()
  const [picker, setPicker] = useState<'photo' | 'plan' | null>(null),
    [choice, setChoice] = useState<Choice | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const inFlight = useRef(false),
    identity =
      space && session
        ? { owner: session.user.id, couple: space.couple.id }
        : null
  const refetchWidget = widget.refetch
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) void refetchWidget()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [refetchWidget])
  async function save(kind: WidgetKind, selected?: Choice) {
    if (!identity || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await surface.widgetSelect({
        ...identity,
        kind,
        ...(selected ? { id: selected.id, version: selected.version } : {}),
      })
      query.setQueryData(['widget', identity.owner, identity.couple], result)
      setChoice(null)
    } catch (e) {
      setError(
        e &&
          typeof e === 'object' &&
          'message' in e &&
          String(e.message).includes('WIDGET_CHANGED')
          ? 'This changed. Close and choose it again.'
          : 'Couldn’t update the widget. Try again.',
      )
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  async function pin() {
    if (busy) return
    setBusy(true)
    setNotice('')
    try {
      const result = await surface.widgetPin()
      setNotice(
        result.requested
          ? 'Confirm with your launcher.'
          : 'Add Orbit from your launcher’s widget picker.',
      )
    } catch {
      setNotice('Add Orbit from your launcher’s widget picker.')
    } finally {
      setBusy(false)
    }
  }
  function choose(value: Choice) {
    setPicker(null)
    setChoice(value)
    setError('')
  }
  return (
    <>
      <div className="widget-stage">
        {widget.data ? (
          <SelectedPreview state={widget.data} />
        ) : (
          <WidgetPreview kind="private" covered={false} />
        )}
      </div>
      {widget.isPending && <p role="status">Loading widget settings…</p>}
      {widget.error && (
        <button
          className="text-button"
          onClick={() => {
            void widget.refetch()
          }}
        >
          Couldn’t load widget settings. Retry
        </button>
      )}
      {widget.data && (
        <>
          <div
            className="widget-mode-choices"
            role="group"
            aria-label="Widget content"
          >
            <button
              disabled={busy}
              aria-pressed={widget.data.kind === 'private'}
              onClick={() => {
                void save('private')
              }}
            >
              <Shield size={22} aria-hidden="true" />
              <span>Private</span>
            </button>
            <button
              disabled={busy}
              aria-pressed={widget.data.kind === 'photo'}
              onClick={() => setPicker('photo')}
            >
              <Image size={22} aria-hidden="true" />
              <span>Photo</span>
            </button>
            <button
              disabled={busy}
              aria-pressed={widget.data.kind === 'plan'}
              onClick={() => setPicker('plan')}
            >
              <CalendarDays size={22} aria-hidden="true" />
              <span>Plan</span>
            </button>
          </div>
          {widget.data.covered && (
            <p className="widget-note">
              <Shield size={16} aria-hidden="true" />
              {widget.data.reason === 'refresh'
                ? 'Refresh online, or choose another item.'
                : 'Orbit lock or screenshot protection keeps your widget covered.'}
            </p>
          )}
          <div className="widget-page-actions">
            <Button
              disabled={busy}
              onClick={() => {
                void pin()
              }}
            >
              <Plus size={18} aria-hidden="true" />
              Add widget
            </Button>
            <button
              className="icon-button"
              disabled={busy}
              aria-label="Refresh widget"
              onClick={() => {
                if (!identity) return
                setBusy(true)
                void surface
                  .widgetRefresh(identity)
                  .then((value) =>
                    query.setQueryData(
                      ['widget', identity.owner, identity.couple],
                      value,
                    ),
                  )
                  .catch(() =>
                    setNotice('Open Orbit online to refresh your widget.'),
                  )
                  .finally(() => setBusy(false))
              }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <p className="muted small">
            {widget.data.installed
              ? `${widget.data.installed} on this device`
              : 'Your launcher will ask before adding it.'}
          </p>
        </>
      )}
      {notice && (
        <p role="status" className="form-message">
          {notice}
        </p>
      )}
      {error && !choice && <p role="alert">{error}</p>}
      <details className="widget-details">
        <summary>Widget privacy</summary>
        <p>
          Private shows no personal content. Photos and plans can appear outside
          Orbit when app lock and screenshot protection are off. Your launcher
          can retain previews.
        </p>
        <p>
          Small widgets and large system text use the private icon. Updates
          depend on connectivity and Android scheduling. Only kept photos can be
          chosen. Known removals, logout and account changes clear the preview.
        </p>
      </details>
      {picker === 'photo' && (
        <PhotoPicker onChoose={choose} onClose={() => setPicker(null)} />
      )}
      {picker === 'plan' && (
        <PlanPicker onChoose={choose} onClose={() => setPicker(null)} />
      )}
      {choice && (
        <ConfirmSheet
          title="Show on your home screen?"
          description="Your launcher can keep a preview outside Orbit. App lock and screenshot protection keep it covered."
          confirmLabel={choice.kind === 'photo' ? 'Use photo' : 'Use plan'}
          onConfirm={() => {
            void save(choice.kind, choice)
          }}
          onCancel={() => {
            setChoice(null)
            setError('')
          }}
          busy={busy}
          error={error}
        />
      )}
    </>
  )
}
export default function WidgetPage() {
  const { session } = useAuth()
  return (
    <div className="page widget-page">
      <BackLink fallback="/settings" />
      <SectionHeading title="Your widget" kind="us" />
      {nativeSurfaceSupported ? (
        <WidgetEditor key={session?.user.id} />
      ) : (
        <>
          <div className="widget-stage">
            <WidgetPreview kind="private" covered={false} />
          </div>
          <p className="muted">
            Home-screen widgets are available in the Android app.
          </p>
        </>
      )}
    </div>
  )
}
