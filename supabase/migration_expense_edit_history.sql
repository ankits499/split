-- Applied directly to the live project via Supabase MCP.
-- Tracks who deleted an expense (deleted_at already existed, deleted_by did
-- not) and logs every field-level change made on edit, so the UI can show
-- both attribution ("deleted by", "edited by") and a full old -> new value
-- history per expense, not just the latest edit.
alter table expenses add column deleted_by uuid null references profiles (id);

create table expense_edits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses (id) on delete cascade,
  changed_by uuid not null references profiles (id),
  changed_at timestamptz not null default now(),
  field text not null,
  old_value text,
  new_value text
);

alter table expense_edits enable row level security;

-- Append-only log: readable/insertable by group members via the parent
-- expense's group, same pattern as expense_splits. No update/delete policy
-- — edits are never revised or removed once logged.
create policy "expense_edits readable by members" on expense_edits
  for select to authenticated using (
    exists (select 1 from expenses e where e.id = expense_id and is_group_member(e.group_id))
  );
create policy "expense_edits insertable by members" on expense_edits
  for insert to authenticated with check (
    exists (select 1 from expenses e where e.id = expense_id and is_group_member(e.group_id))
  );
