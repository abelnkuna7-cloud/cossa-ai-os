# Supplier evidence dedup repair

This change fixes repeated Supplier Registry evidence submissions without deleting audit history.

## Behaviour

- Exact duplicate verification-evidence rows are moved into a dedicated audit archive table before being removed from the operational evidence table.
- Astrum's incomplete source-less `official website` submissions from the incident are preserved in the audit archive and removed from the operational review list.
- A database-level unique index prevents identical evidence from being inserted again, including browser double-clicks, retries and replayed requests.
- Verified factual or independent evidence cannot be stored without a nonblank source reference.
- Supplier activation rules, products, pricing, stock, fulfilment, payment and publication logic are unchanged.

## Safety

The migration runs in one transaction. If any step fails, no partial cleanup is committed. The archived records preserve their original IDs, timestamps, classifications, outcomes, notes and reviewer fields for auditability.