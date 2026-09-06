import { useState } from 'react'
import { NavLink, useMatch, useNavigate } from 'react-router-dom'
import { House, Users, Clock, CircleUser, Plus, Receipt, UsersRound } from 'lucide-react'
import { useLocalUser } from '../features/localUser'
import { useGroup } from '../features/groups/hooks'
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
        `flex flex-1 flex-col items-center gap-1 pt-2 pb-1 text-[11px] font-medium ${
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

  const groupMatch = useMatch('/groups/:groupId')
  const inGroupId = groupMatch && groupMatch.params.groupId !== 'new' ? groupMatch.params.groupId : undefined
  const { data: currentGroup } = useGroup(inGroupId)

  const handleCenterButton = () => {
    if (currentGroup) setShowExpenseSheet(true)
    else setShowQuickAdd((v) => !v)
  }

  return (
    <>
      {showExpenseSheet && (
        <ExpenseSheet
          groupId={currentGroup?.id}
          members={currentGroup?.members}
          currentUserId={userId}
          onClose={() => setShowExpenseSheet(false)}
        />
      )}

      {/* A normal flex child at the end of #root's column (see index.css),
          not position:fixed — it sits wherever layout puts it, so it can't
          drift from the true screen edge the way a viewport-anchored fixed
          element can on iOS (Safari/PWA chrome resize quirks). Every page's
          own scroll area just needs its usual bottom breathing room now,
          not a calc() reserving space for an overlay. */}
      <nav
        className="relative shrink-0 flex items-center border-t border-[var(--color-line)] bg-[var(--color-surface)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {showQuickAdd && (
          <>
            <button
              className="fixed inset-0 z-30 cursor-default bg-black/40"
              aria-label="Close quick actions"
              onClick={() => setShowQuickAdd(false)}
            />
            <div className="animate-rise absolute bottom-full left-1/2 z-40 mb-2 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-lg">
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

        {SIDE_ITEMS_LEFT.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="flex flex-1 justify-center">
          <button
            onClick={handleCenterButton}
            aria-label={currentGroup ? 'Add expense' : 'Quick add'}
            aria-expanded={currentGroup ? undefined : showQuickAdd}
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
