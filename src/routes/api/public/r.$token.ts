import { createFileRoute } from "@tanstack/react-router";

// Public redirect: /api/public/r/:token → Google review URL, with best-effort
// click evidence. This does not claim the review itself was completed.
export const Route = createFileRoute("/api/public/r/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "").trim();
        if (!token || token.length > 128) {
          return new Response("Invalid review link", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: request, error: requestError } = await supabaseAdmin
          .from("review_requests")
          .select("id, click_count")
          .eq("token", token)
          .maybeSingle();

        if (requestError) {
          console.error("[Reviews] Unable to resolve review token", requestError.message);
        }

        if (request) {
          const nextClickCount = Math.max(0, Number(request.click_count ?? 0)) + 1;
          const { error: clickError } = await supabaseAdmin
            .from("review_requests")
            .update({
              clicked_at: new Date().toISOString(),
              click_count: nextClickCount,
            })
            .eq("id", request.id);

          if (clickError) {
            console.error("[Reviews] Unable to record review-link click", clickError.message);
          }
        }

        const { data: settings, error: settingsError } = await supabaseAdmin
          .from("app_settings")
          .select("key,value")
          .in("key", ["google_place_id", "google_business_name"]);

        if (settingsError) {
          console.error("[Reviews] Unable to load Google review settings", settingsError.message);
        }

        const placeId = settings?.find((setting) => setting.key === "google_place_id")?.value?.trim();
        const businessName =
          settings?.find((setting) => setting.key === "google_business_name")?.value?.trim() ||
          "Cossa Nexus Holdings";

        const target = placeId
          ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
          : `https://www.google.com/search?q=${encodeURIComponent(`${businessName} reviews`)}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: target,
            "Cache-Control": "no-store, max-age=0",
          },
        });
      },
    },
  },
});
