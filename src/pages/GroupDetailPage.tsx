import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useAddMember, useGroup } from '../features/groups/hooks'
import { useDeleteExpense, useExpenses } from '../features/expenses/hooks'
import { useAddSettlement, useSettlements } from '../features/settlements/hooks'
import { computeNetBalances, simplifyDebts } from '../utils/balances'
import { formatCurrency } from '../utils/money'
import { ExpenseSheet } from '../components/ExpenseSheet'

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { session } = useAuth()
  const userId = session!.user.id

  const { data: group, isLoading: groupLoading } = useGroup(groupId)
  const { data: expenses, isLoading: expensesLoading } = useExpenses(groupId)
  const { data: settlements } = useSettlements(groupId)
  const deleteExpense = useDeleteExpense(groupId!)
  const addSettlement = useAddSettlement(groupId!)
  const addMember = useAddMember(groupId!)

  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState<string | null>(null)

  const nameFor = (id: string) => group?.members.find((m) => m.user_id === id)?.name ?? 'Someone'

  const net = useMemo(
    () => computeNetBalances(expenses ?? [], settlements ?? []),
    [expenses, settlements]
  )
  const transfers = useMemo(() => simplifyDebts(net), [net])

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

  if (groupLoading || !group) {
    return <p className="flex-1 px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
  }

  return (
    <div className="flex-1 px-4 pb-24">
      <div className="flex items-center gap-2 pt-6 pb-2">
        <Link to="/groups" className="text-[var(--color-text-muted)]">
          ←
        </Link>
        <h1 className="flex-1 text-lg font-semibold text-[var(--color-text)]">{group.name}</h1>
        <button
          onClick={() => setShowAddMember((v) => !v)}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text)]"
        >
          + Member
        </button>
      </div>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        {group.members.map((m) => m.name).join(', ')}
      </p>

      {showAddMember && (
        <form onSubmit={submitAddMember} className="mb-4 space-y-2 rounded-xl border border-[var(--color-border)] p-3">
          <input
            type="email"
            required
            placeholder="Friend's email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)] outline-none"
          />
          {memberError && <p className="text-xs text-[var(--color-owe)]">{memberError}</p>}
          <button
            type="submit"
            disabled={addMember.isPending}
            className="w-full rounded-lg bg-[var(--color-accent)] py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {addMember.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      {transfers.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-2 text-xs font-medium uppercase text-[var(--color-text-muted)]">Balances</p>
          <div className="space-y-2">
            {transfers.map((t, i) => {
              const involvesMe = t.from === userId || t.to === userId
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text)]">
                    {nameFor(t.from)} → {nameFor(t.to)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text)]">{formatCurrency(t.amount)}</span>
                    {involvesMe && (
                      <button
                        onClick={() =>
                          addSettlement.mutate({ fromUser: t.from, toUser: t.to, amount: t.amount })
                        }
                        className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs text-white"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="mb-2 text-xs font-medium uppercase text-[var(--color-text-muted)]">Expenses</p>
      {expensesLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : !expenses || expenses.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No expenses yet.</p>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{e.description}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {nameFor(e.paid_by)} paid {formatCurrency(e.amount)} · {e.expense_date}
                </p>
              </div>
              <button
                onClick={() => deleteExpense.mutate(e.id)}
                className="text-xs text-[var(--color-text-muted)]"
                aria-label="Delete expense"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAddExpense(true)}
        className="fixed bottom-20 right-4 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-2xl text-white shadow-lg"
        aria-label="Add expense"
      >
        +
      </button>

      {showAddExpense && (
        <ExpenseSheet
          groupId={groupId!}
          members={group.members}
          currentUserId={userId}
          onClose={() => setShowAddExpense(false)}
        />
      )}
    </div>
  )
}
