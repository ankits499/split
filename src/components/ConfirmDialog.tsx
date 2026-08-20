import { TriangleAlert } from 'lucide-react'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'default',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onCancel}
      role="presentation"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="animate-rise w-full max-w-[400px] rounded-t-3xl bg-[var(--color-surface)] p-6 sm:rounded-3xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
      >
        <div
          className={`mb-3 flex h-11 w-11 items-center justify-center rounded-full ${
            tone === 'danger'
              ? 'bg-[var(--color-receipt-ink)] text-[var(--color-receipt)]'
              : 'bg-[var(--color-ledger-ink)] text-[var(--color-ledger)]'
          }`}
        >
          <TriangleAlert size={20} strokeWidth={2.25} />
        </div>
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-[var(--color-ink)]">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">{description}</p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-medium text-[var(--color-ink)] active:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white active:opacity-80 ${
              tone === 'danger' ? 'bg-[var(--color-receipt)]' : 'bg-[var(--color-ledger)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
