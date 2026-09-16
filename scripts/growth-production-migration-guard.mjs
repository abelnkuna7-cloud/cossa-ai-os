#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export const RELEASE = Object.freeze({
  projectRef: "nptyyzyokzgnwnyteeyi",
  projectUrl: "https://nptyyzyokzgnwnyteeyi.supabase.co",
  environment: "growth-production",
  reviewer: "abelnkuna7-cloud",
  sourceCommit: "84cda377cfaa54bee3e675d9c0e7ee1e2bd99823",
  targetVersion: "20260916070000",
  targetFile: "20260916070000_add_digital_product_intelligence.sql",
  expectedSha256: "5bdcf89f7b218b6c6d106ffeec2117b3741fb6337a521209d326b51676c63140",
  baselineCount: 212,
  baselineHead: "20260916011537",
  storeProductsCount: 1895,
  digitalDeliverablesCount: 67,
  cliVersion: "2.117.0",
});

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) fail(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function requireOption(options, name) {
  const value = options[name];
  if (!value) fail(`Missing --${name}`);
  return value;
}

function assertReleaseInputs(options) {
  const sourceCommit = requireOption(options, "source-commit");
  const expectedSha256 = requireOption(options, "expected-sha256");
  if (sourceCommit !== RELEASE.sourceCommit) {
    fail(`Source commit must be ${RELEASE.sourceCommit}; received ${sourceCommit}`);
  }
  if (expectedSha256 !== RELEASE.expectedSha256) {
    fail(`Expected SHA-256 must be ${RELEASE.expectedSha256}; received ${expectedSha256}`);
  }
}

function assertStaticMigration(sql) {
  const required = [
    /create table if not exists public\.store_digital_product_intelligence/i,
    /alter table public\.store_digital_product_intelligence enable row level security/i,
    /create or replace function public\.score_store_digital_product_readiness\(p_product_id uuid\)/i,
    /security invoker/i,
    /revoke all on table public\.store_digital_product_intelligence from anon/i,
    /revoke execute on function public\.score_store_digital_product_readiness\(uuid\) from public, anon/i,
  ];
  for (const pattern of required) {
    if (!pattern.test(sql))
      fail(`Target migration is missing required safety statement: ${pattern}`);
  }

  const destructive = [
    /\bdrop\s+(?:table|schema|database)\b/i,
    /\btruncate\b/i,
    /\bdelete\s+from\b/i,
    /\balter\s+table\b[^;]*\bdisable\s+row\s+level\s+security\b/i,
  ];
  for (const pattern of destructive) {
    if (pattern.test(sql)) fail(`Target migration contains prohibited destructive SQL: ${pattern}`);
  }

  const nonTransactional = [
    /\bcreate\s+(?:unique\s+)?index\s+concurrently\b/i,
    /\breindex\b[^;]*\bconcurrently\b/i,
    /\bvacuum\b/i,
    /\balter\s+system\b/i,
    /\bcluster\b/i,
  ];
  for (const pattern of nonTransactional) {
    if (pattern.test(sql))
      fail(`Target migration contains a pipeline-incompatible statement: ${pattern}`);
  }
}

function verifySource(options) {
  assertReleaseInputs(options);
  const sourceRoot = resolve(requireOption(options, "source-root"));
  const targetPath = join(sourceRoot, "supabase", "migrations", RELEASE.targetFile);
  const checkedOutCommit = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  if (checkedOutCommit !== RELEASE.sourceCommit) {
    fail(`Checked-out source is ${checkedOutCommit}, expected ${RELEASE.sourceCommit}`);
  }
  const actualHash = sha256(targetPath);
  if (actualHash !== RELEASE.expectedSha256) {
    fail(`Target migration SHA-256 is ${actualHash}, expected ${RELEASE.expectedSha256}`);
  }
  assertStaticMigration(readFileSync(targetPath, "utf8"));

  if (options["hash-output"]) {
    writeFileSync(resolve(options["hash-output"]), `${actualHash}  ${RELEASE.targetFile}\n`, {
      mode: 0o600,
    });
  }
}

function migrationRows(path) {
  const payload = readJson(path);
  if (!Array.isArray(payload.migrations)) fail(`${path} has no migrations array`);
  return payload.migrations;
}

function partitionRows(rows) {
  return {
    matched: rows.filter((row) => row.local && row.remote),
    localOnly: rows.filter((row) => row.local && !row.remote),
    remoteOnly: rows.filter((row) => !row.local && row.remote),
    invalid: rows.filter((row) => !row.local && !row.remote),
  };
}

function verifyMigrationList(options) {
  const phase = requireOption(options, "phase");
  const rows = migrationRows(resolve(requireOption(options, "file")));
  const groups = partitionRows(rows);
  if (groups.invalid.length) fail("Migration list contains an empty local/remote row");

  if (phase === "baseline") {
    if (rows.length !== RELEASE.baselineCount || groups.matched.length !== RELEASE.baselineCount) {
      fail(
        `Baseline must be ${RELEASE.baselineCount}/${RELEASE.baselineCount}; got ${groups.matched.length}/${rows.length}`,
      );
    }
    if (groups.localOnly.length || groups.remoteOnly.length) {
      fail("Fetched baseline does not exactly match the complete remote ledger");
    }
    const remoteVersions = rows.map((row) => row.remote);
    if (remoteVersions.at(-1) !== RELEASE.baselineHead) {
      fail(`Remote ledger head must be ${RELEASE.baselineHead}; got ${remoteVersions.at(-1)}`);
    }
    if (remoteVersions.includes(RELEASE.targetVersion))
      fail("Target migration is already recorded remotely");
    return;
  }

  if (phase === "release") {
    if (groups.matched.length !== RELEASE.baselineCount || groups.remoteOnly.length) {
      fail("Release bundle no longer contains the exact reconstructed baseline");
    }
    const pending = groups.localOnly.map((row) => row.local);
    if (pending.length !== 1 || pending[0] !== RELEASE.targetVersion) {
      fail(
        `Exactly one local-only migration is required: ${RELEASE.targetVersion}; got ${pending.join(", ") || "none"}`,
      );
    }
    return;
  }

  if (phase === "post") {
    const expected = RELEASE.baselineCount + 1;
    if (rows.length !== expected || groups.matched.length !== expected) {
      fail(
        `Post-deployment ledger must be ${expected}/${expected}; got ${groups.matched.length}/${rows.length}`,
      );
    }
    if (groups.localOnly.length || groups.remoteOnly.length)
      fail("Post-deployment ledger is not reconciled");
    const target = rows.find((row) => row.local === RELEASE.targetVersion);
    if (!target || target.remote !== RELEASE.targetVersion)
      fail("Target migration is not recorded remotely");
    return;
  }

  fail(`Unknown migration-list phase: ${phase}`);
}

function verifyLedgerEquality(options) {
  const approvedFile = resolve(requireOption(options, "approved-file"));
  const currentFile = resolve(requireOption(options, "current-file"));
  verifyMigrationList({ phase: "baseline", file: approvedFile });
  verifyMigrationList({ phase: "baseline", file: currentFile });

  const approved = migrationRows(approvedFile).map((row) => row.local);
  const current = migrationRows(currentFile).map((row) => row.local);
  if (JSON.stringify(current) !== JSON.stringify(approved)) {
    fail("Current production migration ledger differs from the approved validation baseline");
  }
}

function verifyPushResult(options) {
  const phase = requireOption(options, "phase");
  const payload = readJson(resolve(requireOption(options, "file")));
  const expectedDryRun = phase === "dry-run";
  if (phase !== "dry-run" && phase !== "apply") fail(`Unknown push phase: ${phase}`);
  if (payload.dryRun !== expectedDryRun) fail(`Unexpected dryRun=${payload.dryRun}`);
  if (payload.upToDate !== false)
    fail("Push result must report exactly one pending/applied migration");
  if (JSON.stringify(payload.migrations) !== JSON.stringify([RELEASE.targetFile])) {
    fail(`Push result must contain only ${RELEASE.targetFile}`);
  }
  if (!Array.isArray(payload.roles) || payload.roles.length !== 0)
    fail("Roles must not be included");
  if (!Array.isArray(payload.seeds) || payload.seeds.length !== 0)
    fail("Seeds must not be included");
}

function verifyEnvironment(options) {
  const environment = readJson(resolve(requireOption(options, "environment-file")));
  const branches = readJson(resolve(requireOption(options, "branch-file")));
  if (environment.name !== RELEASE.environment) fail(`Expected Environment ${RELEASE.environment}`);
  const reviewerRule = environment.protection_rules?.find(
    (rule) => rule.type === "required_reviewers",
  );
  if (!reviewerRule) fail("Growth production Environment has no required-reviewer protection rule");
  const reviewers = (reviewerRule.reviewers ?? [])
    .map((entry) => entry.reviewer?.login)
    .filter(Boolean);
  if (reviewers.length !== 1 || reviewers[0] !== RELEASE.reviewer) {
    fail(
      `Required reviewers must be exactly ${RELEASE.reviewer}; got ${reviewers.join(", ") || "none"}`,
    );
  }
  if (reviewerRule.prevent_self_review !== false) {
    fail(
      "Growth production Environment must allow the sole required reviewer to approve their own dispatch",
    );
  }
  if (environment.can_admins_bypass !== false) {
    fail("Growth production Environment must not allow administrator bypass");
  }
  if (environment.deployment_branch_policy?.custom_branch_policies !== true) {
    fail("Growth production Environment must use selected deployment branches");
  }
  if (environment.deployment_branch_policy?.protected_branches !== false) {
    fail("Growth production Environment must use only its explicit custom branch policy");
  }
  const policies = branches.branch_policies ?? [];
  if (policies.length !== 1 || policies[0]?.name !== "main" || policies[0]?.type !== "branch") {
    fail("Growth production Environment must allow only the main branch");
  }
}

async function requestCount(table, serviceRoleKey) {
  const headers = {
    apikey: serviceRoleKey,
    Prefer: "count=exact",
    Range: "0-0",
  };
  if (serviceRoleKey.split(".").length === 3) headers.Authorization = `Bearer ${serviceRoleKey}`;
  const response = await fetch(`${RELEASE.projectUrl}/rest/v1/${table}?select=id&limit=1`, {
    headers,
  });
  if (!response.ok) fail(`Read-only count for ${table} failed with HTTP ${response.status}`);
  const contentRange = response.headers.get("content-range") ?? "";
  const match = contentRange.match(/\/(\d+)$/);
  if (!match) fail(`Read-only count for ${table} returned no exact Content-Range`);
  return Number(match[1]);
}

async function tableStatus(table, apiKey, bearer = false) {
  const headers = { apikey: apiKey, Range: "0-0" };
  if (bearer && apiKey.split(".").length === 3) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(`${RELEASE.projectUrl}/rest/v1/${table}?select=id&limit=1`, {
    headers,
  });
  await response.body?.cancel();
  return response.status;
}

async function snapshotData(options) {
  const phase = requireOption(options, "phase");
  const output = resolve(requireOption(options, "output"));
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) fail("SUPABASE_SERVICE_ROLE_KEY is required");
  const storeProducts = await requestCount("store_products", serviceRoleKey);
  const digitalDeliverables = await requestCount(
    "store_product_digital_deliverables",
    serviceRoleKey,
  );

  if (phase === "pre") {
    const targetStatus = await tableStatus(
      "store_digital_product_intelligence",
      serviceRoleKey,
      true,
    );
    if (targetStatus !== 404)
      fail(`Target table must be absent before deployment; HTTP status was ${targetStatus}`);
    if (
      storeProducts !== RELEASE.storeProductsCount ||
      digitalDeliverables !== RELEASE.digitalDeliverablesCount
    ) {
      fail(
        `Production counts drifted before deployment: store_products=${storeProducts}, deliverables=${digitalDeliverables}. Investigate; do not force counts.`,
      );
    }
    writeJson(output, {
      phase,
      storeProducts,
      digitalDeliverables,
      targetTableHttpStatus: targetStatus,
    });
    return;
  }

  if (phase === "post") {
    const before = readJson(resolve(requireOption(options, "before")));
    const intelligenceRows = await requestCount(
      "store_digital_product_intelligence",
      serviceRoleKey,
    );
    if (intelligenceRows !== 0)
      fail(`Intelligence table must initially contain 0 rows; got ${intelligenceRows}`);
    if (
      storeProducts !== before.storeProducts ||
      digitalDeliverables !== before.digitalDeliverables
    ) {
      fail(
        `Production counts changed during deployment: store_products ${before.storeProducts}->${storeProducts}, deliverables ${before.digitalDeliverables}->${digitalDeliverables}. Investigate without modifying data.`,
      );
    }
    const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!publishableKey) fail("SUPABASE_PUBLISHABLE_KEY is required");
    const anonymousStatus = await tableStatus(
      "store_digital_product_intelligence",
      publishableKey,
      false,
    );
    if (![401, 403].includes(anonymousStatus)) {
      fail(`Anonymous table access must be denied; HTTP status was ${anonymousStatus}`);
    }
    writeJson(output, {
      phase,
      storeProducts,
      digitalDeliverables,
      intelligenceRows,
      anonymousAccessHttpStatus: anonymousStatus,
    });
    return;
  }

  fail(`Unknown data snapshot phase: ${phase}`);
}

