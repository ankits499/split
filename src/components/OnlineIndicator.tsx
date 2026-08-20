import { useOnlineStatus } from '../features/online'

export function OnlineIndicator() {
  const online = useOnlineStatus()

  return (
    <span
      className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-ink-muted)] shadow-[var(--shadow-card)]"
      role="status"
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${online ? 'bg-[var(--color-ledger)]' : 'bg-[var(--color-receipt)]'}`}
        aria-hidden
      />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
