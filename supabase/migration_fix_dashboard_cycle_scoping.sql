-- Fix: group_net_balances (Home's dashboard totals) went stale/inconsistent
-- after a group settled up. migration_expense_soft_delete.sql re-declared
-- this function to exclude deleted expenses but accidentally dropped the
-- cycle_number filter that migration_settlement_cycles.sql had added, so it
-- was summing expenses/settlements across every cycle ever, not just the
-- active one. A group's own Balances tab (queried client-side with an
-- explicit cycle filter) already zeroes out correctly on settle-up; only the
-- Home aggregate drifted, since a closed cycle's net isn't always exactly
-- zero (the close trigger accepts up to a paisa of rounding drift).
create or replace function group_net_balances(p_user_id uuid)
returns table(group_id uuid, net numeric)
language sql
stable
security invoker
as $$
  select
    g.id as group_id,
    coalesce(paid.total, 0) - coalesce(owed.total, 0)
      + coalesce(settle_out.total, 0) - coalesce(settle_in.total, 0) as net
  from groups g
  join group_members gm on gm.group_id = g.id and gm.user_id = p_user_id
  left join (
    select e.group_id, sum(e.amount) as total
    from expenses e
    join groups gg on gg.id = e.group_id and gg.cycle_number = e.cycle
    where e.paid_by = p_user_id and e.deleted_at is null
    group by e.group_id
  ) paid on paid.group_id = g.id
  left join (
    select e.group_id, sum(es.share) as total
    from expense_splits es
    join expenses e on e.id = es.expense_id
    join groups gg on gg.id = e.group_id and gg.cycle_number = e.cycle
    where es.user_id = p_user_id and e.deleted_at is null
    group by e.group_id
  ) owed on owed.group_id = g.id
  left join (
    select s.group_id, sum(s.amount) as total
    from settlements s
    join groups gg on gg.id = s.group_id and gg.cycle_number = s.cycle
    where s.from_user = p_user_id
    group by s.group_id
  ) settle_out on settle_out.group_id = g.id
  left join (
    select s.group_id, sum(s.amount) as total
    from settlements s
    join groups gg on gg.id = s.group_id and gg.cycle_number = s.cycle
    where s.to_user = p_user_id
    group by s.group_id
  ) settle_in on settle_in.group_id = g.id;
$$;

grant execute on function group_net_balances(uuid) to authenticated;