function verifyTypes(options) {
  const types = readFileSync(resolve(requireOption(options, "file")), "utf8");
  if (!/store_digital_product_intelligence:\s*\{/m.test(types))
    fail("Generated types do not contain the intelligence table");
  if (!/score_store_digital_product_readiness:\s*\{/m.test(types))
    fail("Generated types do not contain the readiness function");
  if (options.output) {
    writeJson(resolve(options.output), {
      tablePresent: true,
      readinessFunctionPresent: true,
      generatedTypesStored: false,
    });
  }
}

function verifyValidationRun(options) {
  const run = readJson(resolve(requireOption(options, "file")));
  const expectedRunId = requireOption(options, "run-id");
  const workflowSha = requireOption(options, "workflow-sha");
  if (String(run.id) !== expectedRunId) fail(`Validation run ID mismatch: ${run.id}`);
  if (run.name !== "Validate Growth production migration")
    fail(`Unexpected validation workflow: ${run.name}`);
  if (
    run.event !== "workflow_dispatch" ||
    run.status !== "completed" ||
    run.conclusion !== "success"
  ) {
    fail("Approved validation run must be a successful completed manual dispatch");
  }
  if (run.repository?.full_name !== "abelnkuna7-cloud/cossa-ai-os")
    fail("Validation run belongs to the wrong repository");
  if (run.path !== ".github/workflows/growth-production-migration-validate.yml") {
    fail(`Validation run used an unexpected workflow path: ${run.path ?? "missing"}`);
  }
  if (run.head_branch !== "main")
    fail(`Validation run must execute from main; got ${run.head_branch}`);
  if (run.head_sha !== workflowSha) {
    fail(`Validation run must use infrastructure commit ${workflowSha}; got ${run.head_sha}`);
  }
  if (!Number.isInteger(run.run_attempt) || run.run_attempt < 1)
    fail("Validation run has an invalid run attempt");
}

function verifyValidationEvidence(options) {
  const root = resolve(requireOption(options, "root"));
  const runId = requireOption(options, "run-id");
  const runAttempt = requireOption(options, "run-attempt");
  const workflowSha = requireOption(options, "workflow-sha");
  const metadata = readJson(join(root, "release-metadata.json"));
  if (
    metadata.projectRef !== RELEASE.projectRef ||
    metadata.environment !== RELEASE.environment ||
    metadata.sourceCommit !== RELEASE.sourceCommit ||
    metadata.targetMigration !== RELEASE.targetFile ||
    metadata.expectedSha256 !== RELEASE.expectedSha256 ||
    metadata.supabaseCliVersion !== RELEASE.cliVersion ||
    metadata.operation !== "validation" ||
    String(metadata.runId) !== runId ||
    String(metadata.runAttempt) !== runAttempt ||
    metadata.workflowSha !== workflowSha
  ) {
    fail("Validation artifact metadata does not match the approved release");
  }
  verifyMigrationList({ phase: "baseline", file: join(root, "migration-list-baseline.json") });
  verifyMigrationList({ phase: "release", file: join(root, "migration-list-release.json") });
  verifyPushResult({ phase: "dry-run", file: join(root, "db-push-dry-run.json") });
  const counts = readJson(join(root, "production-data-before.json"));
  if (
    counts.storeProducts !== RELEASE.storeProductsCount ||
    counts.digitalDeliverables !== RELEASE.digitalDeliverablesCount ||
    counts.targetTableHttpStatus !== 404
  ) {
    fail("Validation artifact contains unexpected production data state");
  }
}

function writeMetadata(options) {
  const output = resolve(requireOption(options, "output"));
  const cliVersion = requireOption(options, "cli-version");
  if (cliVersion !== RELEASE.cliVersion)
    fail(`Supabase CLI must be ${RELEASE.cliVersion}; got ${cliVersion}`);
  writeJson(output, {
    projectRef: RELEASE.projectRef,
    environment: RELEASE.environment,
    sourceCommit: RELEASE.sourceCommit,
    targetMigration: RELEASE.targetFile,
    targetVersion: RELEASE.targetVersion,
    expectedSha256: RELEASE.expectedSha256,
    expectedBaselineCount: RELEASE.baselineCount,
    expectedBaselineHead: RELEASE.baselineHead,
    supabaseCliVersion: cliVersion,
    workflowSha: options["workflow-sha"] ?? null,
    runId: options["run-id"] ?? null,
    runAttempt: options["run-attempt"] ?? null,
    operation: options.operation ?? null,
    generatedAt: new Date().toISOString(),
  });
}

function writePostProof(options) {
  const list = migrationRows(resolve(requireOption(options, "list-file")));
  const snapshot = readJson(resolve(requireOption(options, "snapshot-file")));
  const types = readJson(resolve(requireOption(options, "types-proof-file")));
  writeJson(resolve(requireOption(options, "output")), {
    targetMigrationRecorded: list.some(
      (row) => row.local === RELEASE.targetVersion && row.remote === RELEASE.targetVersion,
    ),
    tablePresent: types.tablePresent === true,
    readinessFunctionPresent: types.readinessFunctionPresent === true,
    rlsEnabledProof: {
      exactMigrationHashVerified: true,
      enableRlsStatementVerified: true,
      transactionCompatibleMigrationVerified: true,
      migrationRecordedAfterSuccessfulApply: true,
    },
    anonymousAccessDenied: [401, 403].includes(snapshot.anonymousAccessHttpStatus),
    intelligenceRows: snapshot.intelligenceRows,
    storeProducts: snapshot.storeProducts,
    digitalDeliverables: snapshot.digitalDeliverables,
    rollbackAttempted: false,
  });
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  switch (command) {
    case "verify-source":
      verifySource(options);
      break;
    case "verify-list":
      verifyMigrationList(options);
      break;
    case "verify-ledger-equality":
      verifyLedgerEquality(options);
      break;
    case "verify-push":
      verifyPushResult(options);
      break;
    case "verify-environment":
      verifyEnvironment(options);
      break;
    case "snapshot-data":
      await snapshotData(options);
      break;
    case "verify-types":
      verifyTypes(options);
      break;
    case "verify-validation-run":
      verifyValidationRun(options);
      break;
    case "verify-validation-evidence":
      verifyValidationEvidence(options);
      break;
    case "metadata":
      writeMetadata(options);
      break;
    case "post-proof":
      writePostProof(options);
      break;
    default:
      fail(`Unknown command: ${command ?? "(missing)"}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
