import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './auth/AuthProvider'

export function useLocalUser() {
  const { session, profile } = useAuth()
  return { id: session?.user?.id ?? '', name: profile?.name ?? 'You' }
}

export function useRenameLocalUser() {
  const { updateName } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      await updateName(name.trim() || 'You')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group'] })
    },
  })
}
