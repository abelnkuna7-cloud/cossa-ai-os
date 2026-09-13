import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/routes/ai.handoffs.tsx", import.meta.url), "utf8");

test("handoff trail links recorded employees to their dedicated workspace", () => {
  assert.match(route, /to="\/ai\/employee\/\$employeeId"/);
  assert.match(route, /params=\{\{ employeeId: item\.fromEmployeeId \}\}/);
  assert.match(route, /params=\{\{ employeeId: item\.toEmployeeId \}\}/);
});

test("handoff origin without a recorded employee id stays unlinked", () => {
  assert.match(route, /item\.fromEmployeeId \?/);
  assert.match(route, /<span>\{item\.fromEmployeeName\}<\/span>/);
});
