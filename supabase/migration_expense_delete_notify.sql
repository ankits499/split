-- Applied directly to the live project via Supabase MCP.
-- Soft-deleting an expense only touches deleted_at/deleted_by, so it never
-- matched expenses_notify_group_update's WHEN clause (schema.sql) — deletes
-- were silent by omission, not by design. This adds a dedicated delete
-- notification, mirroring notify_group_on_expense_update but firing only on
-- the null -> not-null transition of deleted_at (never re-fires, since a
-- soft-deleted expense's deleted_at doesn't change again).
create or replace function notify_group_on_expense_delete()
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
    body := jsonb_build_object('table', TG_TABLE_NAME, 'event', 'delete', 'record', to_jsonb(NEW))
  );
  return NEW;
end;
$$;

create trigger expenses_notify_group_delete
  after update on expenses
  for each row
  when (OLD.deleted_at is null and NEW.deleted_at is not null)
  execute function notify_group_on_expense_delete();
