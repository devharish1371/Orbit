import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Heart, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { copy } from '@/copy/en'
import { requestCode, verifyCode, validEmail, validCode } from '@/lib/auth'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const { client } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  async function send() {
    if (!validEmail(email)) {
      setError(copy.login.invalidEmail)
      return
    }
    setBusy(true)
    setError('')
    try {
      await requestCode(client, email)
      setStep('code')
      setCode('')
      setCooldown(60)
    } catch {
      setError(copy.login.sendError)
    } finally {
      setBusy(false)
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (step === 'email') {
      await send()
      return
    }
    if (!validCode(code)) {
      setError(copy.login.invalidCode)
      return
    }
    setBusy(true)
    setError('')
    try {
      await verifyCode(client, email, code)
    } catch {
      setError(copy.login.verifyError)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="login-page">
      <div className="login-brand">
        <img
          src={`${import.meta.env.BASE_URL}orbit.svg`}
          alt=""
          width="28"
          height="28"
        />
        <span>{copy.appName}</span>
        <span className="brand-end">
          <Heart size={15} aria-hidden="true" />
        </span>
      </div>
      <div className="orbit-art" aria-hidden="true">
        <div className="orbit-track orbit-track-one" />
        <div className="orbit-track orbit-track-two" />
        <span className="planet planet-pink" />
        <span className="planet planet-purple" />
      </div>
      <section className="login-copy">
        <h1>{step === 'email' ? copy.login.title : copy.login.codeTitle}</h1>
        <p className="muted">
          {step === 'email' ? (
            copy.login.description
          ) : (
            <>
              {copy.login.codeDescription}
              <br />
              <strong>{email.trim()}</strong>
            </>
          )}
        </p>
      </section>
      <form
        className="login-card glass"
        onSubmit={(event) => {
          void submit(event)
        }}
        noValidate
      >
        <label htmlFor={step === 'email' ? 'email' : 'code'}>
          {step === 'email' ? copy.login.email : copy.login.code}
        </label>
        {step === 'email' ? (
          <div className="input-wrap">
            <Mail size={19} aria-hidden="true" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={copy.login.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : 'login-note'}
            />
          </div>
        ) : (
          <input
            id="code"
            className="code-input"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'login-error' : 'login-note'}
            autoFocus
          />
        )}
        {error && (
          <p id="login-error" className="field-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy
            ? step === 'email'
              ? copy.login.sending
              : copy.login.verifying
            : step === 'email'
              ? copy.login.send
              : copy.login.verify}
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
        <p id="login-note" className="form-note">
          <LockKeyhole size={13} aria-hidden="true" />
          {copy.login.note}
        </p>
        {step === 'email' && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              if (validEmail(email)) {
                setStep('code')
                setError('')
              } else setError(copy.login.invalidEmail)
            }}
          >
            {copy.login.alreadyCode}
          </button>
        )}
        {step === 'code' && (
          <div className="code-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setStep('email')
                setError('')
              }}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              {copy.login.changeEmail}
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy || cooldown > 0}
              onClick={() => {
                void send()
              }}
            >
              {cooldown
                ? `${copy.login.cooldown} ${cooldown}${copy.login.seconds}`
                : copy.login.resend}
            </button>
          </div>
        )}
      </form>
    </main>
  )
}
