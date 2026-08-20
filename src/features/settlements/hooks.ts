import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export interface Settlement {
  id: string
  group_id: string
  from_user: string
  to_user: string
  amount: number
  created_by: string
  created_at: string
  cycle: number
}

export function useSettlements(groupId: string | undefined, cycle: number | undefined) {
  return useQuery({
    queryKey: ['settlements', groupId, cycle],
    queryFn: async (): Promise<Settlement[]> => {
      const { data, error } = await supabase
        .from('settlements')
        .select('id, group_id, from_user, to_user, amount, created_by, created_at, cycle')
        .eq('group_id', groupId!)
        .eq('cycle', cycle!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((s) => ({ ...s, amount: Number(s.amount) }))
    },
    enabled: !!groupId && !!cycle,
  })
}

export function useAddSettlement(groupId: string) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { fromUser: string; toUser: string; amount: number }) => {
      const { error } = await supabase.from('settlements').insert({
        group_id: groupId,
        from_user: input.fromUser,
        to_user: input.toUser,
        amount: input.amount,
        created_by: session!.user.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      // A settlement can close out the group's cycle (server-side trigger),
      // so refresh the group (for its possibly-bumped cycle_number) along
      // with everything scoped to it.
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] })
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group-cycles', groupId] })
      queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
    },
  })
}
