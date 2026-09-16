# Status

Direct Product Manager and Workforce runtime wiring is implemented and passes the local legacy suite, digital-product tests, TypeScript check and production build. The Product Manager keeps its existing product, upload, deliverable, SKU, pricing, inventory, SEO, preflight and publication flows; intelligence is isolated to digital products. Existing Workforce employees are composed in place without duplicates.

Production remains blocked until the completed PR passes CI and the additive migration can be applied through an approved non-direct production migration process. The connected Supabase project currently exposes only its production database branch, and this repository has no deployment workflow that applies migrations. Do not merge merely to deploy the UI without its schema.

Continue on `upgrade/digital-product-intelligence-v1`; do not bypass the draft PR.
