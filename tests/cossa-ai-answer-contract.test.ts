import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCossaAnswerContract,
  planCossaAnswerContract,
} from "../src/lib/cossa-ai-answer-contract.ts";

test("diagnostic questions demand evidence-aware diagnosis", () => {
  const plan = planCossaAnswerContract("Why did our Vercel deployment fail today?");

  assert.equal(plan.answerMode, "diagnostic");
  assert.equal(plan.evidenceStandard, "live-operational");
  assert.equal(plan.uncertaintyPolicy, "verify-before-claim");
  assert.match(formatCossaAnswerContract(plan), /strongest hypothesis/i);
});

test("executive questions prioritise decision and impact", () => {
  const plan = planCossaAnswerContract(
    "Give me the CEO briefing and company status for Cossa today",
  );

  assert.equal(plan.answerMode, "executive");
  assert.equal(plan.evidenceStandard, "live-operational");
  assert.ok(plan.instructions.some((instruction) => /business impact/i.test(instruction)));
});

test("company-specific supplier questions prefer verified internal evidence", () => {
  const plan = planCossaAnswerContract("Which supplier is approved for our Cossa Store?");

  assert.equal(plan.evidenceStandard, "verified-internal");
  assert.equal(plan.uncertaintyPolicy, "verify-before-claim");
});

test("current external questions require fresh research", () => {
  const plan = planCossaAnswerContract("What competitor news should Cossa Tech know today?");

  assert.equal(plan.evidenceStandard, "current-external");
  assert.ok(plan.instructions.some((instruction) => /fresh authorised research/i.test(instruction)));
});

test("short follow-ups preserve saved conversation continuity", () => {
  const plan = planCossaAnswerContract("What about Store?");

  assert.equal(plan.preserveConversationContinuity, true);
  assert.ok(plan.instructions.some((instruction) => /continuation of the saved conversation/i.test(instruction)));
});

test("ordinary questions remain direct without unnecessary external requirements", () => {
  const plan = planCossaAnswerContract("Explain gross margin simply");

  assert.equal(plan.answerMode, "direct");
  assert.equal(plan.evidenceStandard, "known");
  assert.equal(plan.uncertaintyPolicy, "state-limits");
});
