import { createFileRoute } from "@tanstack/react-router";
import { CossaVoiceAssistant } from "@/components/cossa-voice-assistant";
import { getModule } from "@/lib/modules";

const TO = "/ai/voice";
const mod = getModule(TO)!;

export const Route = createFileRoute("/ai/voice")({
  component: () => <CossaVoiceAssistant page />,
  head: () => ({
    meta: [
      { title: `${mod.title} — Cossa AI` },
      { name: "description", content: mod.description },
      { property: "og:title", content: `${mod.title} — Cossa AI` },
      { property: "og:description", content: mod.description },
    ],
  }),
});
