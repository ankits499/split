import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useGroups } from '../groups/hooks'
import type { Expense } from '../expenses/hooks'
import type { Settlement } from '../settlements/hooks'

// How far back Home's "recent" widgets (spending chart, this-month-by-category,
// recent expenses) look. Balances below are NOT limited by this — those come
// from a SQL aggregate over full history so they stay correct regardless of
// how old the app's data gets.
const RECENT_WINDOW_DAYS = 45

export interface CategoryTotal {
  category: string
  total: number
}

export interface OverallSummary {
  totalBalance: number
  owed: number
  owe: number
  netByGroup: Map<string, number>
  recentExpenses: Expense[]
  chartExpenses: Expense[]
  monthlyTotal: number
  monthlyByCategory: CategoryTotal[]
}

export function useOverallSummary() {
  const { session } = useAuth()
  const { data: groups } = useGroups()

  const groupIds = (groups ?? []).map((g) => g.id)

  return useQuery({
    queryKey: ['overall-summary', session?.user?.id, groupIds.join(',')],
    queryFn: async (): Promise<OverallSummary> => {
      const userId = session!.user.id

      if (groupIds.length === 0) {
        return {
          totalBalance: 0,
          owed: 0,
          owe: 0,
          netByGroup: new Map(),
          recentExpenses: [],
          chartExpenses: [],
          monthlyTotal: 0,
          monthlyByCategory: [],
        }
      }

      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - RECENT_WINDOW_DAYS)
      const cutoffDate = cutoff.toISOString().slice(0, 10)

      const [{ data: balanceRows, error: balanceErr }, { data: expenseRows, error: expenseErr }] =
        await Promise.all([
          supabase.rpc('group_net_balances', { p_user_id: userId }),
          supabase
            .from('expenses')
            .select(
              'id, group_id, description, amount, paid_by, expense_date, created_at, category, expense_splits(user_id, share)'
            )
            .in('group_id', groupIds)
            .gte('expense_date', cutoffDate)
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false }),
        ])
      if (balanceErr) throw balanceErr
      if (expenseErr) throw expenseErr

      const expenses: Expense[] = expenseRows.map((e) => ({
        id: e.id,
        group_id: e.group_id,
        description: e.description,
        amount: Number(e.amount),
        paid_by: e.paid_by,
        expense_date: e.expense_date,
        created_at: e.created_at,
        category: e.category,
        splits: e.expense_splits.map((s: { user_id: string; share: number }) => ({
          user_id: s.user_id,
          share: Number(s.share),
        })),
      }))

      const netByGroup = new Map<string, number>()
      let owed = 0
      let owe = 0
      for (const row of balanceRows as { group_id: string; net: number }[]) {
        const net = Number(row.net)
        netByGroup.set(row.group_id, net)
        if (net > 0) owed += net
        else owe += -net
      }

      const monthPrefix = new Date().toISOString().slice(0, 7)
      const categoryTotals = new Map<string, number>()
      let monthlyTotal = 0
      for (const e of expenses) {
        if (!e.expense_date.startsWith(monthPrefix)) continue
        const myShare = e.splits.find((s) => s.user_id === userId)?.share ?? 0
        if (myShare <= 0) continue
        categoryTotals.set(e.category, (categoryTotals.get(e.category) ?? 0) + myShare)
        monthlyTotal += myShare
      }
      const monthlyByCategory: CategoryTotal[] = [...categoryTotals.entries()]
        .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
        .sort((a, b) => b.total - a.total)

      return {
        totalBalance: Math.round((owed - owe) * 100) / 100,
        owed: Math.round(owed * 100) / 100,
        owe: Math.round(owe * 100) / 100,
        netByGroup,
        recentExpenses: expenses.slice(0, 5),
        chartExpenses: expenses,
        monthlyTotal: Math.round(monthlyTotal * 100) / 100,
        monthlyByCategory,
      }
    },
    enabled: !!session?.user && !!groups,
  })
}

export interface ActivityEntry {
  kind: 'expense' | 'settlement'
  id: string
  groupId: string
  groupName: string
  createdAt: string
  expense?: Expense
  settlement?: Settlement
}

const ACTIVITY_PAGE_SIZE = 25

/** Paginated feed for the Activity page — grows on "load more" instead of ever fetching a user's entire history at once. */
export function useActivityFeed() {
  const { session } = useAuth()
  const { data: groups } = useGroups()
  const [limit, setLimit] = useState(ACTIVITY_PAGE_SIZE)

  const groupIds = (groups ?? []).map((g) => g.id)

  const query = useQuery({
    queryKey: ['activity-feed', session?.user?.id, groupIds.join(','), limit],
    queryFn: async (): Promise<{ entries: ActivityEntry[]; hasMore: boolean }> => {
      if (groupIds.length === 0) return { entries: [], hasMore: false }

      const [{ data: expenseRows, error: expenseErr }, { data: settlementRows, error: settlementErr }] =
        await Promise.all([
          supabase
            .from('expenses')
            .select(
              'id, group_id, description, amount, paid_by, expense_date, created_at, category, expense_splits(user_id, share)'
            )
            .in('group_id', groupIds)
            .order('created_at', { ascending: false })
            .limit(limit),
          supabase
            .from('settlements')
            .select('id, group_id, from_user, to_user, amount, created_by, created_at')
            .in('group_id', groupIds)
            .order('created_at', { ascending: false })
            .limit(limit),
        ])
      if (expenseErr) throw expenseErr
      if (settlementErr) throw settlementErr

      const groupNameById = new Map((groups ?? []).map((g) => [g.id, g.name]))

      const expenses: Expense[] = expenseRows.map((e) => ({
        id: e.id,
        group_id: e.group_id,
        description: e.description,
        amount: Number(e.amount),
        paid_by: e.paid_by,
        expense_date: e.expense_date,
        created_at: e.created_at,
        category: e.category,
        splits: e.expense_splits.map((s: { user_id: string; share: number }) => ({
          user_id: s.user_id,
          share: Number(s.share),
        })),
      }))
      const settlements: Settlement[] = settlementRows.map((s) => ({ ...s, amount: Number(s.amount) }))

      const entries: ActivityEntry[] = [
        ...expenses.map((e) => ({
          kind: 'expense' as const,
          id: e.id,
          groupId: e.group_id,
          groupName: groupNameById.get(e.group_id) ?? 'Group',
          createdAt: e.created_at,
          expense: e,
        })),
        ...settlements.map((s) => ({
          kind: 'settlement' as const,
          id: s.id,
          groupId: s.group_id,
          groupName: groupNameById.get(s.group_id) ?? 'Group',
          createdAt: s.created_at,
          settlement: s,
        })),
      ]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)

      // Either source hitting the page size means there could be more beyond it.
      const hasMore = expenseRows.length === limit || settlementRows.length === limit

      return { entries, hasMore }
    },
    enabled: !!session?.user && !!groups,
  })

  return { ...query, loadMore: () => setLimit((l) => l + ACTIVITY_PAGE_SIZE) }
}
