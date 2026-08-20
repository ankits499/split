import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export interface Split {
  user_id: string
  share: number
}

export interface Expense {
  id: string
  group_id: string
  description: string
  amount: number
  paid_by: string
  expense_date: string
  created_at: string
  category: string
  cycle: number
  splits: Split[]
}

export function mapExpenseRow(e: {
  id: string
  group_id: string
  description: string
  amount: number
  paid_by: string
  expense_date: string
  created_at: string
  category: string
  cycle: number
  expense_splits: { user_id: string; share: number }[]
}): Expense {
  return {
    id: e.id,
    group_id: e.group_id,
    description: e.description,
    amount: Number(e.amount),
    paid_by: e.paid_by,
    expense_date: e.expense_date,
    created_at: e.created_at,
    category: e.category,
    cycle: e.cycle,
    splits: e.expense_splits.map((s) => ({ user_id: s.user_id, share: Number(s.share) })),
  }
}

export const EXPENSE_COLUMNS =
  'id, group_id, description, amount, paid_by, expense_date, created_at, category, cycle, expense_splits(user_id, share)'

export function useExpenses(groupId: string | undefined, cycle: number | undefined) {
  return useQuery({
    queryKey: ['expenses', groupId, cycle],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_COLUMNS)
        .eq('group_id', groupId!)
        .eq('cycle', cycle!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapExpenseRow)
    },
    enabled: !!groupId && !!cycle,
  })
}

export interface CycleSummary {
  cycle: number
  total: number
  expenseCount: number
  startDate: string
  endDate: string
}

/** Summaries of past (archived) cycles for a group, newest first — feeds the History tab. */
export function useGroupCycleSummaries(groupId: string | undefined, currentCycle: number | undefined) {
  return useQuery({
    queryKey: ['group-cycles', groupId, currentCycle],
    queryFn: async (): Promise<CycleSummary[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, expense_date, cycle')
        .eq('group_id', groupId!)
        .lt('cycle', currentCycle!)
      if (error) throw error

      const byCycle = new Map<number, CycleSummary>()
      for (const row of data) {
        const existing = byCycle.get(row.cycle)
        const amount = Number(row.amount)
        if (!existing) {
          byCycle.set(row.cycle, {
            cycle: row.cycle,
            total: amount,
            expenseCount: 1,
            startDate: row.expense_date,
            endDate: row.expense_date,
          })
        } else {
          existing.total += amount
          existing.expenseCount += 1
          if (row.expense_date < existing.startDate) existing.startDate = row.expense_date
          if (row.expense_date > existing.endDate) existing.endDate = row.expense_date
        }
      }
      return [...byCycle.values()].sort((a, b) => b.cycle - a.cycle)
    },
    enabled: !!groupId && !!currentCycle && currentCycle > 1,
  })
}

/** Read-only expenses for a single archived cycle — feeds the History detail view. */
export function useCycleExpenses(groupId: string | undefined, cycle: number | undefined) {
  return useQuery({
    queryKey: ['cycle-expenses', groupId, cycle],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_COLUMNS)
        .eq('group_id', groupId!)
        .eq('cycle', cycle!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map(mapExpenseRow)
    },
    enabled: !!groupId && !!cycle,
  })
}

export function useAddExpense(groupId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      description: string
      amount: number
      paidBy: string
      splits: Split[]
      date: string
      category: string
    }) => {
      const { data: expense, error } = await supabase
        .from('expenses')
        .insert({
          group_id: groupId,
          description: input.description,
          amount: input.amount,
          paid_by: input.paidBy,
          created_by: session!.user.id,
          expense_date: input.date,
          category: input.category,
        })
        .select('id')
        .single()
      if (error) throw error

      const { error: splitErr } = await supabase.from('expense_splits').insert(
        input.splits.map((s) => ({ expense_id: expense.id, user_id: s.user_id, share: s.share }))
      )
      if (splitErr) throw splitErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] })
      queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
    },
  })
}

export function useUpdateExpense(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      description: string
      amount: number
      paidBy: string
      splits: Split[]
      date: string
      category: string
    }) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          description: input.description,
          amount: input.amount,
          paid_by: input.paidBy,
          expense_date: input.date,
          category: input.category,
        })
        .eq('id', input.id)
      if (error) throw error

      const { error: delErr } = await supabase.from('expense_splits').delete().eq('expense_id', input.id)
      if (delErr) throw delErr

      const { error: splitErr } = await supabase.from('expense_splits').insert(
        input.splits.map((s) => ({ expense_id: input.id, user_id: s.user_id, share: s.share }))
      )
      if (splitErr) throw splitErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] })
      queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
    },
  })
}

export function useDeleteExpense(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
    },
  })
}
