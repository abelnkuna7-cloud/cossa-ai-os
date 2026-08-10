import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  LineChart,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GrowthEagleArtwork,
  GrowthProductBrand,
  ParentBrandEndorsement,
} from "@/components/brand/growth-brand";
import { PublicSiteShell } from "@/components/public-site-shell";
import { supabase } from "@/integrations/supabase/client";
import { GROWTH_BRAND } from "@/lib/brand";

const phoneNumber = "067 801 1907";
const phoneHref = "tel:+27678011907";
const whatsappHref = "https://wa.me/27678011907";
const emailHref = "mailto:cossa@cossanexusholdings.co.za";

const initialFormState = {
  name: "",
  phone: "",
  email: "",
  message: "",
};

type SubmitState = "idle" | "sending" | "sent" | "error";

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface PublicGrowthDatabaseClient {
  from: (table: "contact_messages" | "leads") => {
    insert: (row: Record<string, unknown>) => Promise<{
      error: DatabaseError | null;
    }>;
  };
}

export const Route = createFileRoute("/")({
  component: GrowthHome,
  head: () => ({
    meta: [
      {
        title: "GROWTH | Business Growth Intelligence",
      },
      {
        name: "description",
        content:
          "GROWTH gives businesses a clearer way to capture leads, follow up, organise operations and make better decisions.",
      },
      {
        property: "og:title",
        content: "GROWTH | Business Growth Intelligence",
      },
      {
        property: "og:description",
        content:
          "Business growth intelligence for clearer leads, follow-up, operations and measurable growth.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:url",
        content: "https://growth.cossanexusholdings.co.za/",
      },
      {
        property: "og:site_name",
        content: "GROWTH",
      },
      {
        property: "og:locale",
        content: "en_ZA",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
      {
        name: "twitter:title",
        content: "GROWTH | Business Growth Intelligence",
      },
      {
        name: "twitter:description",
        content:
          "Business growth intelligence for clearer leads, follow-up, operations and measurable growth.",
      },
      {
        name: "robots",
        content: "index, follow",
      },
      {
        property: "og:image",
        content: GROWTH_BRAND.assets.growthFull,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://growth.cossanexusholdings.co.za/",
      },
    ],
  }),
});

function normalisePhone(value: string): string {
  return value.replace(/[^\d+]/g, "").trim();
}

function normaliseEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return email || null;
}

function createLeadNotes(message: string): string {
  return [
    "Submitted through growth.cossanexusholdings.co.za.",
    "",
    "Customer request:",
    message,
  ].join("\n");
}

