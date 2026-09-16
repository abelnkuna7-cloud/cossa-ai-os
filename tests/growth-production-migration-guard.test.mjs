import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { main, RELEASE } from "../scripts/growth-production-migration-guard.mjs";

function tempFile(name, value) {
  const root = mkdtempSync(join(tmpdir(), "growth-migration-guard-"));
  const path = join(root, name);
  writeFileSync(path, `${JSON.stringify(value)}\n`);
  return path;
}

function baselineRows() {
  const rows = Array.from({ length: RELEASE.baselineCount - 1 }, (_, index) => {
    const version = String(index + 1).padStart(14, "0");
    return { local: version, remote: version, time: "" };
  });
  rows.push({ local: RELEASE.baselineHead, remote: RELEASE.baselineHead, time: "" });
  return rows;
}

test("pins the CEO-confirmed production data baseline", () => {
  assert.equal(RELEASE.storeProductsCount, 1892);
  assert.equal(RELEASE.digitalDeliverablesCount, 67);
});

test("accepts only the complete 212-version reconstructed ledger", async () => {
  const file = tempFile("baseline.json", { migrations: baselineRows() });
  await main(["verify-list", "--phase", "baseline", "--file", file]);

  const incomplete = tempFile("incomplete.json", { migrations: baselineRows().slice(1) });
  await assert.rejects(
    () => main(["verify-list", "--phase", "baseline", "--file", incomplete]),
    /212\/212/,
  );
});

test("requires exactly the target as the sole local-only migration", async () => {
  const rows = baselineRows().concat({ local: RELEASE.targetVersion, remote: "", time: "" });
  const file = tempFile("release.json", { migrations: rows });
  await main(["verify-list", "--phase", "release", "--file", file]);

  rows.push({ local: "20260916080000", remote: "", time: "" });
  const unsafe = tempFile("unsafe.json", { migrations: rows });
  await assert.rejects(
    () => main(["verify-list", "--phase", "release", "--file", unsafe]),
    /Exactly one local-only/,
  );
});

test("accepts a reconciled post-deployment ledger containing the target", async () => {
  const rows = baselineRows().concat({
    local: RELEASE.targetVersion,
    remote: RELEASE.targetVersion,
    time: "",
  });
  const file = tempFile("post.json", { migrations: rows });
  await main(["verify-list", "--phase", "post", "--file", file]);
});

test("requires every current ledger version to match the approved validation baseline", async () => {
  const approved = tempFile("approved-baseline.json", { migrations: baselineRows() });
  const changedRows = baselineRows();
  changedRows[100] = { local: "20260101999999", remote: "20260101999999", time: "" };
  const current = tempFile("changed-baseline.json", { migrations: changedRows });

  await assert.rejects(
    () => main(["verify-ledger-equality", "--approved-file", approved, "--current-file", current]),
    /differs from the approved validation baseline/,
  );
});

test("dry-run and apply results must contain only the target and no roles or seeds", async () => {
  const base = {
    upToDate: false,
    migrations: [RELEASE.targetFile],
    seeds: [],
    roles: [],
  };
  const dryRun = tempFile("dry-run.json", { ...base, dryRun: true });
  const apply = tempFile("apply.json", { ...base, dryRun: false });
  await main(["verify-push", "--phase", "dry-run", "--file", dryRun]);
  await main(["verify-push", "--phase", "apply", "--file", apply]);

  const unsafe = tempFile("unsafe.json", {
    ...base,
    dryRun: true,
    migrations: [RELEASE.targetFile, "20260916080000_unrelated.sql"],
  });
  await assert.rejects(
    () => main(["verify-push", "--phase", "dry-run", "--file", unsafe]),
    /must contain only/,
  );
});

test("environment proof requires the named reviewer and main-only branch policy", async () => {
  const environment = tempFile("environment.json", {
    name: RELEASE.environment,
    can_admins_bypass: false,
    protection_rules: [
      {
        type: "required_reviewers",
        prevent_self_review: false,
        reviewers: [{ reviewer: { login: RELEASE.reviewer } }],
      },
    ],
    deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  });
  const branches = tempFile("branches.json", {
    branch_policies: [{ name: "main", type: "branch" }],
  });
  await main(["verify-environment", "--environment-file", environment, "--branch-file", branches]);

  const bypassable = tempFile("environment-bypass.json", {
    ...JSON.parse(readFileSync(environment, "utf8")),
    can_admins_bypass: true,
  });
  await assert.rejects(
    () => main(["verify-environment", "--environment-file", bypassable, "--branch-file", branches]),
    /must not allow administrator bypass/,
  );

  const extraReviewer = tempFile("environment-extra-reviewer.json", {
    ...JSON.parse(readFileSync(environment, "utf8")),
    protection_rules: [
      {
        type: "required_reviewers",
        prevent_self_review: false,
        reviewers: [
          { reviewer: { login: RELEASE.reviewer } },
          { reviewer: { login: "unexpected-reviewer" } },
        ],
      },
    ],
  });
  await assert.rejects(
    () =>
      main(["verify-environment", "--environment-file", extraReviewer, "--branch-file", branches]),
    /must be exactly/,
  );
});

test("release inputs are immutable", async () => {
  await assert.rejects(
    () =>
      main([
        "verify-source",
        "--source-commit",
        "0000000000000000000000000000000000000000",
        "--expected-sha256",
        RELEASE.expectedSha256,
        "--source-root",
        ".",
      ]),
    /Source commit must be/,
  );
});

