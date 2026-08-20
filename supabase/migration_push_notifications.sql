-- Applied directly to the live project via Supabase MCP.
-- Push notifications: group members get notified when an expense or
-- settlement is added, excluding whoever added it. See schema.sql for the
-- full, current-state definitions (same statements, kept here so an
-- existing project can catch up by running just this file).

alter table settlements add column created_by uuid not null references profiles (id);

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

create extension if not exists pg_net;

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
    body := jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(NEW))
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
