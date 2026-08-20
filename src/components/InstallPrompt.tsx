import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'install_prompt_dismissed'

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const isStandalone =
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

  if (dismissed || isStandalone || !deferredEvent) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-ledger-ink)] text-[var(--color-ledger)]">
        <Smartphone size={18} strokeWidth={2.25} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--color-ink)]">Add Split to your home screen</p>
        <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">Get quick access like an app.</p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={async () => {
              await deferredEvent.prompt()
              await deferredEvent.userChoice
              dismiss()
            }}
            className="rounded-lg bg-[var(--color-ledger)] px-3 py-1.5 text-sm font-medium text-white"
          >
            Add to Home Screen
          </button>
          <button onClick={dismiss} className="px-2 text-sm text-[var(--color-ink-muted)]">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
