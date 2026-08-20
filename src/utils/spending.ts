import type { Expense } from '../features/expenses/hooks'

export type SpendingRange = '1w' | 'mtd' | '3m'

export const SPENDING_WINDOW_DAYS = 92

export interface SpendingBucket {
  label: string
  total: number
}

export interface CategorySlice {
  category: string
  total: number
}

export interface SpendingBreakdown {
  total: number
  byCategory: CategorySlice[]
  buckets: SpendingBucket[]
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function startOfRange(range: SpendingRange, today: Date): Date {
  const start = new Date(today)
  if (range === '1w') start.setDate(start.getDate() - 6)
  else if (range === 'mtd') start.setDate(1)
  else start.setDate(start.getDate() - 90)
  return start
}

function dailyBuckets(expenses: Expense[], start: Date, today: Date): SpendingBucket[] {
  const buckets: SpendingBucket[] = []
  const byDate = new Map<string, SpendingBucket>()
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const bucket = { label: String(d.getDate()), total: 0 }
    buckets.push(bucket)
    byDate.set(toIsoDate(d), bucket)
  }
  for (const e of expenses) {
    const bucket = byDate.get(e.expense_date)
    if (bucket) bucket.total += e.amount
  }
  return buckets
}

const WEEK_LABEL_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

function weeklyBuckets(expenses: Expense[], start: Date, today: Date): SpendingBucket[] {
  const buckets: { from: string; to: string; bucket: SpendingBucket }[] = []
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 7)) {
    const weekEnd = new Date(d)
    weekEnd.setDate(weekEnd.getDate() + 6)
    if (weekEnd > today) weekEnd.setTime(today.getTime())
    buckets.push({
      from: toIsoDate(d),
      to: toIsoDate(weekEnd),
      bucket: { label: d.toLocaleDateString(undefined, WEEK_LABEL_FORMAT), total: 0 },
    })
  }
  for (const e of expenses) {
    const match = buckets.find((b) => e.expense_date >= b.from && e.expense_date <= b.to)
    if (match) match.bucket.total += e.amount
  }
  return buckets.map((b) => b.bucket)
}

/** Filters `expenses` (already fetched over `SPENDING_WINDOW_DAYS`) down to `range` and
 *  computes the bar-chart buckets (total group spend) and per-category totals (the
 *  signed-in user's own share only, matching the balance semantics used elsewhere). */
export function computeSpendingBreakdown(
  expenses: Expense[],
  userId: string,
  range: SpendingRange
): SpendingBreakdown {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = startOfRange(range, today)
  const startIso = toIsoDate(start)
  const todayIso = toIsoDate(today)

  const inRange = expenses.filter((e) => e.expense_date >= startIso && e.expense_date <= todayIso)

  let total = 0
  const categoryTotals = new Map<string, number>()
  for (const e of inRange) {
    const myShare = e.splits.find((s) => s.user_id === userId)?.share ?? 0
    if (myShare <= 0) continue
    total += myShare
    categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + myShare)
  }
  const byCategory: CategorySlice[] = [...categoryTotals.entries()]
    .map(([category, t]) => ({ category, total: Math.round(t * 100) / 100 }))
    .sort((a, b) => b.total - a.total)

  const buckets = range === '3m' ? weeklyBuckets(inRange, start, today) : dailyBuckets(inRange, start, today)

  return { total: Math.round(total * 100) / 100, byCategory, buckets }
}
