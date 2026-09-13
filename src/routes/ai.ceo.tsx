import { createFileRoute } from "@tanstack/react-router";
import { SpecialistChat } from "@/components/specialist-chat";
import { CeoOperationalAlerts } from "@/components/ceo-operational-alerts";
import { getModule } from "@/lib/modules";

const TO = "/ai/ceo";
const mod = getModule(TO)!;

export const Route = createFileRoute("/ai/ceo")({
  component: AiCeoPage,
  head: () => ({
    meta: [
      { title: `${mod.title} — Cossa AI` },
      { name: "description", content: mod.description },
      { property: "og:title", content: `${mod.title} — Cossa AI` },
      { property: "og:description", content: mod.description },
    ],
  }),
});

function AiCeoPage() {
  return (
    <div className="flex flex-col gap-5">
      <CeoOperationalAlerts />
      <SpecialistChat to={TO} />
    </div>
  );
}
