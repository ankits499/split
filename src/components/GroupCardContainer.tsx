import { GroupCard } from './GroupCard'
import { useExpenses } from '../features/expenses/hooks'
import { useSettlements } from '../features/settlements/hooks'
import { computeNetBalances } from '../utils/balances'
import type { GroupSummary } from '../features/groups/hooks'

export function GroupCardContainer({ group, userId }: { group: GroupSummary; userId: string }) {
  const { data: expenses } = useExpenses(group.id)
  const { data: settlements } = useSettlements(group.id)

  const net = computeNetBalances(expenses ?? [], settlements ?? [])
  const netBalance = net.get(userId) ?? 0

  return <GroupCard id={group.id} name={group.name} memberCount={group.members.length} netBalance={netBalance} />
}
