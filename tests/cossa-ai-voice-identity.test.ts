import assert from "node:assert/strict";
import test from "node:test";

import {
  canUseFounderVoice,
  resolveCossaVoiceIdentity,
} from "../src/lib/cossa-ai-voice-identity.ts";

test("uses standard Cossa voice until founder voice consent and enablement are verified", () => {
  const identity = resolveCossaVoiceIdentity();

  assert.equal(identity?.id, "cossa-standard-voice");
  assert.equal(identity?.isFallback, true);
});

test("prefers Abel founder voice once explicitly enabled with verified consent", () => {
  const identity = resolveCossaVoiceIdentity({
    founderVoice: {
      enabled: true,
      verifiedOwnerConsent: true,
      provider: "external",
      providerVoiceId: "voice_abel_verified",
    },
  });

  assert.equal(identity?.id, "founder-voice-abel-nkuna");
  assert.equal(identity?.displayName, "Founder Voice — Abel Nkuna");
  assert.equal(identity ? canUseFounderVoice(identity) : false, true);
});

test("never presents an unverified founder voice as Abel", () => {
  const identity = resolveCossaVoiceIdentity({
    founderVoice: {
      enabled: true,
      verifiedOwnerConsent: false,
      provider: "external",
      providerVoiceId: "unknown_voice",
    },
  });

  assert.equal(identity?.id, "cossa-standard-voice");
});
