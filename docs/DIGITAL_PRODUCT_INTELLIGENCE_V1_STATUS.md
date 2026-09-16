# Status

Implemented on upgrade branch:
- additive digital intelligence persistence migration
- subtype catalogue and labels
- evidence-aware subtype inference
- subtype-specific metadata readiness
- draft-aware selling-price diagnostic helper
- Product Intelligence and Store Operations additive capability definitions
- unit/regression acceptance tests

Still required before production:
- wire controls into existing Product Manager route
- wire profile reads/writes to Product Manager
- compose capability additions into existing workforce runtime
- run repository build/test CI
- verify PR mergeability and migration path

No production deployment should occur before these gates pass. This status file exists to prevent a helper-only implementation from being mistaken for a finished production feature.

Safety invariant: no existing product type, product row, deliverable, worker, publication control or production data is removed by this upgrade.

CEO instruction: continue the implementation through the gates above and push only after verification; do not bypass a failed gate merely to deploy faster.

Target acceptance product: the existing Cossa Store children's storybook/eBook scenario, followed by representative course and software drafts.

Rollback principle: application changes remain branch/commit reversible; database changes are additive and must not require destructive rollback of existing catalogue records.

Current branch remains intentionally non-production until live Product Manager and Workforce wiring is complete.

Next implementation target: existing `src/routes/businesses.store-products.tsx` and existing workforce runtime definitions; extend in place, do not replace.

PR remains draft until build/test and integration gates are satisfied.

Do not mark READY based on documentation or helper modules; verify user-visible Product Manager behavior.

No production merge has been authorized before those technical gates pass.

This upgrade must remain compatible with the existing secure multi-file digital customer package.

Deployment target remains the existing Growth production pipeline; do not create a separate app or project.

No extra production build attempts should be used until the branch is actually release-ready.

When release-ready, merge once and verify the existing production routes rather than creating deployment-only commits.
