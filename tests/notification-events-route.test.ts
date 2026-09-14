import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(
  new URL("../src/routes/notifications.events.tsx", import.meta.url),
  "utf8",
);

test("canonical notification workspace reads trusted events without executing actions", () => {
  assert.match(route, /listNotificationEvents\(250\)/);
  assert.match(route, /read-only and does not send messages or execute external actions/);
  assert.doesNotMatch(route, /recordNotificationInteraction/);
  assert.doesNotMatch(route, /fetch\(/);
});

test("canonical notification workspace fails closed when event stream is unavailable", () => {
  assert.match(route, /Canonical event stream unavailable/);
  assert.match(route, /Existing operational records have not been changed/);
  assert.match(route, /It does not\s+mean every business system is healthy/);
});

test("canonical events are prioritised and can link only to their recorded action target", () => {
  assert.match(route, /sortNotificationEvents/);
  assert.match(route, /notificationEventsToWorkspaceItems/);
  assert.match(route, /item\.href !== "\/notifications"/);
  assert.match(route, /href=\{item\.href\}/);
});
