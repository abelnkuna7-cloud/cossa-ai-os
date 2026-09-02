import { supabase } from "@/integrations/supabase/client";
import type { CommercialReviewItem } from "@/lib/store-commercial-review";

/**
 * Fetches the sanitised commercial review from the protected server route.
 * Supplier quote payloads, raw provider data and costs are never read from the
 * browser's direct public-variant query path.
 */
export async function loadStoreCommercialReviews(): Promise<CommercialReviewItem[]> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sign in again to view Cossa Store commercial evidence.");

  const response = await fetch("/api/store-commercial-review", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = (await response.json().catch(() => null)) as
    | CommercialReviewItem[]
    | { error?: string }
    | null;
  if (!response.ok) {
    const message =
      payload && !Array.isArray(payload) && typeof payload.error === "string"
        ? payload.error
        : `Commercial review could not be loaded (${response.status}).`;
    throw new Error(message);
  }
  if (!Array.isArray(payload)) throw new Error("Commercial review returned an invalid response.");
  return payload;
}
