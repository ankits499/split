-- Applied directly to the live project via Supabase MCP.
-- Soft-delete expenses: deleting an expense now sets deleted_at instead of
-- removing the row, so it stays visible in the Activity feed but must never
-- again count toward any balance/total. expense_splits has an `on delete
-- cascade` FK, but that never fires here since we update, not delete — every
-- consumer that matters for balances filters at the expenses level, so the
-- still-present splits are simply never pulled into any calc.
alter table expenses add column deleted_at timestamptz null;

-- Re-declare group_net_balances to exclude soft-deleted expenses from both
-- the "paid" and "owed" aggregates. This is a Postgres RPC (behind Home's
-- overall balance and every group's balance tab), so it can't be fixed by a
-- client-side .is('deleted_at', null) filter the way ordinary queries can.
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
    where paid_by = p_user_id and deleted_at is null
    group by group_id
  ) paid on paid.group_id = g.id
  left join (
    select e.group_id, sum(es.share) as total
    from expense_splits es
    join expenses e on e.id = es.expense_id
    where es.user_id = p_user_id and e.deleted_at is null
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

-- No change needed to expenses_notify_group_update's WHEN clause (schema.sql)
-- — it only fires on description/amount/paid_by/expense_date/category
-- changes, so this soft-delete update (touching only deleted_at) won't
-- spuriously fire an "edited" push. Hard deletes previously sent no
-- notification either, so this preserves that same silent-on-delete
-- behavior.
