import { useContext, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  Lightbulb,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  Shuffle,
  Trash2,
  X,
  CalendarDays,
  ArrowUpRight,
} from 'lucide-react'
import { BackLink } from '@/components/ui/JourneyLink'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ConfirmSheet } from '@/components/ui/ConfirmSheet'
import { useBackLayer } from '@/app/backLayers'
import { useSpace } from '@/hooks/useSpace'
import { useAuth } from '@/hooks/useAuth'
import { useNow } from '@/hooks/useNow'
import {
  drawIdea,
  zoneInput,
  planningError,
  type Idea,
  type Plan,
} from '@/lib/plans'
import {
  PlanningContext,
  type PlanningMemory,
  type PlanDraft,
} from './PlanningContext'
import { usePlans, useIdeas, usePlanReminders } from './usePlanning'
import { PlanEditor, IdeaEditor } from './PlanningEditors'
import { PlanCard } from './PlanCard'
import './plans.css'
export default function PlansPage() {
  const { data: space } = useSpace(),
    { client } = useAuth(),
    query = useQueryClient(),
    now = useNow()
  const [params, setParams] = useSearchParams()
  const view =
    params.get('view') === 'ideas'
      ? 'ideas'
      : params.get('view') === 'places'
        ? 'places'
        : 'plans'
  const [archived, setArchived] = useState(false)
  const plans = usePlans(),
    ideas = useIdeas(archived),
    reminders = usePlanReminders()
  const memory = useContext(PlanningContext)
  const [local, setLocal] = useState<PlanningMemory>({ plan: null, idea: null })
  const { drafts, setDrafts } = memory ?? { drafts: local, setDrafts: setLocal }
  const [editor, setEditor] = useState<'plan' | 'idea' | null>(null),
    [drawn, setDrawn] = useState<string | null>(null),
    [remove, setRemove] = useState<Idea | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const jar = useRef<HTMLButtonElement>(null)
  useBackLayer(Boolean(drawn), () => {
    setDrawn(null)
    jar.current?.focus()
  })
  if (!space) return null
  const pool = (ideas.data ?? []).filter(
    (i) => i.kind === (view === 'places' ? 'place' : 'idea'),
  )
  const picked = pool.find((i) => i.id === drawn)
  const upcoming = (plans.data ?? [])
    .filter((p) => !p.cancelled && Date.parse(p.starts_at) > now)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  const past = (plans.data ?? [])
    .filter((p) => p.cancelled || Date.parse(p.starts_at) <= now)
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at))
  const identity = {
    p_expected_user: space.self.user_id,
    p_expected_couple: space.couple.id,
  }
  function newPlan(idea?: Idea) {
    const draft: PlanDraft = {
      id: crypto.randomUUID(),
      version: null,
      title: idea?.title ?? '',
      notes: idea?.notes ?? '',
      venue: idea?.kind === 'place' ? idea.title : '',
      starts: '',
      zone: space!.couple.timezone,
    }
    setDrafts((d) => ({ ...d, plan: idea ? draft : (d.plan ?? draft) }))
    setEditor('plan')
  }
  function editPlan(plan: Plan) {
    setDrafts((d) => ({
      ...d,
      plan: {
        id: plan.id,
        version: plan.version,
        title: plan.title,
        notes: plan.notes,
        venue: plan.venue,
        starts: zoneInput(plan.starts_at, plan.timezone),
        zone: plan.timezone,
      },
    }))
    setEditor('plan')
  }
  function editIdea(idea?: Idea) {
    setDrafts((d) => ({
      ...d,
      idea: idea
        ? { ...idea, kind: idea.kind === 'place' ? 'place' : 'idea' }
        : (d.idea ?? {
            id: crypto.randomUUID(),
            version: null,
            title: '',
            notes: '',
            kind: view === 'places' ? 'place' : 'idea',
            private: false,
            archived: false,
          }),
    }))
    setEditor('idea')
  }
  async function archive(idea: Idea) {
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('save_date_idea', {
        p_id: idea.id,
        p_version: idea.version,
        p_title: idea.title,
        p_notes: idea.notes,
        p_kind: idea.kind,
        p_private: idea.private,
        p_archived: !idea.archived,
        ...identity,
      })
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['date-ideas'] })
    } catch (e) {
      setError(planningError(e))
    } finally {
      setBusy(false)
    }
  }
  async function deleteIdea() {
    if (!remove) return
    setBusy(true)
    setError('')
    try {
      const result = await client.rpc('delete_date_idea', {
        p_id: remove.id,
        p_version: remove.version,
        ...identity,
      })
      if (result.error) throw result.error
      setRemove(null)
      await query.invalidateQueries({ queryKey: ['date-ideas'] })
    } catch (e) {
      setError(planningError(e))
    } finally {
      setBusy(false)
    }
  }
  const card = (p: Plan) => (
    <PlanCard
      key={`${p.id}-${p.version}`}
      plan={p}
      onEdit={() => editPlan(p)}
      lead={
        reminders.data?.find((r) => r.plan_id === p.id)?.lead_minutes ?? null
      }
    />
  )
  return (
    <div className="page plans-page">
      <BackLink fallback="/us" />
      <SectionHeading title="Plans" kind="us" />
      <div className="planning-tabs" aria-label="Planning view">
        {(['plans', 'ideas', 'places'] as const).map((tab) => (
          <button
            key={tab}
            aria-pressed={view === tab}
            onClick={() => {
              setParams(tab === 'plans' ? {} : { view: tab })
              setDrawn(null)
              setError('')
            }}
          >
            {tab === 'plans'
              ? 'Plans'
              : tab === 'ideas'
                ? 'Date jar'
                : 'Want to go'}
          </button>
        ))}
      </div>
      <div className="planning-toolbar">
        <h2>
          {view === 'plans'
            ? 'Coming up'
            : view === 'ideas'
              ? 'Our ideas'
              : 'Somewhere, someday'}
        </h2>
        {view !== 'plans' && (
          <button
            className="icon-button"
            aria-label="Show archived"
            aria-pressed={archived}
            onClick={() => {
              setArchived(!archived)
              setDrawn(null)
            }}
          >
            <Archive size={18} />
          </button>
        )}
        <button
          className="icon-button planning-add"
          aria-label={
            view === 'plans'
              ? 'New plan'
              : view === 'ideas'
                ? 'Add an idea'
                : 'Add somewhere to go'
          }
          onClick={() => {
            if (view === 'plans') newPlan()
            else editIdea()
          }}
        >
          <Plus size={21} />
        </button>
      </div>
      {view === 'plans' ? (
        <>
          {drafts.plan && (
            <button className="text-button" onClick={() => setEditor('plan')}>
              Continue draft
            </button>
          )}
          {plans.isPending && <p role="status">Loading plans…</p>}
          {plans.error && (
            <button
              className="text-button"
              onClick={() => {
                void plans.refetch()
              }}
            >
              Retry plans
            </button>
          )}
          {!plans.isPending && !plans.error && upcoming.length === 0 && (
            <button className="plan-empty" onClick={() => newPlan()}>
              <CalendarDays size={38} strokeWidth={1} />
              <span>Make a plan</span>
              <ArrowUpRight size={18} />
            </button>
          )}
          <div className="plan-list">{upcoming.map(card)}</div>
          {past.length > 0 && (
            <details className="plans-history">
              <summary>
                Recent plans <span>{past.length}</span>
              </summary>
              {past.map(card)}
            </details>
          )}
        </>
      ) : (
        <>
          {drafts.idea && (
            <button className="text-button" onClick={() => setEditor('idea')}>
              Continue draft
            </button>
          )}
          {view === 'ideas' && !archived && (
            <section className="date-jar">
              <svg viewBox="0 0 180 130" aria-hidden="true">
                <path d="M51 32h78l-5 15 12 59q1 14-16 14H60q-17 0-16-14l12-59Z" />
                <path d="M51 29q39-8 78 0M48 38q42 10 84 0" />
                <rect
                  x="65"
                  y="60"
                  width="42"
                  height="24"
                  rx="4"
                  transform="rotate(-18 86 72)"
                />
                <rect
                  x="79"
                  y="82"
                  width="40"
                  height="23"
                  rx="4"
                  transform="rotate(14 99 93)"
                />
                <path d="M31 37v12m-6-6h12M150 66v10m-5-5h10" />
              </svg>
              <button
                ref={jar}
                disabled={!pool.length}
                onClick={() => {
                  setDrawn(drawIdea(pool)?.id ?? null)
                }}
              >
                <Shuffle size={18} aria-hidden="true" />
                Pick an idea
              </button>
            </section>
          )}
          {picked && (
            <section className="drawn-idea" aria-label="Picked idea">
              <button
                className="icon-button"
                aria-label="Close picked idea"
                onClick={() => {
                  setDrawn(null)
                  jar.current?.focus()
                }}
              >
                <X size={16} />
              </button>
              <Lightbulb size={23} aria-hidden="true" />
              <h2>{picked.title}</h2>
              {picked.notes && <p>{picked.notes}</p>}
              <button className="text-button" onClick={() => newPlan(picked)}>
                Make it a plan <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </section>
          )}
          {ideas.isPending && <p role="status">Loading ideas…</p>}
          {ideas.error && (
            <button
              className="text-button"
              onClick={() => {
                void ideas.refetch()
              }}
            >
              Retry ideas
            </button>
          )}
          {!ideas.isPending && !ideas.error && pool.length === 0 && (
            <p className="planning-empty">
              {archived
                ? 'Nothing archived.'
                : view === 'ideas'
                  ? 'Add something you’d love to do together.'
                  : 'Save somewhere you’d like to try.'}
            </p>
          )}
          <div className="idea-list">
            {pool.map((idea) => (
              <article className="idea-entry" key={idea.id}>
                <span className="idea-symbol" aria-hidden="true">
                  {idea.kind === 'place' ? (
                    <MapPin size={21} />
                  ) : (
                    <Lightbulb size={21} />
                  )}
                </span>
                <div>
                  <h3>
                    {idea.title}
                    {idea.private && (
                      <LockKeyhole size={12} aria-label="Only me" />
                    )}
                  </h3>
                  {idea.notes && <p>{idea.notes}</p>}
                  <div className="idea-actions">
                    {!archived && (
                      <button
                        className="text-button"
                        onClick={() => newPlan(idea)}
                      >
                        Plan it <ArrowUpRight size={14} aria-hidden="true" />
                      </button>
                    )}
                    {idea.kind === 'place' && (
                      <a
                        className="icon-button"
                        aria-label={`Find ${idea.title} in Google Maps`}
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(idea.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin size={17} />
                      </a>
                    )}
                    {idea.created_by === space.self.user_id && (
                      <>
                        <button
                          className="icon-button"
                          aria-label={`Edit ${idea.title}`}
                          onClick={() => editIdea(idea)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`${archived ? 'Restore' : 'Archive'} ${idea.title}`}
                          onClick={() => {
                            void archive(idea)
                          }}
                        >
                          <Archive size={17} />
                        </button>
                        {archived && (
                          <button
                            className="icon-button"
                            aria-label={`Delete ${idea.title}`}
                            onClick={() => {
                              setError('')
                              setRemove(idea)
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {error && !remove && <p role="alert">{error}</p>}
      {editor === 'plan' && drafts.plan && (
        <PlanEditor
          draft={drafts.plan}
          onChange={(plan) => setDrafts((d) => ({ ...d, plan }))}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setDrafts((d) => ({ ...d, plan: null }))
            setEditor(null)
            setParams({}, { replace: true })
          }}
        />
      )}
      {editor === 'idea' && drafts.idea && (
        <IdeaEditor
          draft={drafts.idea}
          onChange={(idea) => setDrafts((d) => ({ ...d, idea }))}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setDrafts((d) => ({ ...d, idea: null }))
            setEditor(null)
          }}
        />
      )}
      {remove && (
        <ConfirmSheet
          title="Delete this idea?"
          description="This removes it permanently. Plans made from it stay."
          confirmLabel="Delete idea"
          busy={busy}
          error={error}
          onCancel={() => setRemove(null)}
          onConfirm={() => {
            void deleteIdea()
          }}
        />
      )}
    </div>
  )
}
