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
  created_at timestamptz not null default now()
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
create policy "groups readable by members" on groups
  for select to authenticated using (is_group_member(id));
create policy "groups insertable by authenticated" on groups
  for insert to authenticated with check (created_by = auth.uid());

-- group_members
create policy "group_members readable by members" on group_members
  for select to authenticated using (is_group_member(group_id));
create policy "group_members insertable by members" on group_members
  for insert to authenticated with check (is_group_member(group_id) or user_id = auth.uid());
create policy "group_members deletable by self" on group_members
  for delete to authenticated using (user_id = auth.uid());

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
