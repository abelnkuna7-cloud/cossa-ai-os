import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicSiteShell } from "@/components/public-site-shell";

const whatsappHref =
  "https://wa.me/27678011907?text=Hi%20Cossa%2C%20I%20want%20to%20learn%20more%20about%20GROWTH.";

const plans = [
  {
    name: "Starter",
    price: "R499",
    cadence: "/month",
    description:
      "For owner-led businesses that need control of leads, customers and follow-up without paying for AI they do not need.",
    features: [
      "CRM, contacts and lead management",
      "Enquiry and follow-up pipeline",
      "Core dashboards and basic reporting",
      "Essential non-AI business tools",
      "No paid AI usage included",
    ],
    cta: "Start 14-day trial",
  },
  {
    name: "Professional",
    price: "R999",
    cadence: "/month",
    description:
      "For growing teams ready to automate more of their marketing, workflow and day-to-day execution.",
    featured: true,
    badge: "Most popular",
    features: [
      "Everything in Starter",
      "Workflow and marketing capabilities",
      "Controlled GROWTH AI allowance",
      "More automation and team capability",
      "Priority support",
    ],
    cta: "Start 14-day trial",
  },
  {
    name: "Business",
    price: "R1,999",
    cadence: "/month",
    description:
      "For businesses that want advanced automation, AI Workforce capability and higher operating limits.",
    features: [
      "Everything in Professional",
      "Advanced automation and intelligence",
      "AI Workforce capabilities",
      "Higher usage and operating limits",
      "High-volume AI with fair-use protection",
    ],
    cta: "Start 14-day trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description:
      "For larger organisations, agencies and teams requiring tailored deployment, integrations or governance.",
    features: [
      "Everything in Business",
      "Custom integrations and limits",
      "White-label options where suitable",
      "Dedicated implementation and support",
      "Contract-based AI and usage capacity",
    ],
    cta: "Talk to Cossa",
  },
] as const;

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "GROWTH Pricing | CRM, Automation & AI for South African Businesses" },
      {
        name: "description",
        content:
          "Compare GROWTH Starter, Professional, Business and Enterprise plans for CRM, follow-up, workflow automation and controlled AI-powered business operations.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "GROWTH Pricing | Business Growth Intelligence" },
      {
        property: "og:description",
        content:
          "Start from R499/month with CRM and follow-up, then add automation and controlled AI as your business grows.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growth.cossanexusholdings.co.za/pricing" },
    ],
    links: [{ rel: "canonical", href: "https://growth.cossanexusholdings.co.za/pricing" }],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <PublicSiteShell>
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Transparent launch pricing
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Start lean. Add intelligence as your business grows.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              GROWTH separates core business operations from paid AI usage so smaller businesses can
              start affordably while growing teams can unlock more automation and intelligence.
            </p>

            <div className="mt-7 inline-flex max-w-2xl items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left text-sm text-foreground/90">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <strong>14-day Intelligent Trial:</strong> explore GROWTH before choosing a plan.
                Trial AI and premium capabilities will use controlled allowances while the full
                tenant system is rolled out.
              </span>
            </div>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={
                  "flex h-full flex-col rounded-2xl border p-6 shadow-sm " +
                  ("featured" in plan && plan.featured
                    ? "border-primary bg-primary/5 shadow-[0_18px_50px_rgba(212,175,55,0.10)]"
                    : "border-border/70 bg-card/50")
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  {"badge" in plan ? (
                    <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-end gap-1">
                  <span className="text-3xl font-bold text-primary">{plan.price}</span>
                  {plan.cadence ? (
                    <span className="pb-1 text-sm text-muted-foreground">{plan.cadence}</span>
                  ) : null}
                </div>

                <ul className="mt-6 flex-1 space-y-3 text-sm text-foreground/90">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.name === "Enterprise" ? (
                  <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-7 block">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                ) : (
                  <Link to="/subscription" className="mt-7 block">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card/40 p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">
                  AI cost protection is built into the model
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Starter is designed around core tools that do not require paid AI. Professional
                introduces controlled AI usage. Business provides substantially higher AI capacity
                with fair-use safeguards. This keeps GROWTH commercially sustainable while giving
                customers room to scale.
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/40 p-6">
              <h2 className="font-display text-xl font-semibold">Founding customer launch</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                These are launch-stage prices while GROWTH expands its external SaaS capabilities.
                Future pricing may change for new customers as the platform, automation and AI
                capacity grow.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-border/70 bg-card/40 p-6 text-center sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Not sure which plan fits?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              See GROWTH in action first, or speak to Cossa about your team, workflow and automation
              needs. We will recommend the appropriate level rather than pushing unnecessary
              features.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
                  See GROWTH in action
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp Cossa
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
}
