import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wranglerConfig = readFileSync(
  "workers/cossa-agent-runtime/wrangler.toml",
  "utf8",
);

describe("agent runtime worker cadence", () => {
  it("runs often enough for the five-minute heartbeat truth window without polling every minute", () => {
    expect(wranglerConfig).toContain('crons = ["*/4 * * * *"]');
    expect(wranglerConfig).not.toContain('crons = ["* * * * *"]');
  });
});
