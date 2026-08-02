import { Link } from "@tanstack/react-router";
import { BarChart3, CheckCircle2, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicSiteShell } from "@/components/public-site-shell";

interface PublicSolutionPageProps {
  eyebrow: string;
  title: string;
  description: string;
  keywords: string;
  benefits: string[];
}

export function PublicSolutionPage({ eyebrow, title, description, keywords, benefits }: PublicSolutionPageProps) {
  return <PublicSiteShell><section className="relative overflow-hidden px-4 py-20 md:py-28"><div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" /><div className="relative mx-auto max-w-5xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p><h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-tight md:text-6xl">{title}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{description}</p><div className="mt-8 flex flex-wrap gap-3"><a href="https://wa.me/27678011907" target="_blank" rel="noreferrer"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Request a growth assessment</Button></a><Link to="/login"><Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">Open Cossa AI workspace</Button></Link></div></div></section><section className="bg-card/30 px-4 py-16"><div className="mx-auto max-w-5xl"><h2 className="font-display text-3xl font-semibold">What Cossa AI helps you improve</h2><p className="mt-3 max-w-3xl text-muted-foreground">Built around measurable business outcomes: more qualified leads, faster response, less manual work, stronger customer follow-up and lower growth waste.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{benefits.map((benefit, index) => { const Icon = [Target, BarChart3, ShieldCheck][index % 3]; return <article key={benefit} className="rounded-xl border border-border/60 bg-background p-5"><Icon className="h-5 w-5 text-primary" /><h3 className="mt-4 font-semibold">{benefit}</h3><p className="mt-2 text-sm text-muted-foreground">Configured around your business, data, evidence and approval rules.</p></article>; })}</div></div></section><section className="px-4 py-16"><div className="mx-auto max-w-5xl"><h2 className="font-display text-3xl font-semibold">Built for decisions, not dashboard noise</h2><ul className="mt-5 space-y-3 text-muted-foreground">{["Every company-specific AI output must use verified knowledge.", "High-risk actions remain human-approved.", "Important work keeps evidence, source references and an audit trail."].map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{item}</li>)}</ul><p className="mt-8 text-sm text-muted-foreground">Focus terms: {keywords}</p></div></section></PublicSiteShell>;
}
