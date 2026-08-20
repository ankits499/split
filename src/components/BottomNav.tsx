import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { House, Users, Clock, CircleUser, Plus, Receipt, UsersRound } from 'lucide-react'
import { useLocalUser } from '../features/localUser'
import { ExpenseSheet } from './ExpenseSheet'

const SIDE_ITEMS_LEFT = [
  { to: '/', label: 'Home', Icon: House, end: true },
  { to: '/groups', label: 'Groups', Icon: Users, end: false },
]
const SIDE_ITEMS_RIGHT = [
  { to: '/activity', label: 'Activity', Icon: Clock, end: false },
  { to: '/profile', label: 'Profile', Icon: CircleUser, end: false },
]

function NavItem({ to, label, Icon, end }: { to: string; label: string; Icon: typeof House; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
          isActive ? 'text-[var(--color-ledger)]' : 'text-[var(--color-ink-muted)]'
        }`
      }
    >
      <Icon size={22} strokeWidth={2} />
      {label}
    </NavLink>
  )
}

export function BottomNav() {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showExpenseSheet, setShowExpenseSheet] = useState(false)
  const { id: userId } = useLocalUser()
  const navigate = useNavigate()

  return (
    <>
      {showQuickAdd && (
        <>
          <button
            className="fixed inset-0 z-30 cursor-default bg-black/40"
            aria-label="Close quick actions"
            onClick={() => setShowQuickAdd(false)}
          />
          <div className="animate-rise fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-40 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-lg">
            <button
              onClick={() => {
                setShowQuickAdd(false)
                setShowExpenseSheet(true)
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-ledger-soft)] text-[var(--color-ledger)]">
                <Receipt size={17} strokeWidth={2.25} />
              </span>
              New expense
            </button>
            <button
              onClick={() => {
                setShowQuickAdd(false)
                navigate('/groups/new')
              }}
              className="flex w-full items-center gap-3 border-t border-[var(--color-line)] px-4 py-3.5 text-left text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-bg)]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-ledger-soft)] text-[var(--color-ledger)]">
                <UsersRound size={17} strokeWidth={2.25} />
              </span>
              New group
            </button>
          </div>
        </>
      )}

      {showExpenseSheet && <ExpenseSheet currentUserId={userId} onClose={() => setShowExpenseSheet(false)} />}

      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex items-center border-t border-[var(--color-line)] bg-[var(--color-surface)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {SIDE_ITEMS_LEFT.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="flex flex-1 justify-center">
          <button
            onClick={() => setShowQuickAdd((v) => !v)}
            aria-label="Quick add"
            aria-expanded={showQuickAdd}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-ledger)] text-white shadow-lg active:opacity-90"
          >
            <Plus size={26} strokeWidth={2.25} />
          </button>
        </div>

        {SIDE_ITEMS_RIGHT.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
    </>
  )
}
