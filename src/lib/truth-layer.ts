import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

const db = supabase as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

export type CapabilityOperationalStatus =
  | "operational"
  | "partially_operational"
  | "manual"
  | "waiting_approval"
  | "integration_required"
  | "paid_access_required"
  | "degraded"
  | "failed"
  | "disabled"
  | "not_assessed";

export interface CapabilityRegistryEntry {
  id: string;
  capability_key: string;
  name: string;
  module: string;
  purpose: string;
  data_sources: string[];
  required_integration: string | null;
  operational_status: CapabilityOperationalStatus;
  automation_status: "manual" | "scheduled" | "event_driven" | "not_automated";
  approval_requirement:
    | "none"
    | "internal_write"
    | "external_communication"
    | "financial"
    | "production_change";
  business_impact: "low" | "medium" | "high" | "critical";
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  verified_at: string | null;
}

export interface MetricDefinition {
  id: string;
  metric_key: string;
  name: string;
  description: string;
  semantic_type: "fact" | "calculation" | "inference" | "recommendation" | "action" | "verified_result";
  value_kind: "currency" | "count" | "percentage" | "duration" | "status";
  source_systems: string[];
  availability_status: "available" | "partial" | "not_connected" | "stale" | "failed" | "not_assessed";
  last_verified_at: string | null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export async function listCapabilityRegistry(): Promise<CapabilityRegistryEntry[]> {
  const { data, error } = await db
    .from("capability_registry")
    .select(
      "id,capability_key,name,module,purpose,data_sources,required_integration,operational_status,automation_status,approval_requirement,business_impact,last_success_at,last_failure_at,last_error,verified_at",
    )
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("business_impact", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load the capability registry: ${error.message}`);
  }

  return (data ?? []).map((entry: CapabilityRegistryEntry) => ({
    ...entry,
    data_sources: stringArray(entry.data_sources),
  }));
}

export async function listMetricDefinitions(): Promise<MetricDefinition[]> {
  const { data, error } = await db
    .from("metric_definitions")
    .select(
      "id,metric_key,name,description,semantic_type,value_kind,source_systems,availability_status,last_verified_at",
    )
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load metric definitions: ${error.message}`);
  }

  return (data ?? []).map((definition: MetricDefinition) => ({
    ...definition,
    source_systems: stringArray(definition.source_systems),
  }));
}
