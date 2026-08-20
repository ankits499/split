import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface Settlement {
  id: string
  group_id: string
  from_user: string
  to_user: string
  amount: number
  created_at: string
}

export function useSettlements(groupId: string | undefined) {
  return useQuery({
    queryKey: ['settlements', groupId],
    queryFn: async (): Promise<Settlement[]> => {
      const { data, error } = await supabase
        .from('settlements')
        .select('id, group_id, from_user, to_user, amount, created_at')
        .eq('group_id', groupId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((s) => ({ ...s, amount: Number(s.amount) }))
    },
    enabled: !!groupId,
  })
}

export function useAddSettlement(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { fromUser: string; toUser: string; amount: number }) => {
      const { error } = await supabase.from('settlements').insert({
        group_id: groupId,
        from_user: input.fromUser,
        to_user: input.toUser,
        amount: input.amount,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements', groupId] })
    },
  })
}
