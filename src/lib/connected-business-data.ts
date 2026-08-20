import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

/**
 * These are management-only operational records. They are read through the
 * existing authenticated Supabase client and RLS policies; no customer quote
 * details are exposed to public Store visitors.
 */
const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export interface StoreQuoteRequest {
  id: string;
  reference: string | null;
  contact_name: string | null;
  full_name: string | null;
  company: string | null;
  scope: string | null;
  location: string | null;
  requirements: string | null;
  project_details: string | null;
  estimated_quantity: string | null;
  required_date: string | null;
  budget: string | null;
  additional_information: string | null;
  items: unknown;
  created_at: string | null;
}

export interface ConnectedBusinessSummary {
  mainWebsiteLeadCount: number;
  storeLeadCount: number;
  storeOrderCount: number;
  nexdocsDocumentCount: number | null;
  nexdocsSubscription: {
    planCode: string | null;
    status: string | null;
  } | null;
}

function countOrThrow(
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
): number {
  if (result.error) {
    throw new Error(`Unable to load ${label}: ${result.error.message}`);
  }

  return typeof result.count === "number" ? result.count : 0;
}

export async function listStoreQuoteRequests(): Promise<StoreQuoteRequest[]> {
  const { data, error } = await db
    .from("quote_requests")
    .select(
      [
        "id",
        "reference",
        "contact_name",
        "full_name",
        "company",
        "scope",
        "location",
        "requirements",
        "project_details",
        "estimated_quantity",
        "required_date",
        "budget",
        "additional_information",
        "items",
        "created_at",
      ].join(","),
    )
    .eq("source_app", "cossa_store")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load Store quote requirements: ${error.message}`);
  }

  return (data ?? []) as StoreQuoteRequest[];
}

export async function getConnectedBusinessSummary(): Promise<ConnectedBusinessSummary> {
  const [mainWebsiteLeads, storeLeads, storeOrders, nexdocsDocuments, subscription] =
    await Promise.all([
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", COSSA_ORGANISATION_ID)
        .eq("source_app", "main_website"),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", COSSA_ORGANISATION_ID)
        .eq("source_app", "cossa_store"),
      db
        .from("store_orders")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", COSSA_ORGANISATION_ID),
      db
        .from("nexdocs_document_drafts")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", COSSA_ORGANISATION_ID),
      db
        .from("organisation_subscriptions")
        .select("plan_code,status")
        .eq("organisation_id", COSSA_ORGANISATION_ID)
        .maybeSingle(),
    ]);

  const mainWebsiteLeadCount = countOrThrow("website lead reporting", mainWebsiteLeads);
  const storeLeadCount = countOrThrow("Store lead reporting", storeLeads);
  const storeOrderCount = countOrThrow("Store order reporting", storeOrders);

  if (subscription.error) {
    throw new Error(`Unable to load subscription reporting: ${subscription.error.message}`);
  }

  // NexDocs deliberately limits document visibility to document owners and
  // organisation owners/admins. A manager can still use the rest of the
  // dashboard without exposing protected document records.
  const nexdocsDocumentCount = nexdocsDocuments.error
    ? null
    : typeof nexdocsDocuments.count === "number"
      ? nexdocsDocuments.count
      : 0;

  return {
    mainWebsiteLeadCount,
    storeLeadCount,
    storeOrderCount,
    nexdocsDocumentCount,
    nexdocsSubscription: subscription.data
      ? {
          planCode: subscription.data.plan_code ?? null,
          status: subscription.data.status ?? null,
        }
      : null,
  };
}
