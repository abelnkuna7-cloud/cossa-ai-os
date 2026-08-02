import { createFileRoute } from "@tanstack/react-router";
import { PublicSolutionPage } from "@/components/public-solution-page";

export const Route = createFileRoute("/facility-services-growth")({
  component: () => <PublicSolutionPage eyebrow="Cossa Facility Services" title="Facility services growth without missed enquiries or manual chaos." description="Use a disciplined customer and operations system for cleaning, maintenance and facility services: track enquiries, schedule work, follow up and learn from verified service data." keywords="facility services Pretoria, commercial cleaning Pretoria, cleaning company leads, facilities management CRM, service booking" benefits={["Turn cleaning and facilities enquiries into scheduled work", "Keep customer, site and service information together", "Create repeatable follow-up and review-request workflows"]} />,
  head: () => ({ meta: [{ title: "Facility Services Lead Management | Cossa AI Pretoria" }, { name: "description", content: "Lead management and operations intelligence for facility services and cleaning businesses in Pretoria." }, { name: "robots", content: "index, follow" }] }),
});
