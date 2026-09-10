import { createFileRoute } from "@tanstack/react-router";

import {
  AgentRuntimeError,
  agentRuntimeErrorResponse,
  agentRuntimeJson,
  requireRuntimeMember,
} from "@/lib/agent-runtime.server";
import { validateAstrumProductionPackage } from "@/lib/store-astrum-validated-package";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const Route = createFileRoute("/api/store-astrum-catalogue-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const actor = await requireRuntimeMember(request, ["owner", "admin", "manager"]);
          const body = record(await request.json().catch(() => null));
          const validated = validateAstrumProductionPackage(body.package);

          const { data: supplier, error: supplierError } = await supabaseAdmin
            .from("store_suppliers")
            .select("id,organisation_id,name,status,registry_status,verification_status,source_url")
            .eq("organisation_id", actor.organisationId)
            .eq("name", "Astrum")
            .single();

          if (supplierError || !supplier)
            throw new AgentRuntimeError(
              "astrum_supplier_not_found",
              "Astrum is not available in the authenticated organisation.",
              404,
            );
          if (
            supplier.status !== "active" ||
            supplier.registry_status !== "active" ||
            supplier.verification_status !== "VERIFIED"
          )
            throw new AgentRuntimeError(
              "astrum_not_ready",
              "Astrum must remain ACTIVE and VERIFIED before catalogue persistence is allowed.",
              409,
            );

          const sourceUrl = String(supplier.source_url ?? "").trim();
          if (!sourceUrl)
            throw new AgentRuntimeError(
              "astrum_source_missing",
              "Astrum has no verified supplier source URL in the registry.",
              409,
            );

          const { data, error } = await supabaseAdmin.rpc("persist_supplier_catalogue_import", {
            p_organisation_id: actor.organisationId,
            p_supplier_id: supplier.id,
            p_source_type: validated.sourceType,
            p_source_file_name: validated.sourceFileName,
            p_source_content_hash: validated.sourceContentHash,
            p_source_observed_at: validated.sourceObservedAt || new Date().toISOString(),
            p_source_url: sourceUrl,
            p_rows: validated.rows,
            p_events: validated.events,
            p_counts: validated.counts,
            p_created_by: actor.userId,
          });

          if (error)
            throw new AgentRuntimeError(
              "astrum_import_failed",
              `Astrum catalogue persistence failed: ${error.message}`,
              500,
            );

          return agentRuntimeJson({
            ok: true,
            supplier: "Astrum",
            packageHash: validated.packageHash,
            counts: validated.counts,
            result: data,
            safety: {
              approvalStatus: "review",
              publicationRequested: false,
              cossaStockCreated: false,
              sellingPriceOverrideRequested: false,
            },
          });
        } catch (error) {
          if (error instanceof Error && !(error instanceof AgentRuntimeError)) {
            return agentRuntimeJson({ error: error.message, code: "astrum_package_rejected" }, 400);
          }
          return agentRuntimeErrorResponse(error);
        }
      },
    },
  },
});
