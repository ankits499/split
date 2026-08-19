import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export interface GroupMember {
  user_id: string
  name: string
}

export interface GroupSummary {
  id: string
  name: string
  members: GroupMember[]
}

async function fetchGroups(userId: string): Promise<GroupSummary[]> {
  const { data: memberRows, error: memberErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
  if (memberErr) throw memberErr
  const groupIds = memberRows.map((r) => r.group_id)
  if (groupIds.length === 0) return []

  const { data: groups, error: groupErr } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', groupIds)
  if (groupErr) throw groupErr

  const { data: allMembers, error: allMemberErr } = await supabase
    .from('group_members')
    .select('group_id, user_id, profiles(id, name)')
    .in('group_id', groupIds)
  if (allMemberErr) throw allMemberErr

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    members: allMembers
      .filter((m) => m.group_id === g.id)
      // @ts-expect-error joined relation shape
      .map((m) => ({ user_id: m.user_id, name: m.profiles?.name ?? 'Unknown' })),
  }))
}

export function useGroups() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['groups', session?.user?.id],
    queryFn: () => fetchGroups(session!.user.id),
    enabled: !!session?.user,
  })
}

export function useGroup(groupId: string | undefined) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async (): Promise<GroupSummary> => {
      const { data: group, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('id', groupId!)
        .single()
      if (error) throw error

      const { data: members, error: memberErr } = await supabase
        .from('group_members')
        .select('user_id, profiles(id, name)')
        .eq('group_id', groupId!)
      if (memberErr) throw memberErr

      return {
        id: group.id,
        name: group.name,
        members: members.map((m) => ({
          user_id: m.user_id,
          // @ts-expect-error joined relation shape
          name: m.profiles?.name ?? 'Unknown',
        })),
      }
    },
    enabled: !!groupId && !!session?.user,
  })
}

export function useCreateGroup() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, memberEmails }: { name: string; memberEmails: string[] }) => {
      const userId = session!.user.id
      const { data: group, error } = await supabase
        .from('groups')
        .insert({ name, created_by: userId })
        .select('id')
        .single()
      if (error) throw error

      await supabase.from('group_members').insert({ group_id: group.id, user_id: userId })

      if (memberEmails.length > 0) {
        const { data: matches } = await supabase
          .from('profiles')
          .select('id')
          .in(
            'email',
            memberEmails.map((e) => e.toLowerCase())
          )
        if (matches && matches.length > 0) {
          const rows = matches
            .filter((m) => m.id !== userId)
            .map((m) => ({ group_id: group.id, user_id: m.id }))
          if (rows.length > 0) await supabase.from('group_members').insert(rows)
        }
      }

      return group.id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useAddMember(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const { data: match, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle()
      if (error) throw error
      if (!match) throw new Error('No Split user with that email yet. Ask them to sign up first.')
      await supabase.from('group_members').insert({ group_id: groupId, user_id: match.id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}
