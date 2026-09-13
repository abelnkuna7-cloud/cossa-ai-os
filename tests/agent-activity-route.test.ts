import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/routes/ai.activity.tsx", import.meta.url), "utf8");

test("agent activity links recorded employees to their dedicated workspace", () => {
  assert.match(route, /to="\/ai\/employee\/\$employeeId"/);
  assert.match(route, /params=\{\{ employeeId: item\.employeeId \}\}/);
});

test("agent activity does not fabricate an employee workspace link without a recorded employee id", () => {
  assert.match(route, /item\.employeeId \?/);
  assert.match(route, /"No employee recorded"/);
});
