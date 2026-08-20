import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicSiteShell } from "@/components/public-site-shell";

const whatsappHref =
  "https://wa.me/27678011907?text=Hi%20Cossa%2C%20I%20want%20a%2015-minute%20GROWTH%20demo.";

const plans = [
  {
    name: "Starter",
    price: "R2,500/month",
    description: "For small teams managing roughly 10–50 enquiries per month.",
    features: [
      "Basic CRM for up to 500 contacts",
      "Enquiry capture across calls, WhatsApp, email and web",
      "Follow-up tracking",
      "Basic reporting",
    ],
  },
  {
    name: "Professional",
    price: "R5,500/month",
    description: "For growing businesses managing roughly 50–200 enquiries per month.",
    featured: true,
    features: [
      "Advanced CRM with unlimited contacts",
      "Workflow automation",
      "Marketing module for content and campaigns",
      "AI-assisted drafting",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom pricing",
    description: "For larger teams, agencies and businesses with more complex requirements.",
    features: [
      "Everything in Professional",
      "White-label options",
      "Custom integrations",
      "Dedicated support",
      "Advanced analytics",
    ],
  },
] as const;

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "GROWTH Pricing | CRM, Workflow & AI for South African Businesses" },
      {
        name: "description",
        content:
          "Compare GROWTH Starter, Professional and Enterprise plans for CRM, enquiry follow-up, workflow automation, marketing and AI-supported business operations.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "GROWTH Pricing | Business Growth Intelligence" },
      {
        property: "og:description",
        content:
          "Transparent GROWTH pricing for small teams, growing businesses and larger organisations.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growth.cossanexusholdings.co.za/pricing" },
    ],
    links: [
      { rel: "canonical", href: "https://growth.cossanexusholdings.co.za/pricing" },
    ],
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
              Transparent pricing
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Choose the GROWTH plan that matches your operating load.
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Start with the level of CRM, follow-up, workflow and AI support your business needs now.
              Custom plans are available where the standard tiers do not fit.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={
                  "rounded-2xl border p-6 shadow-sm " +
                  ("featured" in plan && plan.featured
                    ? "border-primary bg-primary/5 shadow-[0_18px_50px_rgba(212,175,55,0.10)]"
                    : "border-border/70 bg-card/50")
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                  </div>
                  {"featured" in plan && plan.featured ? (
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                      Most capable
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 text-3xl font-bold text-primary">{plan.price}</div>

                <ul className="mt-6 space-y-3 text-sm text-foreground/90">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a href="/#quote-request" className="mt-7 block">
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Request a 15-minute demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border/70 bg-card/40 p-6 text-center sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Need a different commercial model?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              If a monthly subscription does not fit your operation, talk to Cossa about a custom plan,
              implementation scope or white-label arrangement.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp about GROWTH
                </Button>
              </a>
              <Link to="/">
                <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:w-auto">
                  See GROWTH in action
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
}
