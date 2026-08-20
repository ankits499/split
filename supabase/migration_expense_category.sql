-- Applied directly to the live project via Supabase MCP.
-- Adds a category to each expense (food, groceries, transport, rent, ... see
-- src/utils/categories.ts for the fixed set of ids the app uses). Not
-- FK-enforced — the app treats it as a closed enum on the client side.
alter table expenses add column category text not null default 'other';
