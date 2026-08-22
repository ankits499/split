import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { useGroups } from '../groups/hooks'
import { EXPENSE_COLUMNS, mapExpenseRow } from '../expenses/hooks'
import type { Settlement } from '../settlements/hooks'
import { pairwiseNet } from '../../utils/balances'

export interface FriendGroupBalance {
  groupId: string
  groupName: string
  net: number
}

export interface FriendSummary {
  friendId: string
  friendName: string
  net: number
  groups: FriendGroupBalance[]
}

export function useFriendsSummary() {
  const { session } = useAuth()
  const { data: groups } = useGroups()

  return useQuery({
    queryKey: [
      'friends-summary',
      session?.user?.id,
      (groups ?? []).map((g) => `${g.id}:${g.cycle_number}`).join(','),
    ],
    queryFn: async (): Promise<FriendSummary[]> => {
      const userId = session!.user.id

      const perGroup = await Promise.all(
        (groups ?? []).map(async (g) => {
          const [{ data: expenseRows, error: expenseErr }, { data: settlementRows, error: settlementErr }] =
            await Promise.all([
              supabase
                .from('expenses')
                .select(EXPENSE_COLUMNS)
                .eq('group_id', g.id)
                .eq('cycle', g.cycle_number)
                .is('deleted_at', null),
              supabase
                .from('settlements')
                .select('id, group_id, from_user, to_user, amount, created_by, created_at, cycle')
                .eq('group_id', g.id)
                .eq('cycle', g.cycle_number),
            ])
          if (expenseErr) throw expenseErr
          if (settlementErr) throw settlementErr

          const expenses = expenseRows.map(mapExpenseRow)
          const settlements: Settlement[] = settlementRows.map((s) => ({ ...s, amount: Number(s.amount) }))
          return { group: g, expenses, settlements }
        })
      )

      const byFriend = new Map<string, FriendSummary>()
      for (const { group, expenses, settlements } of perGroup) {
        for (const member of group.members) {
          if (member.user_id === userId) continue
          const net = pairwiseNet(expenses, settlements, userId, member.user_id)
          if (Math.abs(net) < 0.005) continue

          let entry = byFriend.get(member.user_id)
          if (!entry) {
            entry = { friendId: member.user_id, friendName: member.name, net: 0, groups: [] }
            byFriend.set(member.user_id, entry)
          }
          entry.net = Math.round((entry.net + net) * 100) / 100
          entry.groups.push({ groupId: group.id, groupName: group.name, net })
        }
      }

      return [...byFriend.values()].sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    },
    enabled: !!session?.user && !!groups,
  })
}

export function useSettleWithFriend() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { friendId: string; groups: FriendGroupBalance[] }) => {
      const userId = session!.user.id
      for (const g of input.groups) {
        if (Math.abs(g.net) < 0.005) continue
        const amount = Math.round(Math.abs(g.net) * 100) / 100
        const fromUser = g.net > 0 ? input.friendId : userId
        const toUser = g.net > 0 ? userId : input.friendId
        const { error } = await supabase.from('settlements').insert({
          group_id: g.groupId,
          from_user: fromUser,
          to_user: toUser,
          amount,
          created_by: userId,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-summary'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['group'] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-cycles'] })
      queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
    },
  })
}
