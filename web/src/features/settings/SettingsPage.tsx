import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { copy } from '@/copy/en'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { validDate, validMeetUrl } from '@/config/couple.config'
import { Button } from '@/components/ui/Button'
import { StorageStatus } from '@/features/posts/StorageStatus'
import { ExportMemories } from '@/features/memories/ExportMemories'
import { PrivacySettings } from './PrivacySettings'

export default function SettingsPage() {
  const { data: space } = useSpace()
  const { client, signOut } = useAuth()
  const query = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [themeBusy, setThemeBusy] = useState(false)
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!space) return
    const form = new FormData(event.currentTarget)
    const anniversary = String(form.get('anniversary') ?? '')
    const meet = String(form.get('meet') ?? '').trim()
    if (anniversary && !validDate(anniversary)) {
      setMessage(copy.settings.invalidDate)
      return
    }
    if (meet && !validMeetUrl(meet)) {
      setMessage(copy.settings.invalidMeet)
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await client
        .from('couples')
        .update({ anniversary: anniversary || null, meet_url: meet || null })
        .eq('id', space.couple.id)
      if (error) throw error
      await query.invalidateQueries({ queryKey: ['space'] })
      setMessage(copy.common.saved)
    } catch {
      setMessage(copy.settings.failed)
    } finally {
      setBusy(false)
    }
  }
  async function changeTheme(value: Theme) {
    if (!space || themeBusy) return
    const previous = theme
    setThemeBusy(true)
    setTheme(value)
    try {
      const result = await client
        .from('members')
        .update({ theme_mode: value })
        .eq('user_id', space.self.user_id)
        .select('user_id')
        .single()
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['space'] })
    } catch {
      setTheme(previous)
      setMessage(copy.settings.failed)
    } finally {
      setThemeBusy(false)
    }
  }
  return (
    <div className="page settings-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={18} aria-hidden="true" />
        {copy.common.back}
      </Link>
      <header className="page-heading">
        <p className="eyebrow">{copy.common.settings}</p>
        <h1>{copy.settings.title}</h1>
        <p className="muted">{copy.settings.description}</p>
      </header>
      <Link className="profile-settings-link" to="/tracking">
        {copy.tracking.title}
        <span aria-hidden="true">↗</span>
      </Link>
      <Link className="profile-settings-link" to="/notifications">
        {copy.alerts.notificationTitle}
        <span aria-hidden="true">↗</span>
      </Link>
      <Link className="profile-settings-link" to="/activity">
        {copy.alerts.activity}
        <span aria-hidden="true">↗</span>
      </Link>
      <section className="glass settings-section">
        <h2>{copy.common.theme}</h2>
        <div className="theme-options">
          {(['system', 'dark', 'light'] as Theme[]).map((value) => (
            <button
              type="button"
              key={value}
              disabled={themeBusy}
              aria-pressed={theme === value}
              onClick={() => {
                void changeTheme(value)
              }}
            >
              {copy.common[value]}
            </button>
          ))}
        </div>
      </section>
      <Link className="profile-settings-link" to="/profile">
        {copy.profile.appearanceLink}
        <span aria-hidden="true">↗</span>
      </Link>
      <form
        className="glass settings-section"
        onSubmit={(event) => {
          void save(event)
        }}
        noValidate
      >
        <label htmlFor="anniversary">{copy.settings.anniversary}</label>
        <input
          id="anniversary"
          name="anniversary"
          type="date"
          defaultValue={space?.couple.anniversary ?? ''}
        />
        <label htmlFor="meet">{copy.settings.meet}</label>
        <input
          id="meet"
          name="meet"
          type="url"
          placeholder={copy.settings.meetPlaceholder}
          defaultValue={space?.couple.meet_url ?? ''}
        />
        <p className="muted small">{copy.settings.private}</p>
        <Button disabled={busy}>
          {busy ? copy.common.saving : copy.common.save}
        </Button>
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
      </form>
      <StorageStatus />
      <PrivacySettings />
      <ExportMemories />
      <section className="settings-section">
        <Button
          className="button-secondary"
          type="button"
          onClick={() => {
            void signOut().catch(() => setMessage(copy.alerts.failed))
          }}
        >
          <LogOut size={17} aria-hidden="true" />
          {copy.common.signOut}
        </Button>
        <p className="muted small">{copy.settings.signOutHint}</p>
      </section>
    </div>
  )
}
