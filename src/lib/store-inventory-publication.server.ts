import { AgentRuntimeError, type RuntimeActor } from "@/lib/agent-runtime.server";
import { normalisePublicationPreflight } from "@/lib/store-inventory-publication";

export type StorePublicationAction = "preview" | "publish" | "unpublish";

function runtimeValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function runtimeConfiguration() {
  const supabaseUrl = runtimeValue("SUPABASE_URL") ?? runtimeValue("VITE_SUPABASE_URL");
  const serviceRoleKey = runtimeValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new AgentRuntimeError(
      "runtime_not_configured",
      "Store publication needs the protected Supabase server credentials.",
      503,
    );
  }
  return { supabaseUrl: supabaseUrl.replace(/\/+$/, ""), serviceRoleKey };
}

const MAX_CUSTOMER_IMAGE_BYTES = 8 * 1024 * 1024;
const CUSTOMER_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function copyCustomerImages(
  intakeId: string,
  imageUrls: string[],
  configuration: { supabaseUrl: string; serviceRoleKey: string },
): Promise<string[]> {
  const copied: string[] = [];
  for (const [index, imageUrl] of imageUrls.entries()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const source = await fetch(imageUrl, { signal: controller.signal });
      if (!source.ok) {
        throw new AgentRuntimeError(
          "publication_image_unavailable",
          `Customer image ${index + 1} could not be read from its approved source.`,
          400,
        );
      }
      const contentType = source.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
      const extension = CUSTOMER_IMAGE_TYPES.get(contentType);
      if (!extension) {
        throw new AgentRuntimeError(
          "publication_image_type_invalid",
          `Customer image ${index + 1} is not a supported JPEG, PNG or WebP image.`,
          400,
        );
      }
      const advertisedSize = Number(source.headers.get("content-length"));
      if (Number.isFinite(advertisedSize) && advertisedSize > MAX_CUSTOMER_IMAGE_BYTES) {
        throw new AgentRuntimeError(
          "publication_image_too_large",
          `Customer image ${index + 1} exceeds the 8 MB Store limit.`,
          400,
        );
      }
      const bytes = new Uint8Array(await source.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_CUSTOMER_IMAGE_BYTES) {
        throw new AgentRuntimeError(
          "publication_image_too_large",
          `Customer image ${index + 1} is empty or exceeds the 8 MB Store limit.`,
          400,
        );
      }
      const path = `published/${intakeId}/${String(index + 1).padStart(2, "0")}-${crypto.randomUUID()}.${extension}`;
      const destination = await fetch(
        `${configuration.supabaseUrl}/storage/v1/object/store-product-images/${path}`,
        {
          method: "POST",
          headers: {
            apikey: configuration.serviceRoleKey,
            Authorization: `Bearer ${configuration.serviceRoleKey}`,
            "Content-Type": contentType,
            "x-upsert": "false",
          },
          body: bytes,
        },
      );
      if (!destination.ok) {
        throw new AgentRuntimeError(
          "publication_image_copy_failed",
          `Customer image ${index + 1} could not be copied into Cossa Store custody.`,
          502,
        );
      }
      copied.push(
        `${configuration.supabaseUrl}/storage/v1/object/public/store-product-images/${path}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
  return copied;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export async function runStorePublicationAction(input: {
  action: StorePublicationAction;
  intakeId: unknown;
  actor: RuntimeActor;
}): Promise<unknown> {
  if (!isUuid(input.intakeId)) {
    throw new AgentRuntimeError("invalid_intake", "Choose a valid Store intake first.", 400);
  }
  if (input.action !== "preview" && input.actor.role !== "owner") {
    throw new AgentRuntimeError(
      "owner_confirmation_required",
      "Only the Cossa owner can publish or remove a Store product.",
      403,
    );
  }

  const rpcName =
    input.action === "preview"
      ? "store_inventory_publication_preflight"
      : input.action === "publish"
        ? "publish_store_inventory_intake_with_images"
        : "unpublish_store_inventory_intake";
  const { supabaseUrl, serviceRoleKey } = runtimeConfiguration();
  const rpcBody: Record<string, unknown> = {
    p_intake_id: input.intakeId,
    p_actor_id: input.actor.userId,
  };

  if (input.action === "publish") {
    const previewResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/store_inventory_publication_preflight`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(rpcBody),
      },
    );
    const previewPayload = await previewResponse.json().catch(() => null);
    const preview = normalisePublicationPreflight(previewPayload);
    if (!previewResponse.ok || !preview.ready || !preview.customer) {
      throw new AgentRuntimeError(
        "publication_preflight_failed",
        "The customer-facing Store preflight must pass before publication.",
        400,
      );
    }
    rpcBody.p_customer_image_urls = await copyCustomerImages(
      input.intakeId,
      preview.customer.imageUrls,
      { supabaseUrl, serviceRoleKey },
    );
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(rpcBody),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "The controlled Store publication action could not be completed.";
    throw new AgentRuntimeError(
      input.action === "preview" ? "publication_preflight_failed" : "publication_action_failed",
      message,
      response.status === 401 || response.status === 403 ? response.status : 400,
    );
  }
  return body;
}
