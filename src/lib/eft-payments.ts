import { supabase } from "@/integrations/supabase/client";

export type EftPayment = {
  id: string;
  purpose: "store_order" | "growth_subscription" | "nexdocs_subscription";
  reference: string;
  amount: number;
  currency: "ZAR";
  status:
    | "awaiting_payment"
    | "proof_submitted"
    | "approved"
    | "rejected"
    | "expired"
    | "cancelled";
  expiresAt: string;
  submittedAt: string | null;
  reviewerNote: string | null;
  createdAt: string;
};

export type EftInstructions = {
  accountHolder: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  branchCode: string;
  exactAmount: number;
  currency: "ZAR";
  reference: string;
  instruction: string;
};

export type EftPaymentDetail = {
  payment: EftPayment;
  instructions: EftInstructions;
  order?: {
    orderNumber: string;
    total: number;
    items: Array<{ productName: string; sku: string | null; quantity: number; lineTotal: number }>;
  } | null;
};

export type SubscriptionOptions = {
  organisations: Array<{ id: string; name: string; role: string }>;
  plans: Array<{
    code: "starter" | "professional" | "business";
    name: string;
    monthly_price_zar: number;
  }>;
};

export type ReviewPayment = EftPayment & {
  payerEmail: string;
  payerNote: string | null;
  proofFileName: string | null;
  proofContentType: string | null;
  proofUrl: string | null;
  order: EftPaymentDetail["order"];
};

function errorMessage(error: unknown, data: unknown, fallback: string) {
  const remote = data as { error?: unknown } | null;
  if (typeof remote?.error === "string" && remote.error) return remote.error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("eft-payments", { body });
  if (error || !data)
    throw new Error(errorMessage(error, data, "The EFT payment service is unavailable."));
  return data as T;
}

export function loadGrowthSubscriptionOptions() {
  return invoke<SubscriptionOptions>({
    action: "subscription_options",
    purpose: "growth_subscription",
  });
}

export function startGrowthEftPayment(input: {
  planCode: "starter" | "professional" | "business";
  organisationId: string;
  clientRequestId: string;
}) {
  return invoke<EftPaymentDetail>({ action: "start_growth_subscription", ...input });
}

export async function submitGrowthEftProof(input: {
  paymentId: string;
  proof: File;
  payerNote: string;
}) {
  const body = new FormData();
  body.set("paymentId", input.paymentId);
  body.set("proof", input.proof);
  body.set("payerNote", input.payerNote);
  const { data, error } = await supabase.functions.invoke("eft-payments", { body });
  if (error || !data)
    throw new Error(errorMessage(error, data, "Proof of payment could not be submitted."));
  return data as { payment: EftPayment; message: string };
}

export function loadEftReviewQueue() {
  return invoke<{ payments: ReviewPayment[] }>({ action: "review_queue" });
}

export function reviewEftPayment(input: {
  paymentId: string;
  reviewerNote: string;
  approved: boolean;
}) {
  return invoke<{ payment: EftPayment; message: string }>({
    action: input.approved ? "approve_payment" : "reject_payment",
    paymentId: input.paymentId,
    reviewerNote: input.reviewerNote,
  });
}
