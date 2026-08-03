import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, LineChart, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicSiteShell } from "@/components/public-site-shell";

export const Route = createFileRoute("/")({
  component: GrowthHome,
  head: () => ({
    meta: [
      { title: "Cossa AI | AI Business Growth Operating System for South African SMEs" },
      { name: "description", content: "Cossa AI helps South African businesses turn leads into customers, organise operations and make evidence-led decisions." },
      { property: "og:title", content: "Cossa AI | Business Growth Operating System" },
      { property: "og:description", content: "An evidence-led AI operating system built by Cossa Nexus Holdings for growth-focused businesses." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growth.cossanexusholdings.co.za/" },
      { property: "og:site_name", content: "Cossa AI" },
      { property: "og:locale", content: "en_ZA" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Cossa AI | Business Growth Operating System" },
      { name: "twitter:description", content: "An evidence-led AI operating system built by Cossa Nexus Holdings for growth-focused businesses." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://growth.cossanexusholdings.co.za/" }],
  }),
});

function GrowthHome() {
  const capabilities = [
    { icon: Users, title: "Lead to customer", text: "Capture, qualify and follow up on real sales opportunities without losing the evidence." },
    { icon: Bot, title: "Cossa AI intelligence", text: "AI guidance grounded in approved company knowledge—not invented facts or generic dashboards." },
    { icon: LineChart, title: "Marketing accountability", text: "Connect channels, track conversions and improve spend only after measurement is in place." },
  ];
  const organisationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cossa Nexus Holdings (Pty) Ltd",
    url: "https://growth.cossanexusholdings.co.za",
    email: "cossa@cossanexusholdings.co.za",
    telephone: "+27678011907",
    slogan: "United Roots. Strategic Future.",
    sameAs: ["https://cossanexusholdings.co.za", "https://nexdocs.cossanexusholdings.co.za"],
  };
  return <PublicSiteShell><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationSchema) }} /><section className="relative overflow-hidden px-4 py-20 md:py-28"><div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" /><div className="relative mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Cossa Nexus Holdings</p><h1 className="mt-5 max-w-5xl font-display text-4xl font-semibold leading-tight md:text-6xl">The AI business growth operating system for <span className="text-gradient-gold">South African SMEs.</span></h1><p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">Cossa AI brings customer growth, CRM, operations, verified business knowledge and human approvals into one owned platform—starting with Cossa Nexus Holdings.</p><div className="mt-8 flex flex-wrap gap-3"><a href="https://wa.me/27678011907" target="_blank" rel="noreferrer"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Book a growth assessment <ArrowRight className="ml-2 h-4 w-4" /></Button></a><Link to="/login"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Secure workspace login</Button></Link></div><p className="mt-5 text-xs text-muted-foreground">No artificial “live” claims. Every production capability is measured, approved and auditable.</p></div></section><section className="border-y border-border/60 bg-card/30 px-4 py-16"><div className="mx-auto max-w-6xl"><h2 className="font-display text-3xl font-semibold">Built to create measurable business value</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{capabilities.map((item) => <article key={item.title} className="rounded-xl border border-border/60 bg-background p-6"><item.icon className="h-6 w-6 text-primary" /><h3 className="mt-4 text-lg font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p></article>)}</div></div></section><section className="px-4 py-16"><div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2"><div><h2 className="font-display text-3xl font-semibold">Start where revenue matters most</h2><p className="mt-3 text-muted-foreground">Cossa Nexus is applying the system first to Construction, Facility Services, Cossa Tech and Cossa Store—then making the proven model available to African SMEs.</p></div><div className="rounded-xl border border-primary/25 bg-primary/5 p-6"><ShieldCheck className="h-6 w-6 text-primary" /><h3 className="mt-3 font-semibold">Controlled by people, not hype</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{["Verified knowledge before company-specific claims", "Evidence and audit records for important work", "Human approval for high-risk actions"].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul></div></div><div className="mx-auto mt-10 flex max-w-6xl flex-wrap gap-3"><Link to="/construction-growth"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Construction growth</Button></Link><Link to="/facility-services-growth"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Facility services growth</Button></Link><Link to="/sme-growth"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">For African SMEs</Button></Link></div></section></PublicSiteShell>;
}
