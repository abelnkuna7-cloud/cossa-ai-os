# Cossa owner WhatsApp alerts

This Worker sends immediate **internal owner alerts** for real Supabase inserts.
It is deliberately not a customer-messaging system. CallMeBot is used only for
the already activated owner phone; Meta Cloud API will later handle approved
customer conversations and templates.

## Events covered

- `quote_requests` and `quotes`
- `inspection_bookings` and `appointments`
- `contact_messages`
- `leads`
- `chatbot_conversations` only when `qualified = true`

Every attempted delivery is recorded in `public.notification_deliveries`, with
the source table, record ID, idempotency key, status and provider response.

## Daily owner attention briefing

The Worker is configured to run at **08:00 SAST every day** (`0 6 * * *` in
Cloudflare's UTC-only cron format). It sends one audited CallMeBot WhatsApp
briefing based only on real Cossa records:

- leads created in the previous 24 hours;
- workforce missions awaiting owner approval;
- failed workforce runs in the previous 24 hours; and
- failed owner-alert deliveries in the previous 24 hours.

It also states plainly that social analytics and publishing have not been
checked until an authorised platform integration exists. A date-scoped
idempotency key prevents a second successful digest for the same South African
day; a failed delivery remains retryable.

After deployment, use Cloudflare's **Cron Triggers** view to confirm the
schedule and run one controlled scheduled-event test. Confirm both the WhatsApp
message and its `daily_attention_digest` row in `public.notification_deliveries`.
Do not use a customer phone or a public number for this test.

## Deploy once Cloudflare is available

From this directory, run:

```bash
npm install
npx wrangler login
npx wrangler kv namespace create ALERT_DEDUP
```

Copy the returned namespace ID into `wrangler.toml`. Then set secrets in the
Cloudflare dashboard or terminal. Never put their values in Git, a Vite
environment variable, browser code, Supabase table or chat message.

```bash
npx wrangler secret put ALERT_SHARED_SECRET
npx wrangler secret put CALLMEBOT_API_KEY
npx wrangler secret put CALLMEBOT_OWNER_PHONE
npx wrangler secret put COSSA_ORGANISATION_ID
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler deploy
```

`CALLMEBOT_OWNER_PHONE` is the already activated owner-alert number in E.164
digits only. It is not a public website number.

## Supabase Database Webhooks

For each production table listed above, create an `INSERT` Database Webhook in
Supabase pointing to:

```
https://cossa-owner-alerts.<your-cloudflare-workers-subdomain>/v1/supabase-alert
```

Add the header:

```
x-cossa-alert-secret: <the exact ALERT_SHARED_SECRET>
```

Create one webhook per table. Do not create update/delete alerts unless a
specific operational need is approved. After deployment, submit one safe test
lead and confirm one WhatsApp message plus one `notification_deliveries` row.