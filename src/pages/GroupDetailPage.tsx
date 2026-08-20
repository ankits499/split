import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Trash2,
  UserPlus,
  UserMinus,
  LogOut,
  Plus,
  AlertCircle,
  Pencil,
  MoreVertical,
  Check,
  X,
} from 'lucide-react'
import { useLocalUser } from '../features/localUser'
import {
  useAddMember,
  useDeleteGroup,
  useGroup,
  useRemoveMember,
  useRenameGroup,
  type GroupMember,
} from '../features/groups/hooks'
import {
  useCycleExpenses,
  useDeleteExpense,
  useExpenses,
  useGroupCycleSummaries,
  type Expense,
} from '../features/expenses/hooks'
import { useAddSettlement, useSettlements } from '../features/settlements/hooks'
import { computeNetBalances, myExpenseDelta, simplifyDebts, type Transfer } from '../utils/balances'
import { firstName, formatCurrency, formatShortDate } from '../utils/money'
import { ExpenseSheet } from '../components/ExpenseSheet'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Avatar } from '../components/Avatar'

type Tab = 'expenses' | 'balances' | 'settlements' | 'history'

// Renders these lists in pages instead of all at once — balances still need
// the full fetched history for correctness, this only bounds DOM size as a
// group's history grows over months of use.
const PAGE_SIZE = 20

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { id: userId } = useLocalUser()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { openExpense?: boolean; tab?: Tab } | null

  const { data: group, isLoading: groupLoading } = useGroup(groupId)
  const { data: expenses, isLoading: expensesLoading } = useExpenses(groupId, group?.cycle_number)
  const { data: settlements } = useSettlements(groupId, group?.cycle_number)
  const { data: cycleSummaries } = useGroupCycleSummaries(groupId, group?.cycle_number)
  const deleteExpense = useDeleteExpense(groupId!)
  const addSettlement = useAddSettlement(groupId!)
  const addMember = useAddMember(groupId!)
  const removeMember = useRemoveMember(groupId!)
  const renameGroup = useRenameGroup(groupId!)
  const deleteGroup = useDeleteGroup()

  const [tab, setTab] = useState<Tab>(routeState?.tab ?? 'expenses')
  const [showAddExpense, setShowAddExpense] = useState(!!routeState?.openExpense)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)
  const [settleTarget, setSettleTarget] = useState<Transfer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const [removeTarget, setRemoveTarget] = useState<GroupMember | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [leaveError, setLeaveError] = useState<string | null>(null)
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)
  const [showGroupMenu, setShowGroupMenu] = useState(false)
  const [visibleExpenseCount, setVisibleExpenseCount] = useState(PAGE_SIZE)
  const [visibleSettlementCount, setVisibleSettlementCount] = useState(PAGE_SIZE)
  const [historyCycle, setHistoryCycle] = useState<number | null>(null)
  const { data: cycleExpenses, isLoading: cycleExpensesLoading } = useCycleExpenses(groupId, historyCycle ?? undefined)

  const nameFor = (id: string) => group?.members.find((m) => m.user_id === id)?.name ?? 'Someone'

  const net = useMemo(
    () => computeNetBalances(expenses ?? [], settlements ?? []),
    [expenses, settlements]
  )
  const transfers = useMemo(() => simplifyDebts(net), [net])
  const myBalance = net.get(userId) ?? 0

  useEffect(() => {
    if (group && !editingName) setNameDraft(group.name)
  }, [group, editingName])

  useEffect(() => {
    if (routeState?.tab) setTab(routeState.tab)
    if (routeState?.openExpense) setShowAddExpense(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const submitAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setMemberError(null)
    try {
      await addMember.mutateAsync(memberEmail.trim())
      setMemberEmail('')
      setShowAddMember(false)
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const saveName = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === group?.name) {
      setEditingName(false)
      return
    }
    await renameGroup.mutateAsync(trimmed)
    setEditingName(false)
  }

  const confirmRemoveMember = (member: GroupMember) => {
    const balance = net.get(member.user_id) ?? 0
    if (Math.abs(balance) > 0.01) {
      setRemoveError(`${member.name} has an unsettled balance. Settle up before removing them.`)
      return
    }
    setRemoveError(null)
    setRemoveTarget(member)
  }

  const isCreator = group?.created_by === userId

  const openLeaveConfirm = () => {
    if (Math.abs(myBalance) > 0.01) {
      setLeaveError('You have an unsettled balance in this group. Settle up before leaving.')
      return
    }
    setLeaveError(null)
    setConfirmLeave(true)
  }

  if (groupLoading || !group) {
    return <p className="flex-1 px-4 py-8 text-center text-sm text-[var(--color-ink-muted)]">Loading…</p>
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'balances', label: 'Balances' },
    { id: 'settlements', label: 'Settlements' },
    { id: 'history', label: 'History' },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-6">
      <div className="flex items-center gap-3 pb-4">
        <Link to="/groups" aria-label="Back to groups" className="text-[var(--color-ink-muted)]">
          <ArrowLeft size={20} strokeWidth={2.25} />
        </Link>
        <Avatar name={group.name} size="lg" />
        <div className="min-w-0 flex-1">
          {editingName ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                saveName()
              }}
            >
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-lg font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
              />
              <button
                type="submit"
                aria-label="Save group name"
                className="rounded-lg p-1.5 text-[var(--color-ledger)]"
                disabled={renameGroup.isPending}
              >
                <Check size={18} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => setEditingName(false)}
                className="rounded-lg p-1.5 text-[var(--color-ink-muted)]"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </form>
          ) : (
            <>
              <h1 className="truncate text-lg font-semibold text-[var(--color-ink)]">{group.name}</h1>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
              </p>
            </>
          )}
        </div>
        {!editingName && (
          <div className="relative">
            <button
              onClick={() => setShowGroupMenu((v) => !v)}
              aria-label="Group settings"
              aria-expanded={showGroupMenu}
              className="rounded-full p-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
            >
              <MoreVertical size={18} strokeWidth={2.25} />
            </button>
            {showGroupMenu && (
              <>
                <button
                  className="fixed inset-0 z-20 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setShowGroupMenu(false)}
                />
                <div className="animate-rise absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setNameDraft(group.name)
                      setEditingName(true)
                      setShowGroupMenu(false)
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-bg)]"
                  >
                    <Pencil size={14} strokeWidth={2.25} /> Rename group
                  </button>
                  <button
                    onClick={() => {
                      setShowGroupMenu(false)
                      openLeaveConfirm()
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[var(--color-receipt)] hover:bg-[var(--color-bg)]"
                  >
                    <LogOut size={14} strokeWidth={2.25} /> Leave group
                  </button>
                  {isCreator && (
                    <button
                      onClick={() => {
                        setShowGroupMenu(false)
                        setConfirmDeleteGroup(true)
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[var(--color-receipt)] hover:bg-[var(--color-bg)]"
                    >
                      <Trash2 size={14} strokeWidth={2.25} /> Delete group
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {leaveError && (
        <p className="mb-4 flex items-center gap-1.5 text-xs text-[var(--color-receipt)]">
          <AlertCircle size={13} strokeWidth={2.5} /> {leaveError}
        </p>
      )}

      <div className="mb-4 flex overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card)]">
        <div className="flex-1 bg-[var(--color-ledger-soft)] px-4 py-3">
          <p className="text-xs text-[var(--color-ink-muted)]">You are owed</p>
          <p className="font-mono-nums text-lg font-semibold text-[var(--color-ledger)]">
            {formatCurrency(Math.max(myBalance, 0))}
          </p>
        </div>
        <div className="flex-1 bg-[var(--color-receipt-soft)] px-4 py-3">
          <p className="text-xs text-[var(--color-ink-muted)]">You owe</p>
          <p className="font-mono-nums text-lg font-semibold text-[var(--color-receipt)]">
            {formatCurrency(Math.max(-myBalance, 0))}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {group.members.map((m) => (
          <span
            key={m.user_id}
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] py-1 pl-1 pr-2.5 text-xs text-[var(--color-ink)]"
          >
            <Avatar name={m.name} size="sm" />
            {m.name}
            {m.user_id !== userId && (
              <button
                onClick={() => confirmRemoveMember(m)}
                aria-label={`Remove ${m.name} from group`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-ink-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-receipt)]"
              >
                <UserMinus size={11} strokeWidth={2.5} />
              </button>
            )}
          </span>
        ))}
        <button
          onClick={() => setShowAddMember((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)]"
        >
          <UserPlus size={13} strokeWidth={2.25} /> Add
        </button>
      </div>

      {removeError && (
        <p className="mb-4 flex items-center gap-1.5 text-xs text-[var(--color-receipt)]">
          <AlertCircle size={13} strokeWidth={2.5} /> {removeError}
        </p>
      )}

      {showAddMember && (
        <form
          onSubmit={submitAddMember}
          className="animate-rise mb-4 space-y-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
        >
          <input
            type="email"
            required
            placeholder="Friend's email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ledger)]"
          />
          {memberError && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-receipt)]">
              <AlertCircle size={13} strokeWidth={2.5} /> {memberError}
            </p>
          )}
          <button
            type="submit"
            disabled={addMember.isPending}
            className="w-full rounded-lg bg-[var(--color-ledger)] py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {addMember.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      <div className="mb-4 flex gap-1 border-b border-[var(--color-line)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              setHistoryCycle(null)
            }}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'border-[var(--color-ledger)] text-[var(--color-ledger)]'
                : 'border-transparent text-[var(--color-ink-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {tab === 'expenses' &&
        (expensesLoading ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
        ) : !expenses || expenses.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No expenses yet.</p>
        ) : (
          <div className="space-y-2">
            {expenses.slice(0, visibleExpenseCount).map((e) => {
              const delta = myExpenseDelta(e, userId)
              return (
                <div
                  key={e.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setEditTarget(e)}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') setEditTarget(e)
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-left shadow-[var(--shadow-card)] active:opacity-80"
                >
                  <Avatar name={nameFor(e.paid_by)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">{e.description}</p>
                    <p className="font-mono-nums truncate text-xs text-[var(--color-ink-muted)]">
                      {firstName(nameFor(e.paid_by))} paid {formatCurrency(e.amount)} · {formatShortDate(e.expense_date)}
                    </p>
                  </div>
                  {Math.abs(delta) > 0.01 && (
                    <span
                      className={`font-mono-nums shrink-0 text-sm font-semibold ${
                        delta > 0 ? 'text-[var(--color-ledger)]' : 'text-[var(--color-receipt)]'
                      }`}
                    >
                      {delta > 0 ? '+' : '−'}
                      {formatCurrency(Math.abs(delta))}
                    </span>
                  )}
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setDeleteTarget(e)
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-receipt)]"
                    aria-label={`Delete ${e.description}`}
                  >
                    <Trash2 size={15} strokeWidth={2} />
                  </button>
                </div>
              )
            })}
            {expenses.length > visibleExpenseCount && (
              <button
                onClick={() => setVisibleExpenseCount((c) => c + PAGE_SIZE)}
                className="w-full rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-medium text-[var(--color-ink)]"
              >
                Show more
              </button>
            )}
          </div>
        ))}

      {tab === 'balances' &&
        (transfers.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Everyone's settled up.</p>
        ) : (
          <div className="space-y-2">
            {transfers.map((t, i) => {
              const involvesMe = t.from === userId || t.to === userId
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
                >
                  <span className="flex items-center gap-1.5 text-sm text-[var(--color-ink)]">
                    <Avatar name={nameFor(t.from)} size="sm" />
                    {firstName(nameFor(t.from))}
                    <ArrowRight size={13} strokeWidth={2.25} className="text-[var(--color-ink-muted)]" />
                    <Avatar name={nameFor(t.to)} size="sm" />
                    {firstName(nameFor(t.to))}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-nums font-semibold text-[var(--color-ink)]">
                      {formatCurrency(t.amount)}
                    </span>
                    {involvesMe && (
                      <button
                        onClick={() => setSettleTarget(t)}
                        className="rounded-full bg-[var(--color-ledger)] px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

      {tab === 'settlements' &&
        (!settlements || settlements.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No settlements recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {settlements.slice(0, visibleSettlementCount).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
              >
                <Avatar name={nameFor(s.from_user)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                    {firstName(nameFor(s.from_user))} paid {firstName(nameFor(s.to_user))}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {new Date(s.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-mono-nums shrink-0 text-sm font-semibold text-[var(--color-ink)]">
                  {formatCurrency(s.amount)}
                </span>
              </div>
            ))}
            {settlements.length > visibleSettlementCount && (
              <button
                onClick={() => setVisibleSettlementCount((c) => c + PAGE_SIZE)}
                className="w-full rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-medium text-[var(--color-ink)]"
              >
                Show more
              </button>
            )}
          </div>
        ))}

      {tab === 'history' &&
        (historyCycle !== null ? (
          <div className="space-y-2">
            <button
              onClick={() => setHistoryCycle(null)}
              className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--color-ink-muted)]"
            >
              <ArrowLeft size={13} strokeWidth={2.25} /> Back to History
            </button>
            {cycleExpensesLoading ? (
              <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
            ) : !cycleExpenses || cycleExpenses.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">No expenses in this cycle.</p>
            ) : (
              cycleExpenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]"
                >
                  <Avatar name={nameFor(e.paid_by)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">{e.description}</p>
                    <p className="font-mono-nums truncate text-xs text-[var(--color-ink-muted)]">
                      {firstName(nameFor(e.paid_by))} paid {formatCurrency(e.amount)} · {formatShortDate(e.expense_date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : !cycleSummaries || cycleSummaries.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">
            No settled cycles yet. Past expenses land here once a group is fully settled up.
          </p>
        ) : (
          <div className="space-y-2">
            {cycleSummaries.map((c) => (
              <button
                key={c.cycle}
                onClick={() => setHistoryCycle(c.cycle)}
                className="flex w-full items-center justify-between rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-left shadow-[var(--shadow-card)]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {formatShortDate(c.startDate)} – {formatShortDate(c.endDate)}
                  </p>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {c.expenseCount} {c.expenseCount === 1 ? 'expense' : 'expenses'}
                  </p>
                </div>
                <span className="font-mono-nums font-semibold text-[var(--color-ink)]">
                  {formatCurrency(c.total)}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-ledger)] text-white shadow-lg"
        aria-label="Add expense"
      >
        <Plus size={26} strokeWidth={2.25} />
      </button>

      {showAddExpense && (
        <ExpenseSheet
          groupId={groupId!}
          members={group.members}
          currentUserId={userId}
          onClose={() => setShowAddExpense(false)}
        />
      )}

      {editTarget && (
        <ExpenseSheet
          groupId={groupId!}
          members={group.members}
          currentUserId={userId}
          expense={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      <ConfirmDialog
        open={!!settleTarget}
        title="Record this settlement?"
        description={
          settleTarget
            ? `${nameFor(settleTarget.from)} pays ${nameFor(settleTarget.to)} ${formatCurrency(settleTarget.amount)}. This updates the balance for everyone in the group.`
            : ''
        }
        confirmLabel="Mark as settled"
        onConfirm={() => {
          if (settleTarget) {
            addSettlement.mutate({ fromUser: settleTarget.from, toUser: settleTarget.to, amount: settleTarget.amount })
          }
          setSettleTarget(null)
        }}
        onCancel={() => setSettleTarget(null)}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove this member?"
        description={
          removeTarget ? `${removeTarget.name} will lose access to "${group.name}" and its expense history.` : ''
        }
        confirmLabel="Remove member"
        tone="danger"
        onConfirm={() => {
          if (removeTarget) removeMember.mutate(removeTarget.user_id)
          setRemoveTarget(null)
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={confirmLeave}
        title="Leave this group?"
        description={`You'll lose access to "${group.name}" and its expense history unless someone adds you back.`}
        confirmLabel="Leave group"
        tone="danger"
        onConfirm={() => {
          setConfirmLeave(false)
          removeMember.mutate(userId, { onSuccess: () => navigate('/groups') })
        }}
        onCancel={() => setConfirmLeave(false)}
      />

      <ConfirmDialog
        open={confirmDeleteGroup}
        title="Delete this group?"
        description={`This permanently deletes "${group.name}" along with every expense and settlement in it, for all members. This can't be undone.`}
        confirmLabel="Delete group"
        tone="danger"
        onConfirm={() => {
          setConfirmDeleteGroup(false)
          deleteGroup.mutate(groupId!, { onSuccess: () => navigate('/groups') })
        }}
        onCancel={() => setConfirmDeleteGroup(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this expense?"
        description={
          deleteTarget
            ? `"${deleteTarget.description}" (${formatCurrency(deleteTarget.amount)}) will be removed and everyone's balance will be recalculated. This can't be undone.`
            : ''
        }
        confirmLabel="Delete expense"
        tone="danger"
        onConfirm={() => {
          if (deleteTarget) deleteExpense.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
