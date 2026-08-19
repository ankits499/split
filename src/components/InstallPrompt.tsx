import { useEffect, useState } from 'react'

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
    <div className="mx-4 mb-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <p className="text-sm font-medium text-[var(--color-text)]">📱 Add Split to your home screen</p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Get quick access like an app.</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={async () => {
            await deferredEvent.prompt()
            await deferredEvent.userChoice
            dismiss()
          }}
          className="flex-1 rounded-lg bg-[var(--color-accent)] py-2 text-sm font-medium text-white"
        >
          Add to Home Screen
        </button>
        <button onClick={dismiss} className="px-3 text-sm text-[var(--color-text-muted)]">
          Maybe later
        </button>
      </div>
    </div>
  )
}
