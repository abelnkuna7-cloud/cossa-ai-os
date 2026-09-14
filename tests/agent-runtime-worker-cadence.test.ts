import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const wranglerConfig = readFileSync(
  "workers/cossa-agent-runtime/wrangler.toml",
  "utf8",
);

describe("agent runtime worker cadence", () => {
  it("runs often enough for the five-minute heartbeat truth window without polling every minute", () => {
    assert.ok(wranglerConfig.includes('crons = ["*/4 * * * *"]'));
    assert.ok(!wranglerConfig.includes('crons = ["* * * * *"]'));
  });
});
