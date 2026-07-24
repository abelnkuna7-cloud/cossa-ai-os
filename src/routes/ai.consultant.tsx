import { createFileRoute } from "@tanstack/react-router";
import { SpecialistChat } from "@/components/specialist-chat";
import { getModule } from "@/lib/modules";

const TO = "/ai/consultant";
const mod = getModule(TO)!;

export const Route = createFileRoute("/ai/consultant")({
  component: () => <SpecialistChat to={TO} />,
  head: () => ({
    meta: [
      { title: `${mod.title} — Cossa AI` },
      { name: "description", content: mod.description },
      { property: "og:title", content: `${mod.title} — Cossa AI` },
      { property: "og:description", content: mod.description },
    ],
  }),
});
