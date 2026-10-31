import { BackLink } from '@/components/ui/JourneyLink'
import { ThemePicker } from '@/components/ui/ThemePicker'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import imageCompression from 'browser-image-compression'
import { Camera, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSpace } from '@/hooks/useSpace'
import { normalizeTheme, setAppearance } from '@/hooks/useTheme'
import { copy } from '@/copy/en'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { accents } from '@/lib/appearance'
import { profileError, validAvatar, type ProfileDraft } from '@/lib/profile'
import type { Database } from '@/lib/database.types'
type Member = Database['public']['Tables']['members']['Row']

function ColorChoices({
  value,
  onChange,
  customLabel,
}: {
  value: string
  onChange: (value: string) => void
  customLabel: string
}) {
  return (
    <div className="color-choices">
      {accents.map(({ key, color }) => (
        <button
          key={key}
          type="button"
          className="color-choice"
          aria-label={copy.profile[key]}
          aria-pressed={value.toLowerCase() === color.toLowerCase()}
          style={{ background: color }}
          onClick={() => onChange(color)}
        >
          {value.toLowerCase() === color.toLowerCase() && (
            <Check size={20} color="#17122A" aria-hidden="true" />
          )}
        </button>
      ))}
      <input
        type="color"
        aria-label={customLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
function ProfileEditor({ member }: { member: Member }) {
  const { client, session } = useAuth()
  const query = useQueryClient()
  const [draft, setDraft] = useState<ProfileDraft>({
    name: member.display_name,
    nickname: member.nickname ?? '',
    partnerNickname: member.partner_nickname ?? '',
    phone: member.phone ?? '',
    color: member.color,
    theme: normalizeTheme(member.theme_mode),
    accent: member.theme_accent,
  })
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [photoMessage, setPhotoMessage] = useState('')
  const update = (key: keyof ProfileDraft, value: string) =>
    setDraft((previous) => ({ ...previous, [key]: value }))
  async function save(event: FormEvent) {
    event.preventDefault()
    const errorKey = profileError(draft)
    if (errorKey) {
      setMessage(copy.profile[errorKey])
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const result = await client
        .from('members')
        .update({
          display_name: draft.name.trim(),
          nickname: draft.nickname.trim() || null,
          partner_nickname: draft.partnerNickname.trim() || null,
          phone: draft.phone.trim(),
          color: draft.color,
          theme_mode: draft.theme,
          theme_accent: draft.accent,
        })
        .eq('user_id', member.user_id)
        .select('user_id')
        .single()
      if (result.error) throw result.error
      setAppearance(normalizeTheme(draft.theme), draft.accent)
      await query.invalidateQueries({ queryKey: ['space'] })
      setMessage(copy.profile.saved)
    } catch {
      setMessage(copy.profile.failed)
    } finally {
      setBusy(false)
    }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!validAvatar(file)) {
      setPhotoMessage(copy.profile.photoInvalid)
      return
    }
    setPhotoBusy(true)
    setPhotoMessage('')
    let newPath: string | null = null
    let referenced = false
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.25,
        maxWidthOrHeight: 600,
        fileType: 'image/webp',
        useWebWorker: false,
        preserveExif: false,
      })
      newPath = `${member.couple_id}/${member.user_id}/avatar_${crypto.randomUUID()}.webp`
      const uploaded = await client.storage
        .from('media')
        .upload(newPath, compressed, {
          contentType: 'image/webp',
          upsert: false,
          cacheControl: '3600',
        })
      if (uploaded.error) throw uploaded.error
      const updated = await client
        .from('members')
        .update({ avatar_path: newPath })
        .eq('user_id', member.user_id)
        .select('avatar_path')
        .single()
      if (updated.error) throw updated.error
      referenced = true
      await query.invalidateQueries({ queryKey: ['space'] })
      if (member.avatar_path)
        await client.storage.from('media').remove([member.avatar_path])
      setPhotoMessage(copy.profile.photoSaved)
    } catch {
      if (newPath && !referenced)
        await client.storage.from('media').remove([newPath])
      setPhotoMessage(copy.profile.photoFailed)
    } finally {
      setPhotoBusy(false)
    }
  }
  async function removePhoto() {
    if (!member.avatar_path) return
    setPhotoBusy(true)
    setPhotoMessage('')
    try {
      const result = await client
        .from('members')
        .update({ avatar_path: null })
        .eq('user_id', member.user_id)
        .select('user_id')
        .single()
      if (result.error) throw result.error
      await query.invalidateQueries({ queryKey: ['space'] })
      await client.storage.from('media').remove([member.avatar_path])
      setPhotoMessage(copy.profile.photoRemoved)
    } catch {
      setPhotoMessage(copy.profile.photoFailed)
    } finally {
      setPhotoBusy(false)
    }
  }
  return (
    <div className="page profile-page">
      <BackLink fallback="/us" />
      <SectionHeading title={copy.profile.heading} kind="us" />
      <section
        className="glass profile-photo-section"
        aria-labelledby="photo-heading"
      >
        <Avatar
          name={draft.name || member.display_name}
          color={draft.color}
          large
          path={member.avatar_path}
        />
        <div>
          <h2 id="photo-heading">
            {draft.nickname || draft.name || copy.profile.photo}
          </h2>
          <p className="muted small">{copy.profile.photoNote}</p>
        </div>
        <label
          className={`button button-secondary photo-upload ${photoBusy ? 'is-disabled' : ''}`}
        >
          <Camera size={17} aria-hidden="true" />
          {photoBusy ? copy.profile.photoBusy : copy.profile.upload}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={photoBusy}
            onChange={(event) => {
              void upload(event)
            }}
            aria-label={copy.profile.upload}
          />
        </label>
        {member.avatar_path && (
          <button
            className="text-button"
            disabled={photoBusy}
            onClick={() => {
              void removePhoto()
            }}
          >
            {copy.profile.remove}
          </button>
        )}
        {photoMessage && (
          <p className="form-message" role="status">
            {photoMessage}
          </p>
        )}
      </section>
      <form
        onSubmit={(event) => {
          void save(event)
        }}
        noValidate
      >
        <section className="glass settings-section">
          <p className="eyebrow">{copy.profile.identity}</p>
          <label htmlFor="display-name">{copy.profile.name}</label>
          <input
            id="display-name"
            autoComplete="name"
            value={draft.name}
            maxLength={60}
            onChange={(event) => update('name', event.target.value)}
            required
          />
          <label htmlFor="nickname">{copy.profile.nickname}</label>
          <input
            id="nickname"
            autoComplete="nickname"
            value={draft.nickname}
            maxLength={40}
            onChange={(event) => update('nickname', event.target.value)}
          />
          <label htmlFor="partner-nickname">
            {copy.profile.partnerNickname}
          </label>
          <input
            id="partner-nickname"
            value={draft.partnerNickname}
            maxLength={40}
            aria-describedby="partner-nickname-help"
            onChange={(event) => update('partnerNickname', event.target.value)}
          />
          <p id="partner-nickname-help" className="muted small">
            {copy.profile.partnerNicknameNote}
          </p>
          <label htmlFor="profile-phone">{copy.profile.phone}</label>
          <input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            value={draft.phone}
            maxLength={16}
            onChange={(event) => update('phone', event.target.value)}
            required
          />
          <label htmlFor="profile-email">{copy.profile.email}</label>
          <input
            id="profile-email"
            type="email"
            value={session?.user.email ?? ''}
            readOnly
            aria-describedby="profile-email-help"
          />
          <p id="profile-email-help" className="muted small">
            {copy.profile.emailNote}
          </p>
        </section>
        <section className="glass settings-section">
          <h2>{copy.profile.color}</h2>
          <p className="muted small">{copy.profile.colorNote}</p>
          <ColorChoices
            value={draft.color}
            onChange={(value) => update('color', value)}
            customLabel={copy.profile.customColor}
          />
        </section>
        <section className="glass settings-section">
          <h2>{copy.profile.appearance}</h2>
          <p className="muted small">{copy.profile.appearanceNote}</p>
          <ThemePicker
            value={normalizeTheme(draft.theme)}
            accent={draft.accent}
            onChange={(value) => update('theme', value)}
          />
          <h3 className="profile-subheading">{copy.profile.accent}</h3>
          <ColorChoices
            value={draft.accent}
            onChange={(value) => update('accent', value)}
            customLabel={copy.profile.customAccent}
          />
        </section>
        <div className="profile-save">
          <Button type="submit" disabled={busy || photoBusy}>
            {busy ? copy.common.saving : copy.profile.save}
          </Button>
          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
export default function ProfilePage() {
  const { data } = useSpace()
  return data ? <ProfileEditor member={data.self} /> : null
}
