import { createFileRoute } from "@tanstack/react-router";
import { PublicSolutionPage } from "@/components/public-solution-page";

export const Route = createFileRoute("/sme-growth")({
  component: () => <PublicSolutionPage eyebrow="Cossa AI for African SMEs" title="One accountable business growth system for ambitious African SMEs." description="Cossa AI is being proven inside Cossa Nexus Holdings before being offered to other growth-focused businesses. It connects customer growth, operational discipline and AI guidance under your ownership." keywords="AI business operating system South Africa, SME CRM South Africa, African business growth, AI sales operations, business automation" benefits={["A practical CRM and operations foundation", "AI guidance grounded in verified business knowledge", "Human approvals and audit records for important actions"]} />,
  head: () => ({
    meta: [
      { title: "AI Business Growth Operating System for African SMEs | Cossa AI" },
      { name: "description", content: "Cossa AI is an evidence-led business growth operating system for ambitious African SMEs." },
      { property: "og:title", content: "AI Business Growth Operating System for African SMEs | Cossa AI" },
      { property: "og:description", content: "Cossa AI is an evidence-led business growth operating system for ambitious African SMEs." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growth.cossanexusholdings.co.za/sme-growth" },
      { property: "og:site_name", content: "Cossa AI" },
      { property: "og:locale", content: "en_ZA" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://growth.cossanexusholdings.co.za/sme-growth" }],
  }),
});
