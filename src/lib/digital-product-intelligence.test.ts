import assert from "node:assert/strict";
import test from "node:test";

import {
  digitalProfileFromIntelligenceRow,
  digitalProfileToIntelligencePayload,
  evaluateDigitalProductProfile,
  inferDigitalSubtype,
  inferDigitalSubtypeWithEvidence,
  type DigitalProductIntelligenceRow,
} from "./digital-product-intelligence.ts";

test("detects a children's storybook only from supplied evidence", () => {
  const inference = inferDigitalSubtypeWithEvidence({
    name: "A Heartwarming African Story About Friendship",
    description: "A children's eBook for ages 3-7",
    fileNames: ["storybook.pdf", "activity-book.pdf"],
  });
  assert.equal(inference.subtype, "ebook_storybook");
  assert.deepEqual(inference.evidenceSources, ["description", "file names"]);
});

test("does not pretend incomplete ebook metadata is ready", () => {
  const result = evaluateDigitalProductProfile({
    subtype: "ebook_storybook",
    language: "English",
    audience: "Children ages 3-7",
  });
  assert.equal(result.complete, false);
  assert.ok(result.missing.includes("creator"));
  assert.ok(result.missing.includes("page_count"));
});

test("accepts complete evidence-backed ebook metadata", () => {
  const result = evaluateDigitalProductProfile({
    subtype: "ebook_storybook",
    language: "English",
    audience: "Children ages 3-7",
    creator: "Verified creator",
    publisher: "Verified publisher",
    genre: "Children's fiction",
    page_count: 16,
  });
  assert.equal(result.complete, true);
  assert.equal(result.score, 100);
});

test("classifies course and software cases separately", () => {
  assert.equal(inferDigitalSubtype({ name: "Business video course masterclass" }), "video_course");
  assert.equal(inferDigitalSubtype({ name: "Windows business software installer" }), "software");
});

test("inference never fabricates factual product metadata", () => {
  const payload = digitalProfileToIntelligencePayload(
    { subtype: inferDigitalSubtype({ name: "Windows business software installer" }) },
    ["setup.exe"],
    "2026-09-16T09:00:00.000Z",
  );
  assert.deepEqual(payload.metadata, {});
  assert.deepEqual(payload.licensing, {});
  assert.deepEqual(payload.detected_assets, ["setup.exe"]);
  assert.ok(payload.readiness_issues.includes("version"));
  assert.ok(payload.readiness_issues.includes("licence type"));
});

test("structured persistence round-trips verified profile values", () => {
  const payload = digitalProfileToIntelligencePayload(
    {
      subtype: "software",
      version: "1.2.0",
      supported_platforms: ["Windows 11"],
      system_requirements: ["8 GB RAM"],
      licence_type: "Single business user",
      evidence_notes: ["Vendor release notes checked"],
    },
    ["installer.zip"],
    "2026-09-16T09:00:00.000Z",
  );
  const row = {
    id: "intelligence-1",
    product_id: "product-1",
    organisation_id: "organisation-1",
    ...payload,
    created_at: "2026-09-16T09:00:00.000Z",
    updated_at: "2026-09-16T09:00:00.000Z",
  } satisfies DigitalProductIntelligenceRow;
  assert.deepEqual(digitalProfileFromIntelligenceRow(row), {
    subtype: "software",
    version: "1.2.0",
    supported_platforms: ["Windows 11"],
    system_requirements: ["8 GB RAM"],
    licence_type: "Single business user",
    evidence_notes: ["Vendor release notes checked"],
  });
});
