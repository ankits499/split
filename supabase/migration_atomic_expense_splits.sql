-- Fix: adding/editing an expense wrote the expense row and its
-- expense_splits rows as two (add) or three (edit: update + delete + insert)
-- separate client round-trips, not a transaction. If the process died
-- between calls (dropped connection, tab closed, validation error on the
-- second call), an edit could leave an expense with an updated amount but
-- zero splits, or an add could leave an expense with no splits at all —
-- silently breaking the "splits sum to total" invariant until someone
-- re-edited it, with the broken row invisible in every balance calc that
-- sums expense_splits.
--
-- upsert_expense_with_splits does the whole write in one Postgres
-- transaction (all-or-nothing) via a single RPC call. security invoker so
-- the existing RLS policies on expenses/expense_splits are enforced exactly
-- as before — this changes nothing about who can write what, only makes the
-- write atomic. Also rejects (as a belt-and-suspenders check; the client
-- already guarantees this) a split total that doesn't match the amount.
create or replace function upsert_expense_with_splits(
  p_id uuid,             -- null => insert a new expense; otherwise update this one
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_paid_by uuid,
  p_expense_date date,
  p_category text,
  p_created_by uuid,     -- only used when p_id is null
  p_edited_by uuid,      -- only used when p_id is not null
  p_splits jsonb         -- [{"user_id": "...", "share": 12.34}, ...]
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_split_total numeric;
begin
  select coalesce(sum((elem ->> 'share')::numeric), 0)
  into v_split_total
  from jsonb_array_elements(p_splits) elem;

  if abs(v_split_total - p_amount) > 0.01 then
    raise exception 'splits (%) do not sum to amount (%)', v_split_total, p_amount;
  end if;

  if p_id is null then
    insert into expenses (group_id, description, amount, paid_by, created_by, expense_date, category)
    values (p_group_id, p_description, p_amount, p_paid_by, p_created_by, p_expense_date, p_category)
    returning id into v_id;
  else
    update expenses set
      description = p_description,
      amount = p_amount,
      paid_by = p_paid_by,
      expense_date = p_expense_date,
      category = p_category,
      edited_at = now(),
      edited_by = p_edited_by
    where id = p_id
    returning id into v_id;

    if v_id is null then
      raise exception 'expense % not found or not permitted', p_id;
    end if;

    delete from expense_splits where expense_id = v_id;
  end if;

  insert into expense_splits (expense_id, user_id, share)
  select v_id, (elem ->> 'user_id')::uuid, (elem ->> 'share')::numeric
  from jsonb_array_elements(p_splits) elem;

  return v_id;
end;
$$;

grant execute on function upsert_expense_with_splits(
  uuid, uuid, text, numeric, uuid, date, text, uuid, uuid, jsonb
) to authenticated;
