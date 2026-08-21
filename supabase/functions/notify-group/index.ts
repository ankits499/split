import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// This repo is public, so the real values live only in the deployed
// function (set them here before deploying, from a password manager or
// `npx web-push generate-vapid-keys` for VAPID) — never commit real values
// over these placeholders. The deployed copy on Supabase has them filled
// in; this file is reference/reproducibility only. Rotate in all three
// places if ever needed: here, the DB trigger (schema.sql), and
// src/features/push/register.ts (VAPID public key only, which is safe to
// commit as-is).
const WEBHOOK_SECRET = "<WEBHOOK_SECRET — generated locally, live only in the deployed function/trigger, never committed>";
const VAPID_PUBLIC_KEY =
  "BDJZ7Z77MYr91xxZp9T2DZWPCQAp0gidqJ7kUU90duahhGS6nzlQ6PRBalM9Sa_z3Cqpi8_JjLCniEugJ5nVAx4";
const VAPID_PRIVATE_KEY = "<VAPID_PRIVATE_KEY — generated locally, live only in the deployed function, never committed>";

webpush.setVapidDetails(
  "mailto:techbytes.blr@outlook.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  const { table, event = "insert", record } = await req.json();

  let groupId: string;
  let actorId: string;
  let title: string;
  let body: string;

  if (table === "expenses") {
    const [{ data: group }, { data: payer }] = await Promise.all([
      supabase.from("groups").select("name").eq("id", record.group_id).single(),
      supabase.from("profiles").select("name").eq("id", record.paid_by).single(),
    ]);
    groupId = record.group_id;
    actorId = record.created_by;
    title = group?.name ?? "Split";
    body = event === "update"
      ? `${payer?.name ?? "Someone"} edited "${record.description}"`
      : `${payer?.name ?? "Someone"} added "${record.description}" — ${formatCurrency(Number(record.amount))}`;
  } else if (table === "settlements") {
    const [{ data: group }, { data: fromUser }, { data: toUser }] = await Promise.all([
      supabase.from("groups").select("name").eq("id", record.group_id).single(),
      supabase.from("profiles").select("name").eq("id", record.from_user).single(),
      supabase.from("profiles").select("name").eq("id", record.to_user).single(),
    ]);
    groupId = record.group_id;
    actorId = record.created_by;
    title = group?.name ?? "Split";
    body = `${fromUser?.name ?? "Someone"} settled ${formatCurrency(Number(record.amount))} with ${toUser?.name ?? "someone"}`;
  } else {
    return new Response("ignored", { status: 200 });
  }

  const { data: members, error: membersErr } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("user_id", actorId);
  if (membersErr) return new Response(membersErr.message, { status: 500 });
  if (!members || members.length === 0) return new Response("no recipients", { status: 200 });

  const { data: subs, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in(
      "user_id",
      members.map((m) => m.user_id),
    );
  if (subsErr) return new Response(subsErr.message, { status: 500 });
  if (!subs || subs.length === 0) return new Response("no subscriptions", { status: 200 });

  const payload = JSON.stringify({ title, body, url: `/split/groups/${groupId}` });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );

  return new Response("ok", { status: 200 });
});
