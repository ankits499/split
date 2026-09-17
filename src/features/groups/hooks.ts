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
  created_by: string
  cycle_number: number
  archived_at: string | null
  members: GroupMember[]
}

/** Shared by useGroups/useArchivedGroups/useAllGroups — only which side of
 *  `archived_at` they select differs. Runs sync_group_archival first so a
 *  group that's been settled and untouched for 7 days moves into "archived"
 *  the moment someone actually looks at their groups list (no cron job —
 *  see migration_group_archiving.sql for why that's the right call here). */
async function fetchGroupsByArchival(userId: string, filter: 'active' | 'archived' | 'all'): Promise<GroupSummary[]> {
  await supabase.rpc('sync_group_archival', { p_user_id: userId })

  const { data: memberRows, error: memberErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
  if (memberErr) throw memberErr
  const groupIds = memberRows.map((r) => r.group_id)
  if (groupIds.length === 0) return []

  let base = supabase.from('groups').select('id, name, created_by, cycle_number, archived_at').in('id', groupIds)
  if (filter === 'active') base = base.is('archived_at', null)
  else if (filter === 'archived') base = base.not('archived_at', 'is', null)
  const { data: groups, error: groupErr } = await base
  if (groupErr) throw groupErr
  if (groups.length === 0) return []

  const matchedIds = groups.map((g) => g.id)
  const { data: allMembers, error: allMemberErr } = await supabase
    .from('group_members')
    .select('group_id, user_id, profiles(id, name)')
    .in('group_id', matchedIds)
  if (allMemberErr) throw allMemberErr

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    created_by: g.created_by,
    cycle_number: g.cycle_number,
    archived_at: g.archived_at,
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
    queryFn: () => fetchGroupsByArchival(session!.user.id, 'active'),
    enabled: !!session?.user,
  })
}

/** Groups auto-archived after 7 settled, untouched days — surfaced only in
 *  the Groups tab's "Archived" section so they don't clutter the everyday
 *  list, but still reachable and unarchivable from there. */
export function useArchivedGroups() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['groups-archived', session?.user?.id],
    queryFn: () => fetchGroupsByArchival(session!.user.id, 'archived'),
    enabled: !!session?.user,
  })
}

/** Every group the user belongs to, active or archived — for things that
 *  must never lose data just because a group got tidied off the everyday
 *  list: the Activity log and spending history charts. (useGroups() is
 *  "active only" on purpose for the Groups list, the expense-picker, and
 *  Home's totals — archiving is meant to declutter those.) */
export function useAllGroups() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['groups-all', session?.user?.id],
    queryFn: () => fetchGroupsByArchival(session!.user.id, 'all'),
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
        .select('id, name, created_by, cycle_number, archived_at')
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
        created_by: group.created_by,
        cycle_number: group.cycle_number,
        archived_at: group.archived_at,
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

/** Manual archive — independent of the 7-day-settled auto-archive check,
 *  so it works even on a group with an outstanding balance; it only hides
 *  the group from the everyday list, it doesn't touch who owes what. */
export function useArchiveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('groups').update({ archived_at: new Date().toISOString() }).eq('id', groupId)
      if (error) throw error
    },
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups-archived'] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
    },
  })
}

export function useUnarchiveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .update({ archived_at: null, unarchived_at: new Date().toISOString() })
        .eq('id', groupId)
      if (error) throw error
    },
    onSuccess: (_data, groupId) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups-archived'] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
    },
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

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}

export function useRenameGroup(groupId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('groups').update({ name }).eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
  })
}
