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
