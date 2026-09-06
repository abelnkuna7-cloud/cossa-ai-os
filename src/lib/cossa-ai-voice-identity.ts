export type CossaVoiceMode = "founder" | "standard" | "silent";

export interface CossaVoiceIdentity {
  id: string;
  displayName: string;
  owner: string;
  mode: CossaVoiceMode;
  locale: string;
  provider: "browser" | "external";
  providerVoiceId?: string | null;
  verifiedOwnerConsent: boolean;
  enabled: boolean;
  isFallback: boolean;
}

/**
 * Stable voice identity for Cossa AI OS.
 *
 * The identity is intentionally provider-agnostic so Abel's verified cloned
 * voice can later replace browser speech synthesis without rebuilding the AI
 * brain, agents, memory or reasoning stack.
 */
export const FOUNDER_VOICE_IDENTITY: CossaVoiceIdentity = {
  id: "founder-voice-abel-nkuna",
  displayName: "Founder Voice — Abel Nkuna",
  owner: "Abel Nkuna",
  mode: "founder",
  locale: "en-ZA",
  provider: "browser",
  providerVoiceId: null,
  verifiedOwnerConsent: false,
  enabled: false,
  isFallback: false,
};

export const STANDARD_COSSA_VOICE_IDENTITY: CossaVoiceIdentity = {
  id: "cossa-standard-voice",
  displayName: "Cossa Standard Voice",
  owner: "Cossa Nexus Holdings",
  mode: "standard",
  locale: "en-ZA",
  provider: "browser",
  providerVoiceId: null,
  verifiedOwnerConsent: true,
  enabled: true,
  isFallback: true,
};

export interface ResolveVoiceOptions {
  founderVoice?: Partial<CossaVoiceIdentity> | null;
  allowFallback?: boolean;
}

/**
 * Founder voice is preferred whenever it is explicitly enabled and ownership
 * consent has been verified. Until then Cossa safely falls back to its current
 * generic voice rather than pretending to be Abel.
 */
export function resolveCossaVoiceIdentity({
  founderVoice,
  allowFallback = true,
}: ResolveVoiceOptions = {}): CossaVoiceIdentity | null {
  const candidate: CossaVoiceIdentity = {
    ...FOUNDER_VOICE_IDENTITY,
    ...(founderVoice ?? {}),
  };

  if (candidate.enabled && candidate.verifiedOwnerConsent) {
    return candidate;
  }

  return allowFallback ? STANDARD_COSSA_VOICE_IDENTITY : null;
}

export function canUseFounderVoice(identity: CossaVoiceIdentity): boolean {
  return (
    identity.mode === "founder" &&
    identity.enabled &&
    identity.verifiedOwnerConsent &&
    !identity.isFallback
  );
}
