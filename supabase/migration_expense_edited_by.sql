-- Applied directly to the live project via Supabase MCP.
-- Pairs with edited_at: records who last edited an expense so the Activity
-- feed can attribute edits ("X edited") the same way it attributes adds.
alter table expenses add column edited_by uuid null references profiles (id);
