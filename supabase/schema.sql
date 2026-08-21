-- Split: Supabase schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

-- Profiles: one row per authenticated user, created on signup via trigger.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table group_members (
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_by uuid not null references profiles (id),
  created_by uuid not null references profiles (id),
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  -- one of the ids in src/utils/categories.ts (not FK-enforced; app-level enum)
  category text not null default 'other',
  -- set by the client on update; null until first edit
  edited_at timestamptz null,
  edited_by uuid null references profiles (id)
);

-- One row per (expense, member) recording that member's owed share.
create table expense_splits (
  expense_id uuid not null references expenses (id) on delete cascade,
  user_id uuid not null references profiles (id),
  share numeric(12, 2) not null check (share >= 0),
  primary key (expense_id, user_id)
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  from_user uuid not null references profiles (id),
  to_user uuid not null references profiles (id),
  amount numeric(12, 2) not null check (amount > 0),
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
-- Model: a user can only see/write data for groups they belong to.

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;

create or replace function is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- profiles: any authenticated user can read all profiles (needed to show
-- member names); a user can only update their own row.
create policy "profiles readable by authenticated" on profiles
  for select to authenticated using (true);
create policy "profiles updatable by owner" on profiles
  for update to authenticated using (id = auth.uid());
create policy "profiles insertable by owner" on profiles
  for insert to authenticated with check (id = auth.uid());

-- groups
-- "or created_by = auth.uid()" is required so a freshly-created group is
-- readable by its creator before the group_members row for them exists yet
-- (the insert + the .select() PostgREST does to return the new row happen
-- before the creator's own membership row is inserted).
create policy "groups readable by members" on groups
  for select to authenticated using (is_group_member(id) or created_by = auth.uid());
create policy "groups insertable by authenticated" on groups
  for insert to authenticated with check (created_by = auth.uid());
create policy "groups updatable by members" on groups
  for update to authenticated using (is_group_member(id));
create policy "groups deletable by creator" on groups
  for delete to authenticated using (created_by = auth.uid());

-- group_members
-- "or user_id = auth.uid()" avoids the same bootstrapping problem: reading
-- back your own just-inserted membership row shouldn't depend on
-- is_group_member(), which queries this same table.
create policy "group_members readable by members" on group_members
  for select to authenticated using (is_group_member(group_id) or user_id = auth.uid());
create policy "group_members insertable by members" on group_members
  for insert to authenticated with check (is_group_member(group_id) or user_id = auth.uid());
create policy "group_members deletable by members" on group_members
  for delete to authenticated using (is_group_member(group_id) or user_id = auth.uid());

-- expenses
create policy "expenses readable by members" on expenses
  for select to authenticated using (is_group_member(group_id));
create policy "expenses insertable by members" on expenses
  for insert to authenticated with check (is_group_member(group_id) and created_by = auth.uid());
create policy "expenses updatable by members" on expenses
  for update to authenticated using (is_group_member(group_id));
create policy "expenses deletable by members" on expenses
  for delete to authenticated using (is_group_member(group_id));

-- expense_splits (readable/writable via the parent expense's group)
create policy "expense_splits readable by members" on expense_splits
  for select to authenticated using (
    exists (select 1 from expenses e where e.id = expense_id and is_group_member(e.group_id))
  );
create policy "expense_splits insertable by members" on expense_splits
  for insert to authenticated with check (
    exists (select 1 from expenses e where e.id = expense_id and is_group_member(e.group_id))
  );
create policy "expense_splits deletable by members" on expense_splits
  for delete to authenticated using (
    exists (select 1 from expenses e where e.id = expense_id and is_group_member(e.group_id))
  );

-- settlements
create policy "settlements readable by members" on settlements
  for select to authenticated using (is_group_member(group_id));
create policy "settlements insertable by members" on settlements
  for insert to authenticated with check (is_group_member(group_id));

-- ---------- Dashboard balance aggregation ----------
-- Per-group net balance for a user, computed via SQL aggregation instead of
-- pulling every expense/split/settlement row to the client and summing in
-- JS. Scales as O(groups the user is in), not O(their lifetime transaction
-- count).
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

-- ---------- New-user profile bootstrap ----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Push notifications ----------
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions manage own" on push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- The notify-group edge function reads across users with the service role,
-- which bypasses RLS entirely, so no separate policy is needed for it.

create extension if not exists pg_net;

-- Fires the notify-group Edge Function whenever a new expense or settlement
-- is inserted, so group members get a push notification. Runs async via
-- pg_net (fire-and-forget: never blocks or fails the insert itself). The
-- URL and shared secret below match this project's deployed function —
-- update them if you redeploy notify-group under a different secret.
create or replace function notify_group_on_insert()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://mveecfqanpurlacwvobw.supabase.co/functions/v1/notify-group',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<WEBHOOK_SECRET — generated locally, live only in the deployed function/trigger, never committed>'
    ),
    body := jsonb_build_object('table', TG_TABLE_NAME, 'event', 'insert', 'record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

create trigger expenses_notify_group
  after insert on expenses
  for each row execute function notify_group_on_insert();

create trigger settlements_notify_group
  after insert on settlements
  for each row execute function notify_group_on_insert();

-- Fires notify-group on a substantive edit to an expense (not on every
-- column touch — the WHEN clause skips no-op saves and unrelated column
-- changes like edited_at itself) so group members get an "edited" push.
create or replace function notify_group_on_expense_update()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://mveecfqanpurlacwvobw.supabase.co/functions/v1/notify-group',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '<WEBHOOK_SECRET — generated locally, live only in the deployed function/trigger, never committed>'
    ),
    body := jsonb_build_object('table', TG_TABLE_NAME, 'event', 'update', 'record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

create trigger expenses_notify_group_update
  after update on expenses
  for each row
  when (
    OLD.description is distinct from NEW.description
    or OLD.amount is distinct from NEW.amount
    or OLD.paid_by is distinct from NEW.paid_by
    or OLD.expense_date is distinct from NEW.expense_date
    or OLD.category is distinct from NEW.category
  )
  execute function notify_group_on_expense_update();
