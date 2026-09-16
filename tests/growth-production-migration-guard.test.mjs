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

test("accepts only the complete 212-version reconstructed ledger", async () => {
  const file = tempFile("baseline.json", { migrations: baselineRows() });
  await main(["verify-list", "--phase", "baseline", "--file", file]);

  const incomplete = tempFile("incomplete.json", { migrations: baselineRows().slice(1) });
  await assert.rejects(() => main(["verify-list", "--phase", "baseline", "--file", incomplete]), /212\/212/);
});

test("requires exactly the target as the sole local-only migration", async () => {
  const rows = baselineRows().concat({ local: RELEASE.targetVersion, remote: "", time: "" });
  const file = tempFile("release.json", { migrations: rows });
  await main(["verify-list", "--phase", "release", "--file", file]);

  rows.push({ local: "20260916080000", remote: "", time: "" });
  const unsafe = tempFile("unsafe.json", { migrations: rows });
  await assert.rejects(() => main(["verify-list", "--phase", "release", "--file", unsafe]), /Exactly one local-only/);
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
  await assert.rejects(() => main(["verify-push", "--phase", "dry-run", "--file", unsafe]), /must contain only/);
});

test("environment proof requires the named reviewer and main-only branch policy", async () => {
  const environment = tempFile("environment.json", {
    name: RELEASE.environment,
    protection_rules: [
      {
        type: "required_reviewers",
        reviewers: [{ reviewer: { login: RELEASE.reviewer } }],
      },
    ],
    deployment_branch_policy: { custom_branch_policies: true },
  });
  const branches = tempFile("branches.json", {
    branch_policies: [{ name: "main", type: "branch" }],
  });
  await main([
    "verify-environment",
    "--environment-file",
    environment,
    "--branch-file",
    branches,
  ]);
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
  assert.doesNotMatch(validation, /Apply only the proven target migration/);
});

