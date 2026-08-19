import { useState } from 'react'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signInWithOtp, verifyOtp } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signInWithOtp(email.trim())
    setBusy(false)
    if (error) setError(error)
    else setStep('code')
  }

  const confirmCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await verifyOtp(email.trim(), code.trim())
    setBusy(false)
    if (error) setError(error)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-10">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-2xl font-bold text-white">
          S
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Split</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Simple expense sharing with friends
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="w-full max-w-xs space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          {error && <p className="text-sm text-[var(--color-owe)]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--color-accent)] py-3 font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Sending code…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={confirmCode} className="w-full max-w-xs space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            Enter the code we sent to <span className="text-[var(--color-text)]">{email}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-center tracking-[0.3em] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]"
          />
          {error && <p className="text-sm text-[var(--color-owe)]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--color-accent)] py-3 font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Verifying…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="w-full py-2 text-sm text-[var(--color-text-muted)]"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  )
}
