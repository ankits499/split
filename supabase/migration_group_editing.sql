-- Applied directly to the live project via Supabase MCP on 2026-08-19.
-- Included here so a fresh project (or another environment) can reach the
-- same state by running this file once. schema.sql already reflects this
-- as the default for new projects.

-- 1. Group rename support (previously no UPDATE policy existed for groups).
drop policy if exists "groups updatable by members" on groups;
create policy "groups updatable by members" on groups
  for update to authenticated using (is_group_member(id));

-- 2. Member removal by any group member, not just self-removal.
drop policy if exists "group_members deletable by self" on group_members;
drop policy if exists "group_members deletable by members" on group_members;
create policy "group_members deletable by members" on group_members
  for delete to authenticated using (is_group_member(group_id) or user_id = auth.uid());

-- 3. Fix: creating a group failed with "new row violates row-level security
--    policy for table groups" (42501). Root cause: useCreateGroup does
--    .insert({...}).select('id').single(), and that trailing SELECT needs
--    the groups SELECT policy to pass on the brand-new row — but the
--    creator isn't in group_members yet at that instant, so
--    is_group_member(id) was false. Same bootstrapping issue existed for
--    group_members' own SELECT policy.
drop policy if exists "groups readable by members" on groups;
create policy "groups readable by members" on groups
  for select to authenticated using (is_group_member(id) or created_by = auth.uid());

drop policy if exists "group_members readable by members" on group_members;
create policy "group_members readable by members" on group_members
  for select to authenticated using (is_group_member(group_id) or user_id = auth.uid());

-- 4. Delete a group entirely (creator only). expense_splits/expenses/
--    group_members/settlements all cascade via their existing FKs.
create policy "groups deletable by creator" on groups
  for delete to authenticated using (created_by = auth.uid());
