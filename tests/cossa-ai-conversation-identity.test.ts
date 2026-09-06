import assert from "node:assert/strict";
import test from "node:test";

import { deriveConversationIdentity } from "../src/lib/cossa-ai-conversation-identity.ts";

test("derived conversation identity stays stable as later turns are appended", () => {
  const firstTurns = [
    { role: "user" as const, content: "Help me improve Cossa AI memory." },
    { role: "assistant" as const, content: "We will upgrade without rebuilding." },
    { role: "user" as const, content: "Continue." },
  ];

  const initial = deriveConversationIdentity(firstTurns);
  const later = deriveConversationIdentity([
    ...firstTurns,
    { role: "assistant" as const, content: "Memory architecture added." },
    { role: "user" as const, content: "Move to the next stage." },
  ]);

  assert.equal(initial, later);
  assert.match(initial, /^derived-[0-9a-f]{8}$/);
});

test("different opening conversations receive different fallback identities", () => {
  const store = deriveConversationIdentity([
    { role: "user", content: "Who supplies our Store?" },
  ]);
  const construction = deriveConversationIdentity([
    { role: "user", content: "Show me Construction leads." },
  ]);

  assert.notEqual(store, construction);
});
