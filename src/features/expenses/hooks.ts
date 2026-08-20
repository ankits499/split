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
  splits: Split[]
}

export function useExpenses(groupId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async (): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          'id, group_id, description, amount, paid_by, expense_date, created_at, category, expense_splits(user_id, share)'
        )
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((e) => ({
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
    },
    enabled: !!groupId,
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
