export interface ExpenseLike {
  paid_by: string
  splits: { user_id: string; share: number }[]
}

export interface SettlementLike {
  from_user: string
  to_user: string
  amount: number
}

/** Net balance per user: positive = they are owed money, negative = they owe money. */
export function computeNetBalances(
  expenses: ExpenseLike[],
  settlements: SettlementLike[]
): Map<string, number> {
  const net = new Map<string, number>()
  const add = (userId: string, delta: number) => net.set(userId, (net.get(userId) ?? 0) + delta)

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.user_id === expense.paid_by) continue
      add(expense.paid_by, split.share)
      add(split.user_id, -split.share)
    }
  }

  for (const s of settlements) {
    add(s.from_user, s.amount)
    add(s.to_user, -s.amount)
  }

  for (const [id, amount] of net) {
    net.set(id, Math.round(amount * 100) / 100)
  }
  return net
}

/** Direct 1:1 balance between two specific users, independent of group size
 *  or the simplified-transfer graph. Positive = otherId owes meId. */
export function pairwiseNet(
  expenses: ExpenseLike[],
  settlements: SettlementLike[],
  meId: string,
  otherId: string
): number {
  let net = 0
  for (const expense of expenses) {
    if (expense.paid_by === meId) {
      const split = expense.splits.find((s) => s.user_id === otherId)
      if (split) net += split.share
    } else if (expense.paid_by === otherId) {
      const split = expense.splits.find((s) => s.user_id === meId)
      if (split) net -= split.share
    }
  }
  for (const s of settlements) {
    if (s.from_user === meId && s.to_user === otherId) net += s.amount
    else if (s.from_user === otherId && s.to_user === meId) net -= s.amount
  }
  return Math.round(net * 100) / 100
}

/** How much a single expense shifted one user's balance: positive = they're owed back, negative = they owe. */
export function myExpenseDelta(
  expense: { paid_by: string; amount: number; splits: { user_id: string; share: number }[] },
  userId: string
): number {
  const myShare = expense.splits.find((s) => s.user_id === userId)?.share ?? 0
  const paid = expense.paid_by === userId ? expense.amount : 0
  return Math.round((paid - myShare) * 100) / 100
}

export interface Transfer {
  from: string
  to: string
  amount: number
}

/** Greedy debt simplification: minimizes the number of payments needed to settle a group. */
export function simplifyDebts(net: Map<string, number>): Transfer[] {
  const creditors: { id: string; amount: number }[] = []
  const debtors: { id: string; amount: number }[] = []

  for (const [id, amount] of net) {
    if (amount > 0.005) creditors.push({ id, amount })
    else if (amount < -0.005) debtors.push({ id, amount: -amount })
  }

  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.round(Math.min(debtor.amount, creditor.amount) * 100) / 100

    if (amount > 0.005) {
      transfers.push({ from: debtor.id, to: creditor.id, amount })
    }

    debtor.amount -= amount
    creditor.amount -= amount

    if (debtor.amount <= 0.005) i++
    if (creditor.amount <= 0.005) j++
  }

  return transfers
}
