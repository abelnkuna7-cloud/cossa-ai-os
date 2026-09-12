import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8")) as {
  env?: Record<string, string>;
};

test("Vercel runtime overrides the deprecated Groq model", () => {
  const model = config.env?.AGENT_GROQ_MODEL;
  assert.equal(model, "openai/gpt-oss-120b");
  assert.notEqual(model, "llama-3.3-70b-versatile");
});
