-- Split: settlement cycles
-- Once every member of a group is fully settled up, archive everything so
-- far and start a fresh cycle. Nothing is deleted or moved — every
-- expense/settlement is stamped with the cycle it belonged to, and the
-- group's cycle_number increments when a settlement brings every member's
-- balance to zero. The app filters the Expenses/Balances/Settlements tabs
-- to the current cycle; older cycles remain readable under History.

alter table groups add column cycle_number int not null default 1;
alter table expenses add column cycle int not null default 1;
alter table settlements add column cycle int not null default 1;

-- Stamps new expenses/settlements with the group's current cycle, so
-- callers never need to know or pass it.
create or replace function stamp_cycle()
returns trigger
language plpgsql
security definer
as $$
begin
  select cycle_number into new.cycle from groups where id = new.group_id;
  return new;
end;
$$;

create trigger expenses_stamp_cycle
  before insert on expenses
  for each row execute function stamp_cycle();

create trigger settlements_stamp_cycle
  before insert on settlements
  for each row execute function stamp_cycle();

-- After a settlement is recorded, check whether every member of the group
-- is now settled up (net balance within a paisa of zero) for the current
-- cycle. If so, advance cycle_number so future expenses/settlements start
-- a fresh cycle and everything so far becomes read-only history.
--
-- Locks the group row `for update` so two members recording settlements
-- for the same group at the same time can't both decide to close the cycle.
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
        where group_id = new.group_id and cycle = v_cycle
        group by paid_by
      ) paid on paid.paid_by = gm.user_id
      left join (
        select es.user_id, sum(es.share) as total
        from expense_splits es
        join expenses e on e.id = es.expense_id
        where e.group_id = new.group_id and e.cycle = v_cycle
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

create trigger settlements_close_cycle
  after insert on settlements
  for each row execute function close_cycle_if_settled();

-- Dashboard balances should only reflect the active cycle of each group.
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
    where e.paid_by = p_user_id
    group by e.group_id
  ) paid on paid.group_id = g.id
  left join (
    select e.group_id, sum(es.share) as total
    from expense_splits es
    join expenses e on e.id = es.expense_id
    join groups gg on gg.id = e.group_id and gg.cycle_number = e.cycle
    where es.user_id = p_user_id
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
