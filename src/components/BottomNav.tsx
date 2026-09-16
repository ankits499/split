import { useState } from 'react'
import { NavLink, matchPath, useLocation, useMatch, useNavigate } from 'react-router-dom'
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

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `relative z-10 flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.5rem] px-2 py-1.5 text-[10px] transition-colors duration-200 ${
    isActive
      ? 'font-semibold text-[var(--color-ledger)]'
      : 'font-medium text-[var(--color-ink-muted)] hover:bg-white/15 hover:text-[var(--color-ink)] dark:hover:bg-white/[0.05]'
  }`

function NavItem({ to, label, Icon, end }: { to: string; label: string; Icon: typeof House; end: boolean }) {
  return (
    <NavLink to={to} end={end} className={itemClass}>
      <Icon size={19} strokeWidth={2} />
      {label}
    </NavLink>
  )
}

/** Two nav items sharing one capsule that glides to whichever is active —
 *  the iOS "Liquid Glass" tab-bar signature, done with a CSS transform so it
 *  stays in sync with layout at any width with no measuring. */
function NavPair({ items }: { items: typeof SIDE_ITEMS_LEFT }) {
  const { pathname } = useLocation()
  const activeIndex = items.findIndex((item) => matchPath({ path: item.to, end: item.end }, pathname))

  return (
    <div className="relative flex flex-[2] gap-1">
      {activeIndex >= 0 && (
        <div
          aria-hidden
          className="bottom-nav-active-pill absolute inset-y-0 w-1/2 rounded-[1.5rem] transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      )}
      {items.map((item) => (
        <NavItem key={item.to} {...item} />
      ))}
    </div>
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

      {showQuickAdd && (
        <button
          className="fixed inset-0 z-10 cursor-default bg-black/40"
          aria-label="Close quick actions"
          onClick={() => setShowQuickAdd(false)}
        />
      )}

      {/* Floating glass pill (Study Guide Site's bottom nav). position:fixed,
          anchored to the true viewport; #root { overflow: hidden } plus each
          page's own scroll region means the document never scrolls, so there's
          no overscroll to drag it. Pages reserve space via the
          .flex-1.overflow-y-auto rule in index.css. */}
      <nav
        className="bottom-nav-glass fixed left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-[21rem] -translate-x-1/2 items-center gap-1 rounded-[2rem] p-1.5"
        style={{ bottom: 'max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))' }}
      >
        {showQuickAdd && (
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
        )}

        <NavPair items={SIDE_ITEMS_LEFT} />

        <div className="flex flex-1 justify-center">
          <button
            onClick={handleCenterButton}
            aria-label={currentGroup ? 'Add expense' : 'Quick add'}
            aria-expanded={currentGroup ? undefined : showQuickAdd}
            className="bottom-nav-fab -mt-7 flex h-15 w-15 items-center justify-center rounded-full bg-[var(--color-ledger)] text-white transition-transform duration-150 active:scale-90"
          >
            <Plus size={27} strokeWidth={2.5} />
          </button>
        </div>

        <NavPair items={SIDE_ITEMS_RIGHT} />
      </nav>
    </>
  )
}
