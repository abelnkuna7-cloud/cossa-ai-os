# Growth production migration runbook

This release-specific mechanism deploys one migration to the existing Growth production project without reconciling or rewriting the repository's drifted migration history.

## Immutable release identity

| Item                          | Required value                                                     |
| ----------------------------- | ------------------------------------------------------------------ |
| Repository                    | `abelnkuna7-cloud/cossa-ai-os`                                     |
| Supabase project              | `cossa-growth`                                                     |
| Project ref                   | `nptyyzyokzgnwnyteeyi`                                             |
| Product Manager source commit | `84cda377cfaa54bee3e675d9c0e7ee1e2bd99823`                         |
| Migration                     | `20260916070000_add_digital_product_intelligence.sql`              |
| SHA-256                       | `5bdcf89f7b218b6c6d106ffeec2117b3741fb6337a521209d326b51676c63140` |
| Supabase CLI                  | `2.117.0`                                                          |
| Expected production ledger    | 212 versions; head `20260916011537`                                |

The workflows reject any different commit, hash, migration version, ledger count, or ledger head.

## Required GitHub Environment

Create and configure a repository Environment named `growth-production` before merging this infrastructure PR. Merely referencing a missing Environment would make GitHub create an unprotected Environment, so the workflows also query GitHub's API and fail before Supabase access unless these controls are present:

- required reviewer includes `abelnkuna7-cloud`;
- deployment branches use a single custom branch rule: branch `main`;
- administrators are not allowed to bypass protection rules;
- Environment variable `GROWTH_PRODUCTION_APPROVAL_GATE` is exactly `required-reviewer-v1`;
- Environment secrets, not repository secrets:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_PUBLISHABLE_KEY`

If `abelnkuna7-cloud` is the only eligible reviewer, leave **Prevent self-review** disabled; GitHub otherwise makes the sole-reviewer gate impossible to approve. The approval remains a deliberate manual action. Add another trusted CEO-approved reviewer before enabling self-review prevention.

Do not put any credential in workflow inputs, repository files, logs, or artifacts.

## Workflow sequence

### 1. Static checks

`Check Growth migration infrastructure` runs without production credentials. It verifies the guard tests, immutable source/hash, pinned CLI version, required CLI flags and all workflow expressions with a SHA-256-verified actionlint binary. It fails closed unless the required reviewer, disabled administrator bypass and `main`-only Environment branch policy are present. Every external action is referenced by a full commit SHA.

### 2. Read-only validation dispatch

Manually dispatch `Validate Growth production migration` from `main` with the immutable commit and SHA-256 above. The `growth-production` approval gate must pass before Environment secrets become available.

Validation performs only these remote operations:

1. Reads GitHub Environment configuration.
2. Fetches the complete Supabase migration ledger into a fresh runner-only directory.
3. Requires a 212/212 local/remote match before adding the target file.
4. Adds only the target migration to that isolated directory.
5. Requires exactly one local-only version: `20260916070000`.
6. Runs `supabase db push --dry-run --skip-vault` without `--include-all`, roles, or seeds.
7. Requires the structured dry-run result to name exactly the target migration.
8. Reads production counts through the Data API and requires the target table to be absent, `store_products` to be 1,892, and digital deliverables to be 67. The previous 1,895-product baseline was reduced by three products that the CEO confirmed were deliberately deleted through the existing Product Manager before validation; no digital deliverables were removed.

`migration fetch` writes only the isolated runner filesystem. `migration list`, the Data API requests and `db push --dry-run` are read-only for this already-provisioned production ledger. Validation never runs a non-dry-run push.

Save the successful validation workflow run ID for the execution dispatch. The audit artifact contains the migration lists, source/hash, CLI version, dry-run result, sanitized counts and GitHub Environment configuration. It contains no credentials and expires after 30 days.

### 3. Separate execution dispatch

Do not dispatch execution without CEO approval. `Execute Growth production migration` requires:

- the successful validation run ID;
- the same source commit and expected SHA-256;
- exact confirmation text `APPLY 20260916070000 TO nptyyzyokzgnwnyteeyi`.

The execution workflow accepts only the exact artifact from the successful validation run attempt and requires the validation and execution dispatches to use the same infrastructure commit. It compares every migration version in each newly reconstructed baseline with that artifact during both execution preflight and the apply job. If `main` or any production migration-history version moves after validation, validation must be rerun; evidence from a different workflow commit or retry attempt is rejected.

The execution workflow has two `growth-production` jobs:

1. `preflight` verifies and downloads the named successful validation artifact, then reconstructs the ledger and reruns every source, hash, history, pending-migration, dry-run and count check without mutation.
2. `apply` requires the Environment gate again, constructs another fresh isolated bundle, and repeats every gate immediately before the non-dry-run command.

The only mutating command is:

```sh
supabase db push --linked --project-ref nptyyzyokzgnwnyteeyi \
  --workdir "$RELEASE_ROOT" --skip-vault --yes --output-format json
```

It intentionally omits `--include-all`, `--include-roles` and `--include-seed`. It does not run `supabase link`, migration repair, database reset, direct SQL, seed data, Vault synchronization or a repository-directory push.

## Post-deployment proof

After a successful push, the same job:

- requires a reconciled 213/213 migration list with `20260916070000` recorded remotely;
- generates public-schema TypeScript types and confirms the intelligence table and readiness function exist, without storing the full generated schema in the artifact;
- requires `store_digital_product_intelligence` to contain zero rows;
- requires `store_products` and digital-deliverable counts to equal the values captured immediately before the push;
- sends an anonymous Data API request and requires HTTP 401 or 403;
- records a proof chain for RLS: exact migration hash, verified `ENABLE ROW LEVEL SECURITY` statement, absence of CLI pipeline-incompatible statements, and a remote migration record written only after successful transactional application.

If any post-deployment check fails, the workflow stops and uploads the available redacted evidence. It never attempts an automatic rollback or changes data to force expected counts.

## Exact production impact

The target migration is additive. On an unchanged database it will:

- create `public.store_digital_product_intelligence` with zero rows;
- create two indexes for organisation and subtype lookup;
- enable RLS and create one authenticated owner/admin policy scoped through the parent product organisation;
- revoke anonymous table access and grant authenticated CRUD subject to RLS;
- create the stable, security-invoker function `public.score_store_digital_product_readiness(uuid)`;
- revoke public/anonymous execution and grant authenticated execution.

It does not update or delete `store_products`, digital deliverables, Workforce data, payment data, supplier data, publication state, Vault values or migration-history rows other than recording the one successfully applied target version.

If production counts or the migration ledger differ from the immutable validation baseline, stop and investigate legitimate concurrent activity. Never repair history or modify production data merely to make a gate pass.
