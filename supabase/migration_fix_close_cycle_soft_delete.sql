-- Fix: close_cycle_if_settled (the trigger that archives a group into
-- History once every member is settled up) summed expenses/expense_splits
-- for the current cycle WITHOUT excluding soft-deleted rows. It predates
-- migration_expense_soft_delete.sql by two days, and unlike its sibling
-- group_net_balances, nobody updated it when soft-delete shipped.
--
-- Effect: deleting any expense in the active cycle leaves its amount/share
-- as a permanent "phantom" balance in this trigger's eyes, even though every
-- balance the app actually shows (Balances tab, Home) correctly excludes
-- it. A group can look and be fully settled (every visible number reads
-- ₹0) and still never close its cycle — settling up silently stops
-- archiving past expenses into History, with no error surfaced anywhere.
create or replace function close_cycle_if_settled()
returns trigger
language plpgsql
security definer
as $$
declare
  v_cycle int;
  v_unsettled boolean;
begin
  select cycle_number into v_cycle from groups where id = new.group_id for update;

  select exists (
    select 1
    from (
      select
        gm.user_id,
        coalesce(paid.total, 0) - coalesce(owed.total, 0)
          + coalesce(settle_out.total, 0) - coalesce(settle_in.total, 0) as net
      from group_members gm
      left join (
        select paid_by, sum(amount) as total
        from expenses
        where group_id = new.group_id and cycle = v_cycle and deleted_at is null
        group by paid_by
      ) paid on paid.paid_by = gm.user_id
      left join (
        select es.user_id, sum(es.share) as total
        from expense_splits es
        join expenses e on e.id = es.expense_id
        where e.group_id = new.group_id and e.cycle = v_cycle and e.deleted_at is null
        group by es.user_id
      ) owed on owed.user_id = gm.user_id
      left join (
        select from_user, sum(amount) as total
        from settlements
        where group_id = new.group_id and cycle = v_cycle
        group by from_user
      ) settle_out on settle_out.from_user = gm.user_id
      left join (
        select to_user, sum(amount) as total
        from settlements
        where group_id = new.group_id and cycle = v_cycle
        group by to_user
      ) settle_in on settle_in.to_user = gm.user_id
      where gm.group_id = new.group_id
    ) balances
    where abs(net) > 0.01
  ) into v_unsettled;

  if not v_unsettled then
    update groups set cycle_number = cycle_number + 1 where id = new.group_id;
  end if;

  return new;
end;
$$;
