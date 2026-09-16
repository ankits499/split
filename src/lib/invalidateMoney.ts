import type { QueryClient } from '@tanstack/react-query'

/** Call after any mutation that changes a group's expenses, splits, or
 *  settlements. Every screen that reads money data for a group (its own
 *  Expenses/Balances/Settlements/History tabs, Home's totals and recent
 *  expenses, the Activity feed, and per-friend balances) is invalidated
 *  together here — previously each mutation hook (add/update/delete
 *  expense, record a settlement, settle with a friend) kept its own
 *  hand-copied list, and they drifted out of sync one at a time (Activity
 *  and Friends not refreshing after adding an expense, Activity not
 *  refreshing after a settlement, etc). One shared list can't drift. */
export function invalidateMoneyQueries(queryClient: QueryClient, groupId: string) {
  queryClient.invalidateQueries({ queryKey: ['expenses', groupId] })
  queryClient.invalidateQueries({ queryKey: ['settlements', groupId] })
  queryClient.invalidateQueries({ queryKey: ['group', groupId] })
  queryClient.invalidateQueries({ queryKey: ['groups'] })
  queryClient.invalidateQueries({ queryKey: ['group-cycles', groupId] })
  queryClient.invalidateQueries({ queryKey: ['overall-summary'] })
  queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
  queryClient.invalidateQueries({ queryKey: ['friends-summary'] })
  queryClient.invalidateQueries({ queryKey: ['spending-history'] })
}
