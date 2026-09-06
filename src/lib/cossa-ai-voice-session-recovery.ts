import {
  COSSA_VOICE_MAX_TRANSIENT_RETRIES,
  planRecognitionRecovery,
  planVoiceProviderRecovery,
  type CossaVoiceRecoveryPlan,
} from "./cossa-ai-voice-continuity.ts";

export interface CossaVoiceSessionRecoveryState {
  recognitionAttempts: number;
  providerAttempts: number;
}

export const INITIAL_COSSA_VOICE_SESSION_RECOVERY: CossaVoiceSessionRecoveryState = {
  recognitionAttempts: 0,
  providerAttempts: 0,
};

export interface CossaVoiceSessionRecoveryResult {
  plan: CossaVoiceRecoveryPlan;
  nextState: CossaVoiceSessionRecoveryState;
}

/**
 * Keeps retry counters outside React/browser API details so the voice UI can
 * apply one bounded recovery policy consistently. A successful listening or
 * reasoning turn resets the relevant counter; the saved conversation itself is
 * never cleared by this helper.
 */
export function planVoiceRecognitionSessionRecovery({
  state,
  error,
  conversationMode,
  paused,
}: {
  state: CossaVoiceSessionRecoveryState;
  error: unknown;
  conversationMode: boolean;
  paused: boolean;
}): CossaVoiceSessionRecoveryResult {
  const plan = planRecognitionRecovery({
    error,
    attempt: state.recognitionAttempts,
    conversationMode,
    paused,
  });

  const shouldCount = plan.action === "retry";
  return {
    plan,
    nextState: {
      ...state,
      recognitionAttempts: shouldCount
        ? Math.min(COSSA_VOICE_MAX_TRANSIENT_RETRIES, state.recognitionAttempts + 1)
        : plan.action === "restart"
          ? 0
          : state.recognitionAttempts,
    },
  };
}

export function planVoiceProviderSessionRecovery({
  state,
  status,
  retryAfterMs,
}: {
  state: CossaVoiceSessionRecoveryState;
  status: number;
  retryAfterMs?: number | null;
}): CossaVoiceSessionRecoveryResult {
  const plan = planVoiceProviderRecovery({
    status,
    attempt: state.providerAttempts,
    retryAfterMs,
  });

  return {
    plan,
    nextState: {
      ...state,
      providerAttempts:
        plan.action === "retry"
          ? Math.min(COSSA_VOICE_MAX_TRANSIENT_RETRIES, state.providerAttempts + 1)
          : state.providerAttempts,
    },
  };
}

export function resetVoiceRecognitionRecovery(
  state: CossaVoiceSessionRecoveryState,
): CossaVoiceSessionRecoveryState {
  return state.recognitionAttempts === 0 ? state : { ...state, recognitionAttempts: 0 };
}

export function resetVoiceProviderRecovery(
  state: CossaVoiceSessionRecoveryState,
): CossaVoiceSessionRecoveryState {
  return state.providerAttempts === 0 ? state : { ...state, providerAttempts: 0 };
}

export function resetVoiceSessionRecovery(): CossaVoiceSessionRecoveryState {
  return { ...INITIAL_COSSA_VOICE_SESSION_RECOVERY };
}
