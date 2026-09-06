import assert from "node:assert/strict";
import test from "node:test";

import { resolveCossaMemoryActivation } from "../src/lib/cossa-ai-memory-activation.ts";

test("memory remains disabled unless read is explicitly enabled", () => {
  const activation = resolveCossaMemoryActivation({});
  assert.equal(activation.mode, "disabled");
  assert.equal(activation.readEnabled, false);
  assert.equal(activation.writeEnabled, false);
});

test("read can be enabled without writeback", () => {
  const activation = resolveCossaMemoryActivation({
    COSSA_AI_MEMORY_ENABLED: "true",
  });
  assert.equal(activation.mode, "read");
  assert.equal(activation.readEnabled, true);
  assert.equal(activation.writeEnabled, false);
});

test("writeback cannot activate before memory read", () => {
  const activation = resolveCossaMemoryActivation({
    COSSA_AI_MEMORY_WRITEBACK_ENABLED: "true",
  });
  assert.equal(activation.mode, "disabled");
  assert.equal(activation.readEnabled, false);
  assert.equal(activation.writeEnabled, false);
});

test("read-write requires both explicit feature flags", () => {
  const activation = resolveCossaMemoryActivation({
    COSSA_AI_MEMORY_ENABLED: " TRUE ",
    COSSA_AI_MEMORY_WRITEBACK_ENABLED: "true",
  });
  assert.equal(activation.mode, "read-write");
  assert.equal(activation.readEnabled, true);
  assert.equal(activation.writeEnabled, true);
});

test("false and malformed values fail closed", () => {
  for (const value of ["false", "1", "yes", "on", ""]) {
    const activation = resolveCossaMemoryActivation({
      COSSA_AI_MEMORY_ENABLED: value,
      COSSA_AI_MEMORY_WRITEBACK_ENABLED: "true",
    });
    assert.equal(activation.mode, "disabled");
  }
});
