export type SocialBusinessKey = "auto" | "cossa_nexus_holdings" | "growth" | "nexdocs" | "cossa_store" | "cossa_tech" | "cossa_nexus_construction" | "cossa_facility_services";
export type SocialObjective = "auto" | "sales" | "lead_generation" | "awareness" | "pain_point" | "educational" | "hook" | "product_promotion" | "service_promotion" | "trust_authority" | "announcement" | "retention";

export const SOCIAL_BUSINESSES: { key: SocialBusinessKey; label: string }[] = [
  { key: "auto", label: "Auto-detect business" }, { key: "cossa_nexus_holdings", label: "Cossa Nexus Holdings" }, { key: "growth", label: "Growth" }, { key: "nexdocs", label: "NexDocs" }, { key: "cossa_store", label: "Cossa Store" }, { key: "cossa_tech", label: "Cossa Tech" }, { key: "cossa_nexus_construction", label: "Cossa Nexus Construction" }, { key: "cossa_facility_services", label: "Cossa Facility Services" },
];
export const SOCIAL_OBJECTIVES: { key: SocialObjective; label: string; guidance: string }[] = [
  { key:"auto", label:"Auto-detect objective", guidance:"Infer the single strongest content objective from the brief." },
  { key:"sales", label:"Sales / Conversion", guidance:"Persuade a qualified audience to take a commercial action. Be specific about value; do not turn it into generic awareness copy." },
  { key:"lead_generation", label:"Lead Generation", guidance:"Create interest and drive a relevant enquiry, quote request, demo or contact action." },
  { key:"awareness", label:"Awareness", guidance:"Explain and position the business/product clearly. Build recognition without forcing a hard sale." },
  { key:"pain_point", label:"Pain Point", guidance:"Lead with a real customer problem, show the consequence, then connect it to a verified Cossa solution." },
  { key:"educational", label:"Educational", guidance:"Teach something useful first and connect the lesson naturally to the relevant verified capability." },
  { key:"hook", label:"Hook / Engagement", guidance:"Prioritise stopping attention and encouraging engagement while remaining truthful and relevant." },
  { key:"product_promotion", label:"Product Promotion", guidance:"Promote a specific verified product or product category and its customer value." },
  { key:"service_promotion", label:"Service Promotion", guidance:"Promote a specific verified service, outcome and appropriate enquiry action." },
  { key:"trust_authority", label:"Trust / Authority", guidance:"Build credibility using verified capabilities, process, experience or positioning. Never invent awards, statistics or testimonials." },
  { key:"announcement", label:"Announcement", guidance:"Communicate a genuine launch, change, milestone or update supplied in the brief or verified context." },
  { key:"retention", label:"Customer Retention", guidance:"Help existing customers get more value, return, renew or continue using the relevant service without false urgency." },
];

const PROFILES: Record<Exclude<SocialBusinessKey,"auto">, string> = {
  cossa_nexus_holdings: "Cossa Nexus Holdings (Pty) Ltd is the parent group. Position it at corporate/group level and around the connected businesses and long-term operating ecosystem. Active businesses include Cossa Nexus Construction, Cossa Facility Services, Cossa Tech, Cossa Store, NexDocs and Growth. Do not present the parent company as if it personally performs every subsidiary service. Group slogan: United Roots. Strategic Future.",
  growth: "Growth is Cossa's business operating and intelligence platform. Verified areas include CRM/leads and follow-ups, business communications tracking, social/content operations, workflows/operations, business performance and AI-assisted operating capabilities. Position it as helping businesses organise, understand and act on business work. Do not invent customer counts, revenue improvements, integrations, autonomous actions or features that are not in the brief/context.",
  nexdocs: "NexDocs is Cossa's SaaS business-document platform. Verified model: 10-day trial and R99/month. Verified document library includes quotation, invoice, business proposal, contract, site inspection and completion certificate, with additional business/construction documents planned. Verified capabilities include guided questionnaires, editing before download, saving to an account and PDF export. Do not claim accounting, payment processing, legal advice, e-signature or other unverified capabilities.",
  cossa_store: "Cossa Store is Cossa's ecommerce business covering physical products, digital products, print-on-demand and selected affiliate products. Store positioning: Shop Smarter. Live Better. Build More. For a product-specific post, only claim product features/prices supplied in the brief or verified product data; never invent stock, discounts, delivery times or specifications.",
  cossa_tech: "Cossa Tech positioning: Marketing. AI. Business Growth. Verified services include websites/ecommerce, AI assistants and lead-generation AI, SEO/SEM, Google/Meta/TikTok/YouTube advertising, social media management, email and WhatsApp marketing, landing pages, CRM, analytics, competitor analysis, brand monitoring and telemarketing. Match the message to the requested service instead of listing everything.",
  cossa_nexus_construction: "Cossa Nexus Construction serves Pretoria/Centurion and provides renovations, maintenance, painting, tiling, ceilings, roofing, building, plumbing, welding, drywall, rhinolite finishing and office/home upgrades. Write like a credible local contractor: workmanship, project outcome, inspection/quotation and customer needs. Do not invent CIDB grades, warranties, project counts, turnaround times or prices.",
  cossa_facility_services: "Cossa Facility Services covers residential/commercial/industrial cleaning, deep and recurring cleaning, office cleaning, hygiene and sanitation, windows, laundry, furniture deep cleaning, tough stains, gardens/landscaping, non-construction property maintenance, waste management, pest-control coordination and security-support coordination. Distinguish directly delivered services from coordination services. Do not describe it as a construction company.",
};

export function socialBusinessKnowledge(key: SocialBusinessKey) {
  if (key === "auto") return Object.entries(PROFILES).map(([name,profile])=>`${name}: ${profile}`).join("\n");
  return `${key}: ${PROFILES[key]}`;
}
export function socialObjectiveGuidance(key: SocialObjective) { return SOCIAL_OBJECTIVES.find((item)=>item.key===key)?.guidance ?? SOCIAL_OBJECTIVES[0].guidance; }
