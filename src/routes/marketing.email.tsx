import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/module-page";
import { getModule } from "@/lib/modules";

const TO = "/marketing/email";
const mod = getModule(TO)!;

export const Route = createFileRoute("/marketing/email")({
  component: () => <ModulePage to={TO} />,
  head: () => ({
    meta: [
      { title: `${mod.title} — Cossa AI` },
      { name: "description", content: mod.description },
      { property: "og:title", content: `${mod.title} — Cossa AI` },
      { property: "og:description", content: mod.description },
    ],
  }),
});