test("validation run is bound to main and the exact infrastructure commit", async () => {
  const workflowSha = "f".repeat(40);
  const file = tempFile("validation-run.json", {
    id: 12345,
    name: "Validate Growth production migration",
    event: "workflow_dispatch",
    status: "completed",
    conclusion: "success",
    repository: { full_name: "abelnkuna7-cloud/cossa-ai-os" },
    path: ".github/workflows/growth-production-migration-validate.yml",
    head_branch: "main",
    head_sha: workflowSha,
    run_attempt: 2,
  });
  await main([
    "verify-validation-run",
    "--file",
    file,
    "--run-id",
    "12345",
    "--workflow-sha",
    workflowSha,
  ]);

  await assert.rejects(
    () =>
      main([
        "verify-validation-run",
        "--file",
        file,
        "--run-id",
        "12345",
        "--workflow-sha",
        "0".repeat(40),
      ]),
    /must use infrastructure commit/,
  );

  const wrongWorkflow = tempFile("wrong-validation-workflow.json", {
    ...JSON.parse(readFileSync(file, "utf8")),
    path: ".github/workflows/not-the-validation-workflow.yml",
  });
  await assert.rejects(
    () =>
      main([
        "verify-validation-run",
        "--file",
        wrongWorkflow,
        "--run-id",
        "12345",
        "--workflow-sha",
        workflowSha,
      ]),
    /unexpected workflow path/,
  );
});

test("validation evidence is bound to the exact workflow run attempt", async () => {
  const root = mkdtempSync(join(tmpdir(), "growth-validation-evidence-"));
  const workflowSha = "e".repeat(40);
  const metadata = {
    projectRef: RELEASE.projectRef,
    environment: RELEASE.environment,
    sourceCommit: RELEASE.sourceCommit,
    targetMigration: RELEASE.targetFile,
    expectedSha256: RELEASE.expectedSha256,
    supabaseCliVersion: RELEASE.cliVersion,
    operation: "validation",
    runId: "12345",
    runAttempt: "2",
    workflowSha,
  };
  writeFileSync(join(root, "release-metadata.json"), JSON.stringify(metadata));
  writeFileSync(
    join(root, "migration-list-baseline.json"),
    JSON.stringify({ migrations: baselineRows() }),
  );
  writeFileSync(
    join(root, "migration-list-release.json"),
    JSON.stringify({
      migrations: baselineRows().concat({ local: RELEASE.targetVersion, remote: "", time: "" }),
    }),
  );
  writeFileSync(
    join(root, "db-push-dry-run.json"),
    JSON.stringify({
      dryRun: true,
      upToDate: false,
      migrations: [RELEASE.targetFile],
      roles: [],
      seeds: [],
    }),
  );
  writeFileSync(
    join(root, "production-data-before.json"),
    JSON.stringify({
      storeProducts: RELEASE.storeProductsCount,
      digitalDeliverables: RELEASE.digitalDeliverablesCount,
      targetTableHttpStatus: 404,
    }),
  );

  await main([
    "verify-validation-evidence",
    "--root",
    root,
    "--run-id",
    "12345",
    "--run-attempt",
    "2",
    "--workflow-sha",
    workflowSha,
  ]);

  await assert.rejects(
    () =>
      main([
        "verify-validation-evidence",
        "--root",
        root,
        "--run-id",
        "12345",
        "--run-attempt",
        "1",
        "--workflow-sha",
        workflowSha,
      ]),
    /metadata does not match/,
  );
});

test("workflow definitions are pinned and omit prohibited Supabase operations", () => {
  const root = resolve(import.meta.dirname, "..");
  const files = [
    ".github/workflows/growth-production-migration-static.yml",
    ".github/workflows/growth-production-migration-validate.yml",
    ".github/workflows/growth-production-migration-execute.yml",
  ];
  for (const relative of files) {
    const source = readFileSync(join(root, relative), "utf8");
    for (const uses of source.matchAll(/uses:\s+([^\s#]+)/g)) {
      const reference = uses[1];
      if (reference.startsWith("./")) continue;
      assert.match(reference, /@[0-9a-f]{40}$/, `${relative} has an unpinned action: ${reference}`);
    }
    assert.doesNotMatch(source, /\$\{\{\s*runner\.temp\s*\}\}/);
    assert.doesNotMatch(source, /--include-all|migration\s+repair|db\s+reset|supabase\s+link/);
  }

  const validation = readFileSync(
    join(root, ".github/workflows/growth-production-migration-validate.yml"),
    "utf8",
  );
  const execution = readFileSync(
    join(root, ".github/workflows/growth-production-migration-execute.yml"),
    "utf8",
  );
  assert.match(validation, /workflow_dispatch:/);
  assert.match(validation, /environment:\s+growth-production/);
  assert.match(execution, /validation_run_id:/);
  assert.match(execution, /APPLY 20260916070000 TO nptyyzyokzgnwnyteeyi/);
  assert.match(execution, /--skip-vault/);
  assert.match(execution, /--workflow-sha\s+"\$GITHUB_SHA"/);
  assert.equal(
    [...execution.matchAll(/verify-ledger-equality/g)].length,
    2,
    "execution must compare the full approved ledger in both preflight and apply",
  );
  assert.match(
    execution,
    /growth-production-migration-validation-\$\{\{ inputs\.validation_run_id \}\}-\$\{\{ steps\.approved-validation\.outputs\.run-attempt \}\}/,
  );
  assert.doesNotMatch(validation, /Apply only the proven target migration/);
});
