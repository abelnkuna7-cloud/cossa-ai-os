import { createFileRoute } from "@tanstack/react-router";
import { PublicSolutionPage } from "@/components/public-solution-page";

export const Route = createFileRoute("/construction-growth")({
  component: () => <PublicSolutionPage eyebrow="Cossa Nexus Construction" title="Construction lead generation and operations intelligence for Pretoria." description="Help your construction business turn enquiries into site inspections, quotations, disciplined follow-ups and better project visibility—without losing customer context." keywords="building contractors Pretoria, construction companies Pretoria, home renovations Pretoria East, renovation leads, quotation follow-up" benefits={["Capture and qualify site-inspection enquiries", "Follow up on quotations before opportunities go cold", "Coordinate projects, tasks and customer records"]} />,
  head: () => ({
    meta: [
      { title: "Construction Lead Generation & Operations | Cossa AI Pretoria" },
      { name: "description", content: "Construction lead generation, quotation follow-up and operations intelligence for Pretoria businesses." },
      { property: "og:title", content: "Construction Lead Generation & Operations | Cossa AI Pretoria" },
      { property: "og:description", content: "Construction lead generation, quotation follow-up and operations intelligence for Pretoria businesses." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growth.cossanexusholdings.co.za/construction-growth" },
      { property: "og:site_name", content: "Cossa AI" },
      { property: "og:locale", content: "en_ZA" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://growth.cossanexusholdings.co.za/construction-growth" }],
  }),
});
