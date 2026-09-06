import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");

test("shared chat ingress uses the bounded provider gateway controller", () => {
  assert.match(source, /createCossaProviderGatewayController/);
  assert.match(source, /configuredCossaRuntimeProviders\(\)/);
  assert.match(source, /x-cossa-ai-provider-candidate-order/);
  assert.match(source, /x-cossa-ai-capacity-mode/);
  assert.match(source, /x-cossa-ai-runtime-action/);
});

test("automatic provider steering only changes auto mode when telemetry changes the first candidate", () => {
  assert.match(
    source,
    /currentPreference === "auto"[\s\S]{0,180}selectedCandidate !== configuredProviders\[0\]/,
  );
  assert.match(source, /provider = selectedCandidate/);
});

test("route-level provider observability wins over ingress fallback headers", () => {
  assert.match(source, /if \(!headers\.has\(responseHeader\)\) headers\.set\(responseHeader, value\)/);
});

test("configured-provider detection checks presence only and never exposes credential values", () => {
  assert.match(source, /env\.OPENAI_API_KEY && env\.OPENAI_MODEL/);
  assert.match(source, /env\.GEMINI_API_KEY \|\| env\.GOOGLE_AI_API_KEY/);
  assert.match(source, /env\.GROQ_API_KEY/);
  assert.doesNotMatch(source, /headers\.set\([^\n]*(API_KEY|Authorization)/);
});
