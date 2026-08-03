import { createFileRoute } from "@tanstack/react-router";
import { PublicSolutionPage } from "@/components/public-solution-page";

export const Route = createFileRoute("/facility-services-growth")({
  component: () => <PublicSolutionPage eyebrow="Cossa Facility Services" title="Facility services growth without missed enquiries or manual chaos." description="Use a disciplined customer and operations system for cleaning, maintenance and facility services: track enquiries, schedule work, follow up and learn from verified service data." keywords="facility services Pretoria, commercial cleaning Pretoria, cleaning company leads, facilities management CRM, service booking" benefits={["Turn cleaning and facilities enquiries into scheduled work", "Keep customer, site and service information together", "Create repeatable follow-up and review-request workflows"]} />,
  head: () => ({
    meta: [
      { title: "Facility Services Lead Management | Cossa AI Pretoria" },
      { name: "description", content: "Lead management and operations intelligence for facility services and cleaning businesses in Pretoria." },
      { property: "og:title", content: "Facility Services Lead Management | Cossa AI Pretoria" },
      { property: "og:description", content: "Lead management and operations intelligence for facility services and cleaning businesses in Pretoria." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growth.cossanexusholdings.co.za/facility-services-growth" },
      { property: "og:site_name", content: "Cossa AI" },
      { property: "og:locale", content: "en_ZA" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://growth.cossanexusholdings.co.za/facility-services-growth" }],
  }),
});
