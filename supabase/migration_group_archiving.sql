-- Split: auto-archive groups that have been fully settled and untouched
-- for 7 days, with manual unarchive.
--
-- Design notes (read before touching this):
--
-- * No cron/scheduled job. Archiving only matters when someone is actually
--   looking at their groups list, so `sync_group_archival` is called from
--   the client as part of fetching groups (features/groups/hooks.ts) —
--   the same "lazy, triggered by the read that needs it" pattern already
--   used for cycle-closing (an AFTER INSERT trigger, not a poller).
--
-- * "Settled" reuses the exact per-member zero-balance check that
--   close_cycle_if_settled already has, pulled out into
--   group_current_cycle_settled() so both call one copy instead of two
--   copies that can drift apart — which is exactly how the soft-delete
--   filter went missing from close_cycle_if_settled earlier (fixed in
--   migration_fix_close_cycle_soft_delete.sql). Don't re-inline this.
--
-- * "Untouched for 7 days" = 7 days since the most recent expense or
--   settlement in the group, across all cycles — not just the current one.
--   The settlement that closes a cycle IS the most recent activity, so the
--   7-day countdown naturally starts from the moment a group actually
--   becomes settled, not from whenever the (now-empty) new cycle began.
--   ponytail: activity is judged by created_at only, not edited_at/
--   deleted_at — editing or deleting a months-old expense won't itself
--   delay archiving. Revisit if that turns out to matter in practice.
--
-- * A group with zero expenses/settlements ever is never auto-archived
--   (group_last_activity_at returns null) — otherwise every freshly
--   created, not-yet-used group would archive itself a week after
--   creation, which is not "settled," it's just unused.
--
-- * Manual unarchive must not be immediately undone by the next sync. If
--   sync only looked at real activity, unarchiving a group with no new
--   expenses would just re-archive it on the next groups-list load, making
--   "unarchive" meaningless. unarchived_at tracks the last manual
--   unarchive and extends the 7-day grace period from that moment too.
--
-- * Adding a new expense or settlement to an archived group (reachable via
--   the group's own page, direct link, or the Archived section) always
--   un-archives it — otherwise a group could have a live, unsettled
--   balance while staying invisible in the main Groups list, which is a
--   worse bug than the one this feature fixes. Triggers on both tables so
--   this holds regardless of which client flow inserted the row.

alter table groups add column archived_at timestamptz null;
alter table groups add column unarchived_at timestamptz null;

-- Extracted from close_cycle_if_settled so the archival check and the
-- cycle-close check can never disagree about what "settled" means.
create or replace function group_current_cycle_settled(p_group_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select not exists (
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
        where group_id = p_group_id
          and cycle = (select cycle_number from groups where id = p_group_id)
          and deleted_at is null
        group by paid_by
      ) paid on paid.paid_by = gm.user_id
      left join (
        select es.user_id, sum(es.share) as total
        from expense_splits es
        join expenses e on e.id = es.expense_id
        where e.group_id = p_group_id
          and e.cycle = (select cycle_number from groups where id = p_group_id)
          and e.deleted_at is null
        group by es.user_id
      ) owed on owed.user_id = gm.user_id
      left join (
        select from_user, sum(amount) as total
        from settlements
        where group_id = p_group_id
          and cycle = (select cycle_number from groups where id = p_group_id)
        group by from_user
      ) settle_out on settle_out.from_user = gm.user_id
      left join (
        select to_user, sum(amount) as total
        from settlements
        where group_id = p_group_id
          and cycle = (select cycle_number from groups where id = p_group_id)
        group by to_user
      ) settle_in on settle_in.to_user = gm.user_id
      where gm.group_id = p_group_id
    ) balances
    where abs(net) > 0.01
  );
$$;

-- Reuse the shared check instead of the inline copy this trigger had.
create or replace function close_cycle_if_settled()
returns trigger
language plpgsql
security definer
as $$
declare
  v_cycle int;
begin
  select cycle_number into v_cycle from groups where id = new.group_id for update;

  if group_current_cycle_settled(new.group_id) then
    update groups set cycle_number = cycle_number + 1 where id = new.group_id;
  end if;

  return new;
end;
$$;

create or replace function group_last_activity_at(p_group_id uuid)
returns timestamptz
language sql
stable
security definer
as $$
  select greatest(
    (select max(created_at) from expenses where group_id = p_group_id and deleted_at is null),
    (select max(created_at) from settlements where group_id = p_group_id)
  );
$$;

-- Called from the client when the groups list loads. Scoped to p_user_id's
-- own groups (an optimization — RLS on the update below would block
-- anything else anyway, since this runs security invoker).
create or replace function sync_group_archival(p_user_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update groups g
  set archived_at = now()
  where g.archived_at is null
    and exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = p_user_id)
    and group_last_activity_at(g.id) is not null
    and greatest(group_last_activity_at(g.id), g.unarchived_at) <= now() - interval '7 days'
    and group_current_cycle_settled(g.id);
end;
$$;

grant execute on function sync_group_archival(uuid) to authenticated;

create or replace function unarchive_group_on_activity()
returns trigger
language plpgsql
security definer
as $$
begin
  update groups set archived_at = null where id = new.group_id and archived_at is not null;
  return new;
end;
$$;

create trigger expenses_unarchive_group
  before insert on expenses
  for each row execute function unarchive_group_on_activity();

create trigger settlements_unarchive_group
  before insert on settlements
  for each row execute function unarchive_group_on_activity();
