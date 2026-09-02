import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export interface Split {
  user_id: string
  share: number
}

export interface ValueDiff {
  old: string
  new: string
}

/** Latest amount/category diff per expense, batched over `expenseIds` — used
 *  to show "₹10 → ₹15" style summaries on the Activity page and in a group's
 *  expense list without a per-row query. */
export async function fetchLatestFieldDiffs(
  expenseIds: string[]
): Promise<Map<string, { amount?: ValueDiff; category?: ValueDiff }>> {
  const result = new Map<string, { amount?: ValueDiff; category?: ValueDiff }>()
  if (expenseIds.length === 0) return result

  const { data, error } = await supabase
    .from('expense_edits')
    .select('expense_id, changed_at, field, old_value, new_value')
    .in('expense_id', expenseIds)
    .in('field', ['amount', 'category'])
    .order('changed_at', { ascending: true })
  if (error) throw error

  for (const row of data as {
    expense_id: string
    field: 'amount' | 'category'
    old_value: string | null
    new_value: string | null
  }[]) {
    if (row.old_value === null || row.new_value === null) continue
    const existing = result.get(row.expense_id) ?? {}
    existing[row.field] = { old: row.old_value, new: row.new_value }
    result.set(row.expense_id, existing)
  }
  return result
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
  created_by: string
  edited_at: string | null
  edited_by: string | null
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
  created_by: string
  edited_at: string | null
  edited_by: string | null
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
    created_by: e.created_by,
    edited_at: e.edited_at,
    edited_by: e.edited_by,
    splits: e.expense_splits.map((s) => ({ user_id: s.user_id, share: Number(s.share) })),
  }
}

export const EXPENSE_COLUMNS =
  'id, group_id, description, amount, paid_by, expense_date, created_at, category, cycle, created_by, edited_at, edited_by, expense_splits(user_id, share)'

export function useExpenses(groupId: string | undefined, cycle: number | undefined) {
  return useQuery({
    queryKey: ['expenses', groupId, cycle],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(EXPENSE_COLUMNS)
        .eq('group_id', groupId!)
        .eq('cycle', cycle!)
        .is('deleted_at', null)
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
        .is('deleted_at', null)
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
        .is('deleted_at', null)
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
  const { session } = useAuth()
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
      original: Expense
    }) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          description: input.description,
          amount: input.amount,
          paid_by: input.paidBy,
          expense_date: input.date,
          category: input.category,
          edited_at: new Date().toISOString(),
          edited_by: session!.user.id,
        })
        .eq('id', input.id)
      if (error) throw error

      const { error: delErr } = await supabase.from('expense_splits').delete().eq('expense_id', input.id)
      if (delErr) throw delErr

      const { error: splitErr } = await supabase.from('expense_splits').insert(
        input.splits.map((s) => ({ expense_id: input.id, user_id: s.user_id, share: s.share }))
      )
      if (splitErr) throw splitErr

      const { original } = input
      const changedFields: { field: string; old_value: string; new_value: string }[] = []
      if (original.description !== input.description) {
        changedFields.push({ field: 'description', old_value: original.description, new_value: input.description })
      }
      if (original.amount !== input.amount) {
        changedFields.push({ field: 'amount', old_value: String(original.amount), new_value: String(input.amount) })
      }
      if (original.paid_by !== input.paidBy) {
        changedFields.push({ field: 'paid_by', old_value: original.paid_by, new_value: input.paidBy })
      }
      if (original.expense_date !== input.date) {
        changedFields.push({ field: 'expense_date', old_value: original.expense_date, new_value: input.date })
      }
      if (original.category !== input.category) {
        changedFields.push({ field: 'category', old_value: original.category, new_value: input.category })
      }
      if (changedFields.length > 0) {
        const { error: editErr } = await supabase.from('expense_edits').insert(
          changedFields.map((f) => ({ expense_id: input.id, changed_by: session!.user.id, ...f }))
        )
        if (editErr) throw editErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] })
      queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
    },
  })
}

/** Latest amount/category diff per expense id, for a currently-loaded expense list. */
export function useExpenseDiffs(expenseIds: string[]) {
  return useQuery({
    queryKey: ['expense-diffs', [...expenseIds].sort().join(',')],
    queryFn: () => fetchLatestFieldDiffs(expenseIds),
    enabled: expenseIds.length > 0,
  })
}

export interface ExpenseEdit {
  id: string
  changed_by: string
  changed_at: string
  field: string
  old_value: string | null
  new_value: string | null
}

/** Full field-level edit history for one expense, oldest first — feeds the "Edit history" panel. */
export function useExpenseEditHistory(expenseId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['expense-edits', expenseId],
    queryFn: async (): Promise<ExpenseEdit[]> => {
      const { data, error } = await supabase
        .from('expense_edits')
        .select('id, changed_by, changed_at, field, old_value, new_value')
        .eq('expense_id', expenseId!)
        .order('changed_at', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!expenseId && enabled,
  })
}

export function useDeleteExpense(groupId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (expenseId: string) => {
      // Soft delete: the row (and its expense_splits) stays so it can still
      // show up in Activity, but every balance/total query filters out rows
      // with deleted_at set, so it never counts again.
      const { error } = await supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString(), deleted_by: session!.user.id })
        .eq('id', expenseId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] })
      queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
    },
  })
}
