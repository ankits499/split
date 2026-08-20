-- Applied directly to the live project via Supabase MCP.
-- Adds group_net_balances(uuid), a SQL aggregate the dashboard now uses
-- instead of fetching every expense/split/settlement across all groups on
-- every page load just to sum them client-side. See schema.sql for the
-- full definition (same one, kept here so an existing project can catch up
-- by running just this file).

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
    select group_id, sum(amount) as total
    from expenses
    where paid_by = p_user_id
    group by group_id
  ) paid on paid.group_id = g.id
  left join (
    select e.group_id, sum(es.share) as total
    from expense_splits es
    join expenses e on e.id = es.expense_id
    where es.user_id = p_user_id
    group by e.group_id
  ) owed on owed.group_id = g.id
  left join (
    select group_id, sum(amount) as total
    from settlements
    where from_user = p_user_id
    group by group_id
  ) settle_out on settle_out.group_id = g.id
  left join (
    select group_id, sum(amount) as total
    from settlements
    where to_user = p_user_id
    group by group_id
  ) settle_in on settle_in.group_id = g.id;
$$;

grant execute on function group_net_balances(uuid) to authenticated;