function GrowthHome() {
  const [form, setForm] = useState(initialFormState);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const capabilities = [
    {
      icon: Users,
      title: "Keep serious enquiries moving",
      text: "Capture the customer need clearly and give the right person a practical next step.",
    },
    {
      icon: Bot,
      title: "Work from trusted information",
      text: "Use practical support grounded in approved company knowledge and clear human review.",
    },
    {
      icon: LineChart,
      title: "Improve with evidence",
      text: "Bring the right customer channels and operational information together before making bigger decisions.",
    },
  ];

  const organisationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cossa Nexus Holdings (Pty) Ltd",
    url: "https://growth.cossanexusholdings.co.za",
    email: "cossa@cossanexusholdings.co.za",
    telephone: "+27678011907",
    slogan: GROWTH_BRAND.brandPromise,
    sameAs: ["https://cossanexusholdings.co.za", "https://nexdocs.cossanexusholdings.co.za"],
  };

  async function submitQuoteRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitState === "sending") {
      return;
    }

    const name = form.name.trim();
    const phone = normalisePhone(form.phone);
    const email = normaliseEmail(form.email);
    const message = form.message.trim();

    if (!name || !phone || !message) {
      setSubmitState("error");
      setSubmitError(
        "Please enter your name, phone number and a short description of what you need.",
      );
      return;
    }

    setSubmitState("sending");
    setSubmitError(null);

    const database = supabase as unknown as PublicGrowthDatabaseClient;

    /*
     * Record 1: original public enquiry.
     *
     * This remains the unedited customer submission and can be used by the
     * future receptionist, enquiry inbox and audit workflow.
     */
    const { error: contactMessageError } = await database.from("contact_messages").insert({
      name,
      phone,
      email,
      subject: "Growth website quote request",
      message,
      status: "unread",
    });

    if (contactMessageError) {
      console.error("Unable to save Growth contact message:", contactMessageError);

      setSubmitState("error");
      setSubmitError(
        "We could not save your request. Please call, WhatsApp or email Cossa directly.",
      );
      return;
    }

    /*
     * Record 2: actionable CRM lead.
     *
     * The Command Center and Sales → Leads currently calculate their figures
     * from public.leads, so the website enquiry must also create a lead.
     */
    const { error: leadError } = await database.from("leads").insert({
      full_name: name,
      name,
      phone,
      email,
      service: "Business enquiry",
      location: null,
      source: "growth_website_quote_request",
      status: "New",
      stage: "New",
      notes: createLeadNotes(message),
      score: 40,
      value: 0,
      estimated_value: 0,
    });

    if (leadError) {
      console.error("The enquiry was saved but the CRM lead could not be created:", leadError);

      setSubmitState("error");
      setSubmitError(
        "Your request was received, but our CRM could not complete the lead record. Please call or WhatsApp Cossa so we can assist immediately.",
      );
      return;
    }

    setForm(initialFormState);
    setSubmitState("sent");
  }

  return (
    <PublicSiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organisationSchema),
        }}
      />

      <section id="contact" className="relative overflow-hidden px-4 py-10 md:py-12">
        <div className="pointer-events-none absolute -left-32 top-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[42%] bg-[radial-gradient(ellipse_at_top_right,rgba(217,177,36,0.12),transparent_70%)] lg:block" />

        <div className="relative mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Cossa Nexus Holdings | Business Growth Intelligence
            </p>

            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.08] md:text-5xl lg:text-6xl">
              Turn every serious enquiry into a clearer{" "}
              <span className="text-gradient-gold">next step.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              GROWTH is Cossa&apos;s practical business growth platform for organisations that want
              a more disciplined way to capture customer needs, organise follow-up and keep the
              right people close to important decisions.
            </p>

            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              <a href={phoneHref}>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Phone className="mr-2 h-4 w-4" />
                  Call {phoneNumber}
                </Button>
              </a>

              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp us
                </Button>
              </a>

              <a href="#quote-request">
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Request a quote
                </Button>
              </a>

              <a href={emailHref}>
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email Cossa
                </Button>
              </a>
            </div>
          </div>

          <form
            id="quote-request"
            onSubmit={submitQuoteRequest}
            className="relative isolate overflow-hidden rounded-2xl border border-primary/35 bg-card/95 shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
          >
            <section className="relative min-h-[248px] overflow-hidden border-b border-primary/25 bg-black p-6 md:min-h-[270px] md:p-7">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,177,36,0.16),transparent_52%)]" />
              <GrowthEagleArtwork
                eager
                className="absolute -bottom-10 -right-10 h-[118%] w-[70%] object-contain object-[center_58%] opacity-100 md:-right-2 md:w-[62%]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.92)_43%,rgba(0,0,0,0.34)_76%,rgba(0,0,0,0.1)_100%)]" />

              <div className="relative flex min-h-[200px] flex-col justify-between md:min-h-[214px]">
                <div className="max-w-[59%] sm:max-w-[54%]">
                  <GrowthProductBrand className="max-w-full" />

                  <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Business growth intelligence
                  </p>

                  <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-foreground">
                    Build stronger customer relationships.
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A clear route from enquiry to response.
                  </p>
                </div>

                <ParentBrandEndorsement className="max-w-[60%]" />
              </div>
            </section>

            <div className="relative p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Tell us what you need
              </p>

              <h2 className="mt-2 font-display text-2xl font-semibold">
                Request a quote or speak with us
              </h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Share the essential details. Your request will be recorded securely and reviewed by
                Cossa. For immediate assistance, call {phoneNumber}.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>

                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>

                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    maxLength={30}
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">
                    Email address <span className="text-muted-foreground">(optional)</span>
                  </Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="message">What can we help with?</Label>

                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    minLength={10}
                    maxLength={3000}
                    placeholder="Describe the service, project or business challenge, including the location and preferred timeline where relevant."
                    value={form.message}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitState === "sending"}
                className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitState === "sending" ? "Recording your request…" : "Send quote request"}

                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {submitState === "sent" && (
                <p role="status" className="mt-3 text-sm text-emerald-500">
                  Thank you. Your request has been recorded and added to our customer follow-up
                  system. Call {phoneNumber} for urgent assistance.
                </p>
              )}

              {submitState === "error" && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {submitError ??
                    `We could not complete your request. Please call ${phoneNumber}, WhatsApp us, or email cossa@cossanexusholdings.co.za.`}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>

      <section id="solutions" className="border-y border-border/60 bg-card/30 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold">
            Built for the work behind sustainable growth
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {capabilities.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-border/60 bg-background p-5"
              >
                <item.icon className="h-6 w-6 text-primary" />

                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Start with the customer need
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold">
              Build the right response around it.
            </h2>

            <p className="mt-3 text-muted-foreground">
              Whether you need help with customer growth, construction, facility services,
              technology or an online store, Cossa starts with the problem you need solved and
              brings the right people and information to the next step.
            </p>
          </div>

          <div className="rounded-xl border border-primary/25 bg-primary/5 p-6">
            <ShieldCheck className="h-6 w-6 text-primary" />

            <h3 className="mt-3 font-semibold">Built with accountable control</h3>

            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[
                "Verified knowledge before company-specific claims",
                "Evidence and audit records for important work",
                "Human approval for high-risk actions",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-6xl flex-wrap gap-3">
          <Link to="/construction-growth">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Construction solutions
            </Button>
          </Link>

          <Link to="/facility-services-growth">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Facility service solutions
            </Button>
          </Link>

          <Link to="/sme-growth">
            <Button
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              Business growth solutions
            </Button>
          </Link>
        </div>
      </section>
    </PublicSiteShell>
  );
}
