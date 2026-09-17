import { GroupCard } from './GroupCard'
import { useOverallSummary } from '../features/dashboard/hooks'
import type { GroupSummary } from '../features/groups/hooks'

export function GroupCardContainer({
  group,
  archived,
  onUnarchive,
}: {
  group: GroupSummary
  archived?: boolean
  onUnarchive?: () => void
}) {
  const { data: summary, isLoading } = useOverallSummary()
  const netBalance = summary?.netByGroup.get(group.id) ?? 0

  return (
    <GroupCard
      id={group.id}
      name={group.name}
      memberNames={group.members.map((m) => m.name)}
      netBalance={netBalance}
      loading={isLoading}
      archived={archived}
      onUnarchive={onUnarchive}
    />
  )
}
