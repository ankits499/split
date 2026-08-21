-- Applied directly to the live project via Supabase MCP.
-- Tracks when an expense was last edited (set by the client on update, null
-- until then) so the UI can show an "Edited" badge and the notify-group
-- trigger can send an edit notification distinct from the add notification.
alter table expenses add column edited_at timestamptz null;

-- Update the insert-notification trigger fn to tag its payload with an
-- explicit event type, and add a matching update-notification trigger fn +
-- trigger so edits to an expense's user-facing fields also notify the group.
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
