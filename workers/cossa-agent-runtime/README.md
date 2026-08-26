# Cossa Agent Runtime Worker

This Worker wakes the protected Growth runtime every minute. It contains no provider keys, customer data, Supabase key or AI logic. Its only secret is `AGENT_RUNTIME_WORKER_TOKEN`, shared with the protected Growth server environment.

## What it enables

- The CEO can close the browser, switch off a laptop or lose local Wi-Fi.
- The Worker still invokes the hosted runtime, which leases durable tasks from Supabase.
- Research, enrichment, qualification, duplicate-protected CRM saves and outreach drafting continue independently.
- Draft approval never sends a message. No email, WhatsApp, payment, DNS, deployment or banking action is implemented here.

External services still need internet connectivity **from the hosted Worker/server**. Device independence does not mean offline access to Hunter, Firecrawl, model APIs, search engines or Supabase.

## Safe activation order

1. Apply `supabase/migrations/20260826000000_cossa_agent_runtime.sql`.
2. Set protected server variables in the Growth host: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_SITE_URL`, `AGENT_RUNTIME_WORKER_TOKEN`, and one or more model/search provider keys.
3. Deploy the Growth application.
4. Set the Cloudflare secret without placing it in a file: `npx wrangler secret put AGENT_RUNTIME_WORKER_TOKEN`.
5. Review the Worker URL in `wrangler.toml`, deploy it, then watch its observability logs.

Do not enable any customer-sending capability through this worker. A future delivery adapter requires a separate approved design, permission policy and owner approval flow.
