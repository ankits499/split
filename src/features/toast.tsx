import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'

interface ToastState {
  id: number
  message: string
}

const ToastContext = createContext<((message: string) => void) | null>(null)

const TOAST_DURATION_MS = 2200

/** A single, app-wide confirmation toast — for closing the loop on an action
 *  (add/edit expense, settle up) that would otherwise just close a sheet and
 *  leave it ambiguous whether anything happened. Not for errors, which stay
 *  inline where the mistake was made. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const nextId = useRef(0)

  const showToast = useCallback((message: string) => {
    const id = ++nextId.current
    setToast({ id, message })
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, TOAST_DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="animate-rise pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}
        >
          <div className="flex items-center gap-2 rounded-full bg-[var(--color-ink)] px-4 py-2.5 text-sm font-medium text-[var(--color-surface)] shadow-lg">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-ledger)] text-white">
              <Check size={12} strokeWidth={3} />
            </span>
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within ToastProvider')
  return showToast
}
