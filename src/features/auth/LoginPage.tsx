import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    const { error } =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, name.trim())
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    if (mode === 'signup') {
      setNotice('Account created. If email confirmation is required, check your inbox — otherwise you are signed in.')
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-ledger)] text-white">
          <Receipt size={28} strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Split</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Simple expense sharing with friends
        </p>
      </div>

      <form onSubmit={submit} className="w-full max-w-xs space-y-3">
        {mode === 'signup' && (
          <input
            type="text"
            required
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-center text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
          />
        )}
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-center text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-center text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
        />
        {error && <p className="text-sm text-[var(--color-receipt)]">{error}</p>}
        {notice && <p className="text-sm text-[var(--color-ledger)]">{notice}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--color-ledger)] py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
            setError(null)
            setNotice(null)
          }}
          className="w-full py-2 text-sm text-[var(--color-ink-muted)]"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
