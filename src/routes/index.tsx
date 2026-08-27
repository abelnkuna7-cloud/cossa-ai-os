import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
  Workflow,
  X,
  Zap,
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

import { trackGrowthMeasurementEvent } from "@/lib/growth-measurement";

/* -------------------------------------------------------------------------- */
/* CONTACT                                                                    */
/* -------------------------------------------------------------------------- */

const phoneNumber = "067 801 1907";

const phoneHref = "tel:+27678011907";

const whatsappHref = "https://wa.me/27678011907";

const emailAddress = "cossa@cossanexusholdings.co.za";

const emailHref = `mailto:${emailAddress}`;

/* -------------------------------------------------------------------------- */
/* FORM                                                                       */
/* -------------------------------------------------------------------------- */

const initialFormState = {
  name: "",
  phone: "",
  email: "",
  message: "",
  consentToResponse: false,
};

type SubmitState = "idle" | "sending" | "sent" | "error";

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface PublicGrowthDatabaseClient {
  rpc: (
    functionName: "ingest_cossa_lead",
    parameters: Record<string, unknown>,
  ) => Promise<{
    data: Array<{ lead_id: string; is_new: boolean }> | null;
    error: DatabaseError | null;
  }>;
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD PREVIEWS                                                         */
/* -------------------------------------------------------------------------- */

type DashboardPreviewType = "crm" | "pipeline" | "operations" | "intelligence" | "marketing" | "ai";

interface DashboardPreview {
  eyebrow: string;
  title: string;
  description: string;
  highlight: string;
  items: string[];
  type: DashboardPreviewType;
}

const DASHBOARD_PREVIEWS: readonly DashboardPreview[] = [
  {
    eyebrow: "CRM preview",

    title: "See every legitimate enquiry more clearly.",

    description:
      "Instead of depending on memory, scattered WhatsApp messages, calls and handwritten notes, GROWTH can help organise legitimate customer enquiries into a clearer working view.",

    highlight: "Enquiry → follow-up → next action",

    items: [
      "Customer contact information",
      "Lead source",
      "Current stage",
      "Follow-up notes",
      "Next action",
    ],

    type: "crm",
  },

  {
    eyebrow: "Sales pipeline preview",

    title: "Know which opportunities still need attention.",

    description:
      "A business can be busy and still lose opportunities. A structured pipeline helps make unfinished follow-up visible before legitimate enquiries disappear into daily operations.",

    highlight: "New → contacted → progressing → next step",

    items: [
      "New opportunities",
      "Follow-up position",
      "Current status",
      "Owner visibility",
      "Pipeline organisation",
    ],

    type: "pipeline",
  },

  {
    eyebrow: "Operations preview",

    title: "Turn business activity into organised work.",

    description:
      "Move from 'someone should handle this' to a clearer operating process showing what came in, who needs to handle it and what should happen next.",

    highlight: "Capture → organise → assign → act",

    items: [
      "Structured requests",
      "Internal workflow",
      "Task ownership",
      "Operational visibility",
      "Action tracking",
    ],

    type: "operations",
  },

  {
    eyebrow: "Business intelligence preview",

    title: "Make decisions from clearer information.",

    description:
      "The goal is not another complicated dashboard. It is a useful operating picture that helps the owner identify unfinished work, activity patterns and areas requiring attention.",

    highlight: "Information → insight → decision → action",

    items: [
      "Business activity overview",
      "Priority visibility",
      "Lead activity context",
      "Decision support",
      "Growth planning",
    ],

    type: "intelligence",
  },

  {
    eyebrow: "Marketing department preview",

    title: "Stop marketing without a clear operating plan.",

    description:
      "GROWTH can support a more disciplined marketing workflow where campaigns, content ideas, platforms, creative requirements and follow-up actions are organised around real business objectives.",

    highlight: "Strategy → content → campaign → enquiry",

    items: [
      "Campaign planning",
      "Content calendar",
      "Platform-specific content",
      "Creative requirements",
      "Lead-generation focus",
    ],

    type: "marketing",
  },

  {
    eyebrow: "AI workforce preview",

    title: "Give routine business work a clearer digital operating layer.",

    description:
      "Cossa AI can support internal planning, analysis, drafting and workflow coordination while important financial, legal, account-control and irreversible decisions remain under human authority.",

    highlight: "Business context → AI support → review → action",

    items: [
      "AI business support",
      "Internal task coordination",
      "Marketing assistance",
      "Operational analysis",
      "Human-controlled decisions",
    ],

    type: "ai",
  },
];

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

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
          "Stop losing opportunities to scattered follow-up. GROWTH helps businesses organise enquiries, CRM activity, marketing, workflows and business decisions.",
      },

      {
        property: "og:title",

        content: "GROWTH | Business Growth Intelligence",
      },

      {
        property: "og:description",

        content:
          "Turn scattered enquiries, inconsistent follow-up and disconnected business activity into a clearer operating system.",
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
          "A clearer system for enquiries, follow-up, marketing, customer workflows and business growth decisions.",
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

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

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

function createSourceRecordId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `growth-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function campaignAttribution(): Record<string, string> {
  const parameters = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

  return keys.reduce<Record<string, string>>((attribution, key) => {
    const value = parameters.get(key)?.trim();
    if (value) attribution[key] = value.slice(0, 200);
    return attribution;
  }, {});
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function GrowthHome() {
  const [form, setForm] = useState(initialFormState);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const [submitError, setSubmitError] = useState<string | null>(null);

  const sourceRecordIdRef = useRef<string | null>(null);

  const [activePreview, setActivePreview] = useState(0);

  const [showLeadPopup, setShowLeadPopup] = useState(false);

  /* ------------------------------------------------------------------------ */
  /* STRUCTURED DATA                                                          */
  /* ------------------------------------------------------------------------ */

  const organisationSchema = {
    "@context": "https://schema.org",

    "@type": "Organization",

    name: "Cossa Nexus Holdings (Pty) Ltd",

    url: "https://growth.cossanexusholdings.co.za",

    email: emailAddress,

    telephone: "+27678011907",

    slogan: GROWTH_BRAND.brandPromise,

    sameAs: ["https://cossanexusholdings.co.za", "https://nexdocs.cossanexusholdings.co.za"],
  };

  /* ------------------------------------------------------------------------ */
  /* PREVIEW ROTATION                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActivePreview((current) => (current + 1) % DASHBOARD_PREVIEWS.length);
    }, 6_500);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* POPUP                                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const alreadyDismissed = window.sessionStorage.getItem("growth-lead-popup-dismissed");

    if (alreadyDismissed) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowLeadPopup(true);
    }, 9_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  function closeLeadPopup() {
    setShowLeadPopup(false);

    window.sessionStorage.setItem("growth-lead-popup-dismissed", "true");
  }

  /* ------------------------------------------------------------------------ */
  /* FORM SUBMIT                                                              */
  /* ------------------------------------------------------------------------ */

  async function submitQuoteRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitState === "sending") {
      return;
    }

    const name = form.name.trim();

    const phone = normalisePhone(form.phone);

    const email = normaliseEmail(form.email);

    const message = form.message.trim();

    if (!name || !phone || !message || !form.consentToResponse) {
      setSubmitState("error");

      setSubmitError(
        "Please enter your name, phone number, a short description of what you need, and confirm that Cossa may respond to your enquiry.",
      );

      return;
    }

    setSubmitState("sending");

    setSubmitError(null);

    const database = supabase as unknown as PublicGrowthDatabaseClient;

    const sourceRecordId = sourceRecordIdRef.current ?? createSourceRecordId();
    sourceRecordIdRef.current = sourceRecordId;

    const { data: intakeResult, error: leadError } = await database.rpc("ingest_cossa_lead", {
      p_source_app: "cossa_growth",
      p_source_record_id: sourceRecordId,
      p_lead_type: "quote_request",
      p_full_name: name,
      p_email: email,
      p_phone: phone,
      p_service: "Business growth consultation",
      p_location: null,
      p_notes: createLeadNotes(message),
      p_company: null,
      p_raw_payload: {
        source_page: window.location.pathname,
        campaign_attribution: campaignAttribution(),
        response_contact_consent: true,
      },
    });

    if (leadError || !intakeResult?.[0]?.lead_id) {
      console.error(
        "The Growth enquiry intake did not return a valid CRM lead:",
        leadError ?? "No lead identifier returned",
      );

      setSubmitState("error");

      setSubmitError(
        "We could not add your enquiry to the Cossa follow-up system. Please call or WhatsApp Cossa so we can assist immediately.",
      );

      return;
    }

    setForm(initialFormState);

    sourceRecordIdRef.current = null;

    setSubmitState("sent");

    trackGrowthMeasurementEvent("growth_quote_request_submitted", {
      source: "growth_website",
    });
  }

  return (
    <PublicSiteShell showCallToAction={false}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organisationSchema),
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                               */}
      {/* ------------------------------------------------------------------ */}

      <section id="contact" className="relative overflow-hidden px-4 pb-12 pt-8 md:pb-16 md:pt-12">
        <div className="pointer-events-none absolute -left-32 top-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[42%] bg-[radial-gradient(ellipse_at_top_right,rgba(217,177,36,0.12),transparent_70%)] lg:block" />

        <div className="relative mx-auto grid w-full max-w-7xl items-start gap-10 lg:grid-cols-[1.08fr_0.92fr] xl:gap-14">
          {/* LEFT */}

          <div className="min-w-0 w-full">
            <p className="max-w-full text-[11px] font-semibold uppercase leading-5 tracking-[0.18em] text-primary sm:text-xs sm:tracking-[0.22em]">
              Business Growth Intelligence for ambitious teams
            </p>

            <h1 className="mt-4 max-w-3xl break-words font-display text-[2.35rem] font-semibold leading-[1.04] sm:text-5xl lg:text-[3.9rem]">
              Your business can be busy and still be{" "}
              <span className="text-gradient-gold">losing opportunities.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base md:text-lg">
              A customer calls. Another sends WhatsApp. Someone asks for a quotation. A follow-up
              gets delayed. Notes live in different places. Everyone is busy — but nobody has one
              clear picture of what still needs attention.
            </p>

            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-foreground/90 sm:text-base">
              That is where opportunity starts leaking.
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              GROWTH helps create a clearer operating system around enquiries, follow-up, marketing,
              customer information and business decisions.
            </p>

            {/* PAIN POINTS */}

            <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              <PainPointCard
                title="Enquiries everywhere?"
                description="Calls, WhatsApp, email and website enquiries become harder to manage when they live in separate places with no clear operating view."
              />

              <PainPointCard
                title="Follow-up slipping?"
                description="A legitimate opportunity can cool down simply because nobody has a clear next action or ownership of the follow-up."
              />

              <PainPointCard
                title="Marketing without a system?"
                description="Posting more content is not automatically growth. Marketing works better when campaigns, content and customer action support a clear business objective."
              />

              <PainPointCard
                title="Running the business from memory?"
                description="The more activity your business handles, the more dangerous it becomes to depend on memory alone for priorities, enquiries and unfinished work."
              />
            </div>

            {/* OPERATING MODEL */}

            <div className="mt-6 w-full max-w-2xl rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-xs sm:tracking-[0.18em]">
                Replace scattered activity with a clearer operating system
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <OperatingStep
                  icon={FileText}
                  title="Capture"
                  description="Record legitimate enquiries and retain what the customer actually asked for."
                />

                <OperatingStep
                  icon={Workflow}
                  title="Organise"
                  description="Give customer information, follow-up and internal work a clearer structure."
                />

                <OperatingStep
                  icon={Target}
                  title="Act"
                  description="See what deserves attention next and move legitimate opportunities forward."
                />
              </div>
            </div>

            {/* CTA */}

            <div className="mt-7 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
              <a
                href={phoneHref}
                className="w-full sm:w-auto"
                onClick={() =>
                  trackGrowthMeasurementEvent("growth_contact_click", {
                    method: "phone",

                    placement: "hero",
                  })
                }
              >
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:min-w-52">
                  <Phone className="mr-2 h-4 w-4" />
                  Talk to Cossa
                </Button>
              </a>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto"
                onClick={() =>
                  trackGrowthMeasurementEvent("growth_contact_click", {
                    method: "whatsapp",

                    placement: "hero",
                  })
                }
              >
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10 sm:min-w-52"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp Cossa
                </Button>
              </a>
            </div>

            <a
              href={emailHref}
              onClick={() =>
                trackGrowthMeasurementEvent("growth_contact_click", {
                  method: "email",

                  placement: "hero",
                })
              }
              className="mt-4 inline-flex max-w-full items-start gap-2 break-all text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />

              <span>Prefer email? {emailAddress}</span>
            </a>
          </div>

          {/* FORM */}

          <form
            id="quote-request"
            onSubmit={submitQuoteRequest}
            className="relative isolate w-full min-w-0 overflow-hidden rounded-2xl border border-primary/35 bg-card/95 shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
          >
            <section className="relative min-h-[180px] overflow-hidden border-b border-primary/25 bg-black p-5 sm:min-h-[190px] md:min-h-[210px] md:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,177,36,0.16),transparent_52%)]" />

              <GrowthEagleArtwork
                eager
                className="absolute -bottom-10 -right-16 h-[118%] w-[82%] object-contain object-[center_58%] opacity-100 sm:-right-10 sm:w-[72%] md:-right-2 md:w-[62%]"
              />

              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.94)_42%,rgba(0,0,0,0.42)_72%,rgba(0,0,0,0.1)_100%)]" />

              <div className="relative flex min-h-[140px] flex-col justify-between md:min-h-[162px]">
                <div className="max-w-[68%] sm:max-w-[56%]">
                  <GrowthProductBrand className="max-w-full" />

                  <h2 className="mt-5 font-display text-lg font-semibold leading-tight text-foreground sm:text-xl md:text-2xl">
                    Turn customer interest into a clearer next action.
                  </h2>
                </div>

                <ParentBrandEndorsement className="max-w-[68%] sm:max-w-[60%]" />
              </div>
            </section>

            <div className="relative p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Start with the problem
              </p>

              <h2 className="mt-1 font-display text-xl font-semibold md:text-2xl">
                Where is your business losing time, visibility or opportunities?
              </h2>

              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Tell Cossa what is difficult to manage. We can start from the problem instead of
                trying to sell you a generic solution.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                  <Label htmlFor="message">What can we help improve?</Label>

                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={3}
                    minLength={10}
                    maxLength={3000}
                    placeholder="Example: We receive enquiries from different channels, but follow-up is inconsistent and we need a clearer CRM and workflow."
                    value={form.message}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,

                        message: event.target.value,
                      }))
                    }
                  />
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/35 p-3 text-xs leading-5 text-muted-foreground sm:col-span-2">
                  <input
                    type="checkbox"
                    required
                    checked={form.consentToResponse}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        consentToResponse: event.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                  />
                  <span>
                    I agree that Cossa may use these details to respond to this enquiry and prepare
                    the requested consultation or quotation. This does not subscribe me to unrelated
                    marketing.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={submitState === "sending"}
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitState === "sending" ? "Recording your request…" : "Send my enquiry"}

                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                No pressure. Start by explaining the business problem and what you are trying to
                improve.
              </p>

              {submitState === "sent" && (
                <p role="status" className="mt-3 text-sm text-emerald-500">
                  Thank you. Your request has been recorded and added to our customer follow-up
                  system. Call {phoneNumber} for urgent assistance.
                </p>
              )}

              {submitState === "error" && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {submitError ??
                    `We could not complete your request. Please call ${phoneNumber}, WhatsApp us, or email ${emailAddress}.`}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* PAIN → CONSEQUENCE → SOLUTION                                      */}
      {/* ------------------------------------------------------------------ */}

      <section className="border-y border-border/60 bg-card/25 px-4 py-12 md:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              The hidden cost of disorganisation
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Businesses do not only lose opportunities because they need more leads.
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              Opportunities can also be lost after the enquiry arrives — when information is
              scattered, follow-up is inconsistent or nobody has a clear next action.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <HookCard
              icon={UsersRound}
              eyebrow="Pain"
              title="Customers are interested, but the follow-up process is fragmented."
              body="Calls, WhatsApp messages, emails and web enquiries can become difficult to manage when there is no shared operating view."
            />

            <HookCard
              icon={ClipboardCheck}
              eyebrow="Consequence"
              title="Good opportunities can become old opportunities."
              body="When the next action is unclear, legitimate enquiries can sit too long, ownership becomes uncertain and the customer experience becomes inconsistent."
            />

            <HookCard
              icon={BrainCircuit}
              eyebrow="Solution"
              title="Create a system that helps the business know what happens next."
              body="GROWTH brings CRM, workflow, marketing support and business intelligence into a clearer operating environment."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* VALUE STACK                                                         */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                One operating environment
              </p>

              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                You should not need five disconnected systems just to understand{" "}
                <span className="text-gradient-gold">what your business needs next.</span>
              </h2>

              <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
                GROWTH is designed around a simple idea: customer activity, marketing, follow-up,
                operations and decision support become more useful when the business can see them as
                parts of one operating process.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ValueCard
                icon={UsersRound}
                title="CRM"
                pain="Stop wondering where the enquiry went."
                solution="Keep legitimate customer information, source, stage and next action in a clearer working view."
              />

              <ValueCard
                icon={Workflow}
                title="Workflow"
                pain="Stop relying on 'someone will handle it'."
                solution="Create a clearer path from incoming request to internal ownership and follow-up."
              />

              <ValueCard
                icon={Megaphone}
                title="Marketing"
                pain="Stop creating content without a business purpose."
                solution="Plan campaigns, content, channels and calls to action around actual business objectives."
              />

              <ValueCard
                icon={BrainCircuit}
                title="AI support"
                pain="Stop spending owner time on every routine internal task."
                solution="Use AI for safe planning, drafting, analysis and coordination while keeping important decisions human-controlled."
              />

              <ValueCard
                icon={BarChart3}
                title="Business intelligence"
                pain="Stop making every decision from fragmented information."
                solution="Turn authorised business records into a clearer operating picture for prioritisation and planning."
              />

              <ValueCard
                icon={Target}
                title="Growth focus"
                pain="Stop measuring activity as if activity automatically means progress."
                solution="Connect work to outcomes such as better follow-up, stronger visibility, enquiries and more disciplined execution."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* DASHBOARD PREVIEW                                                  */}
      {/* ------------------------------------------------------------------ */}

      <section className="relative overflow-hidden border-y border-border/60 bg-card/20 px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              See the operating idea
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Imagine opening your business dashboard and actually knowing{" "}
              <span className="text-gradient-gold">what needs attention.</span>
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              The previews below show the kind of organised operating environment GROWTH is designed
              to support — CRM, pipeline, operations, intelligence, marketing and AI-assisted
              workflows.
            </p>

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Interface examples are illustrative and do not represent live customer performance or
              fabricated business results.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
            <div className="flex flex-col justify-between rounded-2xl border border-primary/25 bg-card/50 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {DASHBOARD_PREVIEWS[activePreview].eyebrow}
                </p>

                <h3 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
                  {DASHBOARD_PREVIEWS[activePreview].title}
                </h3>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {DASHBOARD_PREVIEWS[activePreview].description}
                </p>

                <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary">
                    Operating flow
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {DASHBOARD_PREVIEWS[activePreview].highlight}
                  </p>
                </div>

                <div className="mt-5 grid gap-2">
                  {DASHBOARD_PREVIEWS[activePreview].items.map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {DASHBOARD_PREVIEWS.map((preview, index) => (
                    <button
                      key={preview.title}
                      type="button"
                      aria-label={`Show preview ${index + 1}: ${preview.eyebrow}`}
                      onClick={() => setActivePreview(index)}
                      className={
                        index === activePreview
                          ? "h-2.5 w-7 rounded-full bg-primary transition-all"
                          : "h-2.5 w-2.5 rounded-full bg-border transition-all hover:bg-primary/60"
                      }
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Previous dashboard preview"
                    onClick={() =>
                      setActivePreview(
                        (current) =>
                          (current - 1 + DASHBOARD_PREVIEWS.length) % DASHBOARD_PREVIEWS.length,
                      )
                    }
                    className="border-primary/30 text-primary"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Next dashboard preview"
                    onClick={() =>
                      setActivePreview((current) => (current + 1) % DASHBOARD_PREVIEWS.length)
                    }
                    className="border-primary/30 text-primary"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DashboardMock type={DASHBOARD_PREVIEWS[activePreview].type} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BROCHURE SLIDES                                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Your business growth system
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              GROWTH is designed to help the business operate{" "}
              <span className="text-gradient-gold">with more clarity.</span>
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              Scroll through the operating areas below. Each one addresses a different point where
              business opportunities, time or visibility can be lost.
            </p>
          </div>

          <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5">
            <BrochureSlide
              icon={LayoutDashboard}
              eyebrow="01 · CRM visibility"
              title="Stop searching through conversations for the customer you need to follow up."
              description="Create a clearer view of legitimate enquiries, contact details, stages, notes and next actions."
            />

            <BrochureSlide
              icon={Workflow}
              eyebrow="02 · Workflow"
              title="Give incoming work somewhere to go."
              description="Turn requests into structured internal actions so important business activity does not depend entirely on memory."
            />

            <BrochureSlide
              icon={Megaphone}
              eyebrow="03 · Marketing department"
              title="Build marketing around customer attention — not random posting."
              description="Coordinate strategy, content planning, platform-specific messaging, campaign concepts, creative requirements and calls to action."
            />

            <BrochureSlide
              icon={CalendarDays}
              eyebrow="04 · Content system"
              title="Know what to publish, why you are publishing it and what action it should support."
              description="Develop useful social media calendars and content across Facebook, Instagram, TikTok, LinkedIn, YouTube, WhatsApp, X and Pinterest."
            />

            <BrochureSlide
              icon={BrainCircuit}
              eyebrow="05 · AI workforce"
              title="Use AI to support the work that should not consume all of the owner's time."
              description="Support internal research, analysis, drafting, planning and coordination while high-risk authority remains under human control."
            />

            <BrochureSlide
              icon={BarChart3}
              eyebrow="06 · Intelligence"
              title="Make decisions from a clearer operating picture."
              description="Use authorised information to identify priorities, unfinished work and areas that may need management attention."
            />

            <BrochureSlide
              icon={ShieldCheck}
              eyebrow="07 · Control"
              title="Automation should support the business — not take control away from the owner."
              description="Financial, legal, credential, account-control and irreversible actions remain controlled by authorised people."
            />

            <BrochureSlide
              icon={TrendingUp}
              eyebrow="08 · Growth"
              title="Build a stronger system before simply chasing more activity."
              description="Better visibility, disciplined follow-up, useful marketing and stronger internal execution create a more solid foundation for business development."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CONVERSION SECTION                                                  */}
      {/* ------------------------------------------------------------------ */}

      <section className="border-y border-border/60 bg-card/25 px-4 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Ask yourself this
              </p>

              <h2 className="mt-3 max-w-4xl font-display text-3xl font-semibold sm:text-4xl">
                If 10 serious enquiries arrived this week, would your business know{" "}
                <span className="text-gradient-gold">exactly what happens to each one?</span>
              </h2>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                If the answer depends on one person's memory, scattered conversations or manually
                checking several places, the problem is not simply marketing.
              </p>

              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-foreground/90 sm:text-base">
                The operating system needs attention.
              </p>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                GROWTH focuses on the whole journey
              </p>

              <div className="mt-5 space-y-4">
                <JourneyStep
                  number="01"
                  title="Get attention"
                  text="Use clearer marketing and customer-facing content."
                />

                <JourneyStep
                  number="02"
                  title="Capture interest"
                  text="Record legitimate enquiries instead of leaving them scattered."
                />

                <JourneyStep
                  number="03"
                  title="Organise follow-up"
                  text="Give the opportunity a clear stage, owner and next action."
                />

                <JourneyStep
                  number="04"
                  title="Support decisions"
                  text="Use organised information to help management decide what deserves attention."
                />
              </div>

              <a href="#quote-request" className="mt-6 block">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Show Cossa where we need help
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FINAL CTA                                                           */}
      {/* ------------------------------------------------------------------ */}

      <section className="px-4 py-14 md:py-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/30 bg-[radial-gradient(circle_at_top_right,rgba(217,177,36,0.14),transparent_45%)] p-6 sm:p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Your next legitimate enquiry deserves a system
              </p>

              <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold sm:text-4xl">
                More activity will not fix a business that cannot clearly see what needs to happen
                next.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Tell Cossa where your business is losing time, follow-up consistency, marketing
                clarity or operational visibility. We can start from the problem and work forward.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              <a href="#quote-request">
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 md:min-w-52">
                  Start the conversation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>

              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10 md:min-w-52"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp Cossa
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FLOATING WHATSAPP                                                   */}
      {/* ------------------------------------------------------------------ */}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Cossa on WhatsApp"
        onClick={() =>
          trackGrowthMeasurementEvent("growth_contact_click", {
            method: "whatsapp",

            placement: "floating_button",
          })
        }
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_40px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-4 w-4" />

        <span className="hidden sm:inline">WhatsApp Cossa</span>
      </a>

      {/* ------------------------------------------------------------------ */}
      {/* LEAD POPUP                                                          */}
      {/* ------------------------------------------------------------------ */}

      {showLeadPopup ? (
        <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md sm:bottom-24 sm:left-auto sm:right-6 sm:mx-0">
          <div className="relative max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border border-primary/35 bg-card p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

            <button
              type="button"
              aria-label="Close message"
              onClick={closeLeadPopup}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative pr-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Quick question
              </p>

              <h2 className="mt-2 font-display text-xl font-semibold">
                Are you trying to get more customers before fixing what happens to the enquiries you
                already receive?
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                More marketing can create more activity. But if follow-up, CRM and internal
                workflows are unclear, more activity can simply create more confusion.
              </p>

              <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                Start by showing us where the process is breaking.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a href="#quote-request" onClick={closeLeadPopup}>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Tell us the problem
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>

                <a href={whatsappHref} target="_blank" rel="noreferrer" onClick={closeLeadPopup}>
                  <Button
                    variant="outline"
                    className="w-full border-primary/40 text-primary hover:bg-primary/10"
                  >
                    WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PublicSiteShell>
  );
}

/* -------------------------------------------------------------------------- */
/* PAIN POINT CARD                                                            */
/* -------------------------------------------------------------------------- */

function PainPointCard({
  title,
  description,
}: {
  title: string;

  description: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-primary/20 bg-card/40 p-4">
      <p className="break-words text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary sm:text-xs sm:tracking-[0.16em]">
        {title}
      </p>

      <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* OPERATING STEP                                                             */
/* -------------------------------------------------------------------------- */

function OperatingStep({
  icon: Icon,

  title,
  description,
}: {
  icon: typeof FileText;

  title: string;

  description: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>

      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HOOK CARD                                                                  */
/* -------------------------------------------------------------------------- */

function HookCard({
  icon: Icon,

  eyebrow,
  title,
  body,
}: {
  icon: typeof UsersRound;

  eyebrow: string;

  title: string;

  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* VALUE CARD                                                                 */
/* -------------------------------------------------------------------------- */

function ValueCard({
  icon: Icon,

  title,
  pain,
  solution,
}: {
  icon: typeof UsersRound;

  title: string;

  pain: string;

  solution: string;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/45 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Icon className="h-5 w-5" />
        </div>

        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>

      <div className="mt-4 rounded-xl border border-destructive/15 bg-destructive/5 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Without structure
        </p>

        <p className="mt-1 text-sm leading-6 text-foreground/85">{pain}</p>
      </div>

      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          With GROWTH
        </p>

        <p className="mt-1 text-sm leading-6 text-muted-foreground">{solution}</p>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* BROCHURE SLIDE                                                             */
/* -------------------------------------------------------------------------- */

function BrochureSlide({
  icon: Icon,

  eyebrow,
  title,
  description,
}: {
  icon: typeof LayoutDashboard;

  eyebrow: string;

  title: string;

  description: string;
}) {
  return (
    <article className="min-w-[86%] snap-center rounded-2xl border border-primary/20 bg-background/50 p-5 sm:min-w-[48%] lg:min-w-[31%]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        {eyebrow}
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* JOURNEY STEP                                                               */
/* -------------------------------------------------------------------------- */

function JourneyStep({
  number,
  title,
  text,
}: {
  number: string;

  title: string;

  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-semibold text-primary">
        {number}
      </div>

      <div>
        <p className="text-sm font-semibold">{title}</p>

        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD MOCK                                                             */
/* -------------------------------------------------------------------------- */

function DashboardMock({ type }: { type: DashboardPreviewType }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-2xl border border-primary/30 bg-black p-2.5 shadow-[0_24px_90px_rgba(0,0,0,0.55)] sm:p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,177,36,0.12),transparent_46%)]" />

      <div className="relative min-w-0 overflow-hidden rounded-xl border border-border/60 bg-[#090909]">
        <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <LayoutDashboard className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary">GROWTH</p>

              <p className="truncate text-xs font-semibold">Business operating preview</p>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-primary/25 bg-primary/5 px-2 py-1 text-[8px] uppercase tracking-[0.12em] text-primary sm:text-[9px]">
            Illustrative
          </span>
        </div>

        <div className="grid min-h-[430px] grid-cols-[52px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)]">
          <aside className="border-r border-border/50 p-1.5 sm:p-3">
            <div className="space-y-2">
              {[
                {
                  icon: LayoutDashboard,

                  label: "Overview",
                },

                {
                  icon: UsersRound,

                  label: "CRM",
                },

                {
                  icon: Workflow,

                  label: "Workflow",
                },

                {
                  icon: Megaphone,

                  label: "Marketing",
                },

                {
                  icon: BrainCircuit,

                  label: "AI",
                },

                {
                  icon: BarChart3,

                  label: "Insights",
                },
              ].map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className={
                      index === 0
                        ? "flex items-center gap-2 rounded-lg bg-primary/10 p-2 text-primary"
                        : "flex items-center gap-2 rounded-lg p-2 text-muted-foreground"
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />

                    <span className="hidden text-[11px] sm:inline">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0 p-2.5 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              <MockMetric label="New" value="—" />

              <MockMetric label="In progress" value="—" />

              <MockMetric label="Needs attention" value="—" />
            </div>

            {type === "crm" ? (
              <CrmPreview />
            ) : type === "pipeline" ? (
              <PipelinePreview />
            ) : type === "operations" ? (
              <OperationsPreview />
            ) : type === "marketing" ? (
              <MarketingPreview />
            ) : type === "ai" ? (
              <AiPreview />
            ) : (
              <IntelligencePreview />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MOCK METRIC                                                                */
/* -------------------------------------------------------------------------- */

function MockMetric({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-card/50 p-2.5 sm:p-3">
      <p className="truncate text-[8px] uppercase tracking-[0.12em] text-muted-foreground sm:text-[9px] sm:tracking-[0.15em]">
        {label}
      </p>

      <p className="mt-2 font-display text-lg font-semibold text-primary sm:text-xl">{value}</p>

      <p className="mt-1 hidden text-[9px] leading-4 text-muted-foreground sm:block">
        Live values appear only when authorised records exist.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CRM MOCK                                                                   */
/* -------------------------------------------------------------------------- */

function CrmPreview() {
  return (
    <div className="mt-4 min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card/30">
      <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr] gap-1.5 border-b border-border/50 px-2 py-2 text-[8px] uppercase tracking-wider text-muted-foreground sm:gap-2 sm:px-3 sm:text-[9px]">
        <span>Enquiry</span>

        <span>Stage</span>

        <span>Next</span>
      </div>

      {[
        ["Customer enquiry", "New", "Review"],

        ["Quotation request", "Follow-up", "Contact"],

        ["Business enquiry", "Progressing", "Update"],

        ["Service request", "New", "Assign"],
      ].map((row) => (
        <div
          key={row.join("-")}
          className="grid grid-cols-[1.1fr_0.8fr_0.8fr] gap-1.5 border-b border-border/30 px-2 py-3 text-[9px] last:border-b-0 sm:gap-2 sm:px-3 sm:text-xs"
        >
          <span className="truncate">{row[0]}</span>

          <span className="truncate text-primary">{row[1]}</span>

          <span className="truncate text-muted-foreground">{row[2]}</span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PIPELINE MOCK                                                              */
/* -------------------------------------------------------------------------- */

function PipelinePreview() {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
      {["New", "Follow-up", "Progressing"].map((stage, index) => (
        <div key={stage} className="rounded-xl border border-border/60 bg-card/30 p-2.5 sm:p-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-primary sm:text-[10px]">
            {stage}
          </p>

          <div className="mt-3 space-y-2">
            {Array.from({
              length: index === 1 ? 3 : 2,
            }).map((_, itemIndex) => (
              <div
                key={itemIndex}
                className="rounded-lg border border-border/50 bg-background/40 p-2"
              >
                <div className="h-2 w-2/3 rounded bg-border" />

                <div className="mt-2 h-1.5 w-1/2 rounded bg-border/70" />

                <div className="mt-3 h-1.5 w-1/3 rounded bg-primary/30" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* OPERATIONS MOCK                                                            */
/* -------------------------------------------------------------------------- */

function OperationsPreview() {
  return (
    <div className="mt-4 space-y-3">
      {[
        {
          title: "Enquiry captured",

          description: "Original customer request retained.",
        },

        {
          title: "Internal review",

          description: "Relevant information checked and organised.",
        },

        {
          title: "Next action assigned",

          description: "Clear follow-up requirement recorded.",
        },

        {
          title: "Progress visible",

          description: "The operating position becomes easier to review.",
        },
      ].map((item, index) => (
        <div
          key={item.title}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/30 p-3"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold sm:text-sm">{item.title}</p>

            <p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:text-xs">
              {item.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MARKETING MOCK                                                             */
/* -------------------------------------------------------------------------- */

function MarketingPreview() {
  const channels = ["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube", "WhatsApp"];

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />

          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] text-primary">
              Campaign objective
            </p>

            <p className="mt-0.5 text-xs font-semibold sm:text-sm">
              Turn useful content into customer action
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {channels.map((channel) => (
          <div key={channel} className="rounded-lg border border-border/50 bg-card/30 p-2.5">
            <p className="truncate text-[10px] font-semibold">{channel}</p>

            <div className="mt-2 h-1.5 w-3/4 rounded bg-primary/25" />

            <div className="mt-1.5 h-1.5 w-1/2 rounded bg-border" />

            <p className="mt-2 text-[8px] uppercase tracking-wider text-muted-foreground">
              Content ready
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <MarketingMetric label="Strategy" text="Business objective" />

        <MarketingMetric label="Content" text="Platform adapted" />

        <MarketingMetric label="CTA" text="Clear next action" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MARKETING METRIC                                                           */
/* -------------------------------------------------------------------------- */

function MarketingMetric({
  label,
  text,
}: {
  label: string;

  text: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-2.5">
      <p className="text-[9px] uppercase tracking-[0.12em] text-primary">{label}</p>

      <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{text}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AI MOCK                                                                    */
/* -------------------------------------------------------------------------- */

function AiPreview() {
  const workers = [
    {
      title: "Marketing",

      task: "Campaign planning",
    },

    {
      title: "Content",

      task: "Draft creation",
    },

    {
      title: "CRM",

      task: "Lead organisation",
    },

    {
      title: "Operations",

      task: "Workflow review",
    },
  ];

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <BrainCircuit className="h-4 w-4" />
          </div>

          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] text-primary">
              AI operating layer
            </p>

            <p className="mt-1 text-xs font-semibold sm:text-sm">
              Support routine internal work without removing human authority.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {workers.map((worker) => (
          <div key={worker.title} className="rounded-xl border border-border/60 bg-card/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">{worker.title}</p>

              <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[8px] uppercase tracking-wider text-primary">
                Internal
              </span>
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">{worker.task}</p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60">
              <div className="h-full w-3/4 rounded-full bg-primary/35" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/50 bg-background/30 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

        <p className="text-[9px] leading-4 text-muted-foreground sm:text-[10px]">
          Financial, legal, credential, account-control and irreversible decisions remain
          human-controlled.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INTELLIGENCE MOCK                                                          */
/* -------------------------------------------------------------------------- */

function IntelligencePreview() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-xl border border-border/60 bg-card/30 p-3 sm:p-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Activity overview
        </p>

        <div className="mt-6 flex h-36 items-end gap-1.5 sm:h-40 sm:gap-2">
          {[36, 52, 44, 68, 58, 76, 63, 82].map((height, index) => (
            <div key={index} className="flex flex-1 items-end">
              <div
                className="w-full rounded-t bg-primary/30"
                style={{
                  height: `${height}%`,
                }}
              />
            </div>
          ))}
        </div>

        <p className="mt-3 text-[9px] text-muted-foreground">
          Illustration only — not live business performance.
        </p>
      </div>

      <div className="space-y-3">
        <InsightCard
          title="What needs attention?"
          text="Highlight unresolved work and follow-up requirements."
        />

        <InsightCard
          title="Where is activity building?"
          text="Organise recorded business activity into a clearer view."
        />

        <InsightCard
          title="What should happen next?"
          text="Support better operational prioritisation."
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INSIGHT CARD                                                               */
/* -------------------------------------------------------------------------- */

function InsightCard({
  title,
  text,
}: {
  title: string;

  text: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-3">
      <p className="text-xs font-semibold">{title}</p>

      <p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:text-xs">{text}</p>
    </div>
  );
}
