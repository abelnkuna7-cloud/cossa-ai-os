import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Target,
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

import {
  trackGrowthMeasurementEvent,
} from "@/lib/growth-measurement";

/* -------------------------------------------------------------------------- */
/* CONTACT                                                                    */
/* -------------------------------------------------------------------------- */

const phoneNumber =
  "067 801 1907";

const phoneHref =
  "tel:+27678011907";

const whatsappHref =
  "https://wa.me/27678011907";

const emailAddress =
  "cossa@cossanexusholdings.co.za";

const emailHref =
  `mailto:${emailAddress}`;

/* -------------------------------------------------------------------------- */
/* FORM                                                                       */
/* -------------------------------------------------------------------------- */

const initialFormState = {
  name: "",
  phone: "",
  email: "",
  message: "",
};

type SubmitState =
  | "idle"
  | "sending"
  | "sent"
  | "error";

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface PublicGrowthDatabaseClient {
  from:
    (
      table:
        | "contact_messages"
        | "leads",
    ) => {
      insert:
        (
          row:
            Record<
              string,
              unknown
            >,
        ) =>
          Promise<{
            error:
              DatabaseError |
              null;
          }>;
    };
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD PREVIEWS                                                         */
/* -------------------------------------------------------------------------- */

interface DashboardPreview {
  eyebrow: string;
  title: string;
  description: string;
  highlight: string;
  items: string[];
  type:
    | "crm"
    | "pipeline"
    | "operations"
    | "intelligence";
}

const DASHBOARD_PREVIEWS:
  readonly DashboardPreview[] =
  [
    {
      eyebrow:
        "CRM preview",

      title:
        "See every legitimate enquiry more clearly.",

      description:
        "Instead of relying only on memory, scattered messages and manual notes, GROWTH can help organise customer enquiries into a clearer working view.",

      highlight:
        "Enquiry → follow-up → next action",

      items: [
        "Customer contact information",
        "Lead source",
        "Current stage",
        "Follow-up notes",
        "Next action",
      ],

      type:
        "crm",
    },

    {
      eyebrow:
        "Pipeline preview",

      title:
        "Know what still needs attention.",

      description:
        "Build a more structured view of leads and opportunities so important follow-up is less likely to disappear inside day-to-day business activity.",

      highlight:
        "New → contacted → progressing",

      items: [
        "New opportunities",
        "Follow-up position",
        "Current status",
        "Owner visibility",
        "Pipeline organisation",
      ],

      type:
        "pipeline",
    },

    {
      eyebrow:
        "Operations preview",

      title:
        "Turn business activity into organised work.",

      description:
        "GROWTH is designed to support clearer internal workflows so teams can understand what came in, what is being handled and what should happen next.",

      highlight:
        "Capture → organise → act",

      items: [
        "Structured requests",
        "Internal workflow",
        "Task ownership",
        "Operational visibility",
        "Action tracking",
      ],

      type:
        "operations",
    },

    {
      eyebrow:
        "Business intelligence preview",

      title:
        "Make decisions from clearer information.",

      description:
        "The goal is not another complicated dashboard. It is a clearer operating picture that helps business owners identify what deserves attention.",

      highlight:
        "Information → decision → action",

      items: [
        "Business activity overview",
        "Priority visibility",
        "Lead activity context",
        "Decision support",
        "Growth planning",
      ],

      type:
        "intelligence",
    },
  ];

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route =
  createFileRoute("/")({
    component:
      GrowthHome,

    head:
      () => ({
        meta: [
          {
            title:
              "GROWTH | Business Growth Intelligence",
          },

          {
            name:
              "description",

            content:
              "GROWTH helps businesses capture enquiries, organise follow-up, improve customer workflows and build a clearer route from opportunity to action.",
          },

          {
            property:
              "og:title",

            content:
              "GROWTH | Business Growth Intelligence",
          },

          {
            property:
              "og:description",

            content:
              "Stop losing opportunities to scattered follow-up. Build a clearer operating system for enquiries, customer follow-up and business action.",
          },

          {
            property:
              "og:type",

            content:
              "website",
          },

          {
            property:
              "og:url",

            content:
              "https://growth.cossanexusholdings.co.za/",
          },

          {
            property:
              "og:site_name",

            content:
              "GROWTH",
          },

          {
            property:
              "og:locale",

            content:
              "en_ZA",
          },

          {
            name:
              "twitter:card",

            content:
              "summary",
          },

          {
            name:
              "twitter:title",

            content:
              "GROWTH | Business Growth Intelligence",
          },

          {
            name:
              "twitter:description",

            content:
              "A clearer system for enquiries, follow-up, customer workflows and business growth decisions.",
          },

          {
            name:
              "robots",

            content:
              "index, follow",
          },

          {
            property:
              "og:image",

            content:
              GROWTH_BRAND.assets.growthFull,
          },
        ],

        links: [
          {
            rel:
              "canonical",

            href:
              "https://growth.cossanexusholdings.co.za/",
          },
        ],
      }),
  });

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalisePhone(
  value:
    string,
): string {
  return value
    .replace(
      /[^\d+]/g,
      "",
    )
    .trim();
}

function normaliseEmail(
  value:
    string,
): string | null {
  const email =
    value
      .trim()
      .toLowerCase();

  return (
    email ||
    null
  );
}

function createLeadNotes(
  message:
    string,
): string {
  return [
    "Submitted through growth.cossanexusholdings.co.za.",
    "",
    "Customer request:",
    message,
  ].join(
    "\n",
  );
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

function GrowthHome() {
  const [
    form,
    setForm,
  ] =
    useState(
      initialFormState,
    );

  const [
    submitState,
    setSubmitState,
  ] =
    useState<
      SubmitState
    >(
      "idle",
    );

  const [
    submitError,
    setSubmitError,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const [
    activePreview,
    setActivePreview,
  ] =
    useState(
      0,
    );

  const [
    showLeadPopup,
    setShowLeadPopup,
  ] =
    useState(
      false,
    );

  /* ------------------------------------------------------------------------ */
  /* STRUCTURED DATA                                                          */
  /* ------------------------------------------------------------------------ */

  const organisationSchema = {
    "@context":
      "https://schema.org",

    "@type":
      "Organization",

    name:
      "Cossa Nexus Holdings (Pty) Ltd",

    url:
      "https://growth.cossanexusholdings.co.za",

    email:
      emailAddress,

    telephone:
      "+27678011907",

    slogan:
      GROWTH_BRAND.brandPromise,

    sameAs: [
      "https://cossanexusholdings.co.za",
      "https://nexdocs.cossanexusholdings.co.za",
    ],
  };

  /* ------------------------------------------------------------------------ */
  /* PREVIEW ROTATION                                                         */
  /* ------------------------------------------------------------------------ */

  useEffect(
    () => {
      const timer =
        window.setInterval(
          () => {
            setActivePreview(
              (
                current,
              ) =>
                (
                  current +
                  1
                ) %
                DASHBOARD_PREVIEWS.length,
            );
          },
          6_500,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /* POPUP                                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(
    () => {
      const alreadyDismissed =
        window.sessionStorage.getItem(
          "growth-lead-popup-dismissed",
        );

      if (
        alreadyDismissed
      ) {
        return;
      }

      const timer =
        window.setTimeout(
          () => {
            setShowLeadPopup(
              true,
            );
          },
          9_000,
        );

      return () => {
        window.clearTimeout(
          timer,
        );
      };
    },
    [],
  );

  function closeLeadPopup() {
    setShowLeadPopup(
      false,
    );

    window.sessionStorage.setItem(
      "growth-lead-popup-dismissed",
      "true",
    );
  }

  /* ------------------------------------------------------------------------ */
  /* FORM SUBMIT                                                              */
  /* ------------------------------------------------------------------------ */

  async function submitQuoteRequest(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitState ===
      "sending"
    ) {
      return;
    }

    const name =
      form.name.trim();

    const phone =
      normalisePhone(
        form.phone,
      );

    const email =
      normaliseEmail(
        form.email,
      );

    const message =
      form.message.trim();

    if (
      !name ||
      !phone ||
      !message
    ) {
      setSubmitState(
        "error",
      );

      setSubmitError(
        "Please enter your name, phone number and a short description of what you need.",
      );

      return;
    }

    setSubmitState(
      "sending",
    );

    setSubmitError(
      null,
    );

    const database =
      supabase as unknown as
        PublicGrowthDatabaseClient;

    const {
      error:
        contactMessageError,
    } =
      await database
        .from(
          "contact_messages",
        )
        .insert({
          name,
          phone,
          email,

          subject:
            "Growth website quote request",

          message,

          status:
            "unread",
        });

    if (
      contactMessageError
    ) {
      console.error(
        "Unable to save Growth contact message:",
        contactMessageError,
      );

      setSubmitState(
        "error",
      );

      setSubmitError(
        "We could not save your request. Please call, WhatsApp or email Cossa directly.",
      );

      return;
    }

    const {
      error:
        leadError,
    } =
      await database
        .from(
          "leads",
        )
        .insert({
          full_name:
            name,

          name,
          phone,
          email,

          service:
            "Business enquiry",

          location:
            null,

          source:
            "growth_website_quote_request",

          status:
            "New",

          stage:
            "New",

          notes:
            createLeadNotes(
              message,
            ),

          score:
            40,

          value:
            0,

          estimated_value:
            0,
        });

    if (
      leadError
    ) {
      console.error(
        "The enquiry was saved but the CRM lead could not be created:",
        leadError,
      );

      setSubmitState(
        "error",
      );

      setSubmitError(
        "Your request was received, but our CRM could not complete the lead record. Please call or WhatsApp Cossa so we can assist immediately.",
      );

      return;
    }

    setForm(
      initialFormState,
    );

    setSubmitState(
      "sent",
    );

    trackGrowthMeasurementEvent(
      "growth_quote_request_submitted",
      {
        source:
          "growth_website",
      },
    );
  }

  return (
    <PublicSiteShell
      showCallToAction={
        false
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html:
            JSON.stringify(
              organisationSchema,
            ),
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                               */}
      {/* ------------------------------------------------------------------ */}

      <section
        id="contact"
        className="relative overflow-hidden px-4 pb-12 pt-8 md:pb-16 md:pt-12"
      >
        <div className="pointer-events-none absolute -left-32 top-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[42%] bg-[radial-gradient(ellipse_at_top_right,rgba(217,177,36,0.12),transparent_70%)] lg:block" />

        <div className="relative mx-auto grid w-full max-w-7xl items-start gap-10 lg:grid-cols-[1.08fr_0.92fr] xl:gap-14">
          {/* LEFT */}

          <div className="min-w-0 w-full">
            <p className="max-w-full text-[11px] font-semibold uppercase leading-5 tracking-[0.18em] text-primary sm:text-xs sm:tracking-[0.22em]">
              Business Growth Intelligence
              for ambitious teams
            </p>

            <h1 className="mt-4 max-w-3xl break-words font-display text-[2.35rem] font-semibold leading-[1.05] sm:text-5xl lg:text-[3.9rem]">
              Stop losing opportunities
              to{" "}

              <span className="text-gradient-gold">
                scattered follow-up.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base md:text-lg">
              A customer asks for help.
              Someone says they will
              follow up. Another enquiry
              arrives. Messages move
              between WhatsApp, calls,
              email, notes and memory —
              and suddenly nobody has a
              clear picture of what
              needs attention.
            </p>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/85 sm:text-base">
              GROWTH helps businesses
              build a clearer route from
              customer interest to the
              next business action.
            </p>

            {/* PAIN POINTS */}

            <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              <PainPointCard
                title="Enquiries everywhere?"
                description="Bring legitimate customer enquiries into a more organised process instead of depending on scattered messages, manual notes and memory."
              />

              <PainPointCard
                title="Follow-up becoming inconsistent?"
                description="Give every legitimate enquiry a clearer next step so potential opportunities are easier to track and respond to."
              />

              <PainPointCard
                title="Too much happening manually?"
                description="Create a stronger operating system for customer information, follow-up and internal business workflows."
              />

              <PainPointCard
                title="Not sure what needs attention?"
                description="Turn business activity into clearer information so you can see what should happen next."
              />
            </div>

            {/* OPERATING MODEL */}

            <div className="mt-6 w-full max-w-2xl rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-xs sm:tracking-[0.18em]">
                A clearer growth operating
                system
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <OperatingStep
                  icon={
                    FileText
                  }
                  title="Capture"
                  description="Record legitimate enquiries while keeping the original customer request."
                />

                <OperatingStep
                  icon={
                    Workflow
                  }
                  title="Organise"
                  description="Structure follow-up, workflow and customer information more clearly."
                />

                <OperatingStep
                  icon={
                    Target
                  }
                  title="Act"
                  description="Know what deserves attention next instead of depending on guesswork."
                />
              </div>
            </div>

            {/* CTA */}

            <div className="mt-7 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
              <a
                href={
                  phoneHref
                }
                className="w-full sm:w-auto"
                onClick={() =>
                  trackGrowthMeasurementEvent(
                    "growth_contact_click",
                    {
                      method:
                        "phone",

                      placement:
                        "hero",
                    },
                  )
                }
              >
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:min-w-52">
                  <Phone className="mr-2 h-4 w-4" />

                  Talk to Cossa
                </Button>
              </a>

              <a
                href={
                  whatsappHref
                }
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto"
                onClick={() =>
                  trackGrowthMeasurementEvent(
                    "growth_contact_click",
                    {
                      method:
                        "whatsapp",

                      placement:
                        "hero",
                    },
                  )
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
              href={
                emailHref
              }
              onClick={() =>
                trackGrowthMeasurementEvent(
                  "growth_contact_click",
                  {
                    method:
                      "email",

                    placement:
                      "hero",
                  },
                )
              }
              className="mt-4 inline-flex max-w-full items-start gap-2 break-all text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />

              <span>
                Prefer email?{" "}
                {
                  emailAddress
                }
              </span>
            </a>
          </div>

          {/* FORM */}

          <form
            id="quote-request"
            onSubmit={
              submitQuoteRequest
            }
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
                    Turn customer interest
                    into a clearer next
                    action.
                  </h2>
                </div>

                <ParentBrandEndorsement className="max-w-[68%] sm:max-w-[60%]" />
              </div>
            </section>

            <div className="relative p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Start the conversation
              </p>

              <h2 className="mt-1 font-display text-xl font-semibold md:text-2xl">
                What does your business
                need to improve?
              </h2>

              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                Tell Cossa what is
                slowing you down, what
                you are trying to improve
                and what should happen
                next.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Your name
                  </Label>

                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={
                      120
                    }
                    value={
                      form.name
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          name:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone number
                  </Label>

                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    maxLength={
                      30
                    }
                    value={
                      form.phone
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          phone:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">
                    Email address{" "}

                    <span className="text-muted-foreground">
                      (optional)
                    </span>
                  </Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={
                      254
                    }
                    value={
                      form.email
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          email:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="message">
                    What can we help
                    with?
                  </Label>

                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={
                      3
                    }
                    minLength={
                      10
                    }
                    maxLength={
                      3000
                    }
                    placeholder="Example: We are receiving enquiries but our follow-up is inconsistent and we need a clearer system."
                    value={
                      form.message
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          message:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={
                  submitState ===
                  "sending"
                }
                className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {submitState ===
                "sending"
                  ? "Recording your request…"
                  : "Send quote request"}

                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {submitState ===
                "sent" && (
                <p
                  role="status"
                  className="mt-3 text-sm text-emerald-500"
                >
                  Thank you. Your request
                  has been recorded and
                  added to our customer
                  follow-up system. Call{" "}
                  {
                    phoneNumber
                  }{" "}
                  for urgent assistance.
                </p>
              )}

              {submitState ===
                "error" && (
                <p
                  role="alert"
                  className="mt-3 text-sm text-destructive"
                >
                  {submitError ??
                    `We could not complete your request. Please call ${phoneNumber}, WhatsApp us, or email ${emailAddress}.`}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* HOOK STRIP                                                         */}
      {/* ------------------------------------------------------------------ */}

      <section className="border-y border-border/60 bg-card/25 px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            <HookCard
              icon={
                UsersRound
              }
              eyebrow="Customer opportunity"
              title="An enquiry is not valuable if nobody knows what happens next."
              body="GROWTH is designed to help businesses turn incoming interest into a clearer follow-up process."
            />

            <HookCard
              icon={
                ClipboardCheck
              }
              eyebrow="Operational clarity"
              title="The problem is often not a lack of work. It is a lack of visibility."
              body="Create a clearer picture of what came in, what is being handled and what still needs attention."
            />

            <HookCard
              icon={
                BrainCircuit
              }
              eyebrow="Better decisions"
              title="Growth gets harder when important information lives in different places."
              body="Bring legitimate business information into a more organised operating workflow."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* DASHBOARD PREVIEW                                                  */}
      {/* ------------------------------------------------------------------ */}

      <section className="relative overflow-hidden px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              See the operating idea
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Imagine opening your
              business dashboard and
              actually knowing{" "}

              <span className="text-gradient-gold">
                what needs attention.
              </span>
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              These are illustrative
              interface previews showing
              the type of organised
              workflow GROWTH is designed
              to support. They are not
              claims about customer
              results or live account
              data.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch">
            {/* COPY */}

            <div className="flex flex-col justify-between rounded-2xl border border-primary/25 bg-card/50 p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {
                    DASHBOARD_PREVIEWS[
                      activePreview
                    ].eyebrow
                  }
                </p>

                <h3 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
                  {
                    DASHBOARD_PREVIEWS[
                      activePreview
                    ].title
                  }
                </h3>

                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {
                    DASHBOARD_PREVIEWS[
                      activePreview
                    ].description
                  }
                </p>

                <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary">
                    Operating flow
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {
                      DASHBOARD_PREVIEWS[
                        activePreview
                      ].highlight
                    }
                  </p>
                </div>

                <div className="mt-5 grid gap-2">
                  {DASHBOARD_PREVIEWS[
                    activePreview
                  ].items.map(
                    (
                      item,
                    ) => (
                      <div
                        key={
                          item
                        }
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

                        <span>
                          {
                            item
                          }
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-7 flex items-center justify-between gap-3">
                <div className="flex gap-1.5">
                  {DASHBOARD_PREVIEWS.map(
                    (
                      preview,
                      index,
                    ) => (
                      <button
                        key={
                          preview.title
                        }
                        type="button"
                        aria-label={`Show preview ${index + 1}`}
                        onClick={() =>
                          setActivePreview(
                            index,
                          )
                        }
                        className={
                          index ===
                          activePreview
                            ? "h-2.5 w-7 rounded-full bg-primary transition-all"
                            : "h-2.5 w-2.5 rounded-full bg-border transition-all hover:bg-primary/60"
                        }
                      />
                    ),
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Previous dashboard preview"
                    onClick={() =>
                      setActivePreview(
                        (
                          current,
                        ) =>
                          (
                            current -
                            1 +
                            DASHBOARD_PREVIEWS.length
                          ) %
                          DASHBOARD_PREVIEWS.length,
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
                      setActivePreview(
                        (
                          current,
                        ) =>
                          (
                            current +
                            1
                          ) %
                          DASHBOARD_PREVIEWS.length,
                      )
                    }
                    className="border-primary/30 text-primary"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* MOCK DASHBOARD */}

            <DashboardMock
              type={
                DASHBOARD_PREVIEWS[
                  activePreview
                ].type
              }
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* BROCHURE SLIDES                                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="border-y border-border/60 bg-card/20 px-4 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              GROWTH business system
            </p>

            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              More than another contact
              form.
            </h2>

            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              The objective is to help
              businesses create a
              stronger operating rhythm
              around enquiries,
              follow-up, information and
              decisions.
            </p>
          </div>

          <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
            <BrochureSlide
              icon={
                LayoutDashboard
              }
              eyebrow="01 · Visibility"
              title="Bring important customer activity into clearer view."
              description="Stop depending entirely on scattered conversations and memory. Build a more structured view of legitimate incoming opportunities."
            />

            <BrochureSlide
              icon={
                Workflow
              }
              eyebrow="02 · Workflow"
              title="Give business activity a clearer next step."
              description="Create a working process around enquiries and internal action instead of allowing important requests to sit without direction."
            />

            <BrochureSlide
              icon={
                BarChart3
              }
              eyebrow="03 · Intelligence"
              title="Use organised information to support better decisions."
              description="A cleaner operating picture makes it easier to understand what deserves attention and where business processes may need improvement."
            />

            <BrochureSlide
              icon={
                ShieldCheck
              }
              eyebrow="04 · Control"
              title="Keep important business decisions under human authority."
              description="GROWTH can support organisation and decision-making without pretending that automated tools should replace owner authority over important commercial actions."
            />

            <BrochureSlide
              icon={
                Zap
              }
              eyebrow="05 · Growth"
              title="Turn better organisation into stronger business execution."
              description="More disciplined capture, follow-up and internal visibility can create a stronger foundation for customer service and business development."
            />
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
                Your next enquiry should
                not disappear
              </p>

              <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold sm:text-4xl">
                If your business is
                growing, your operating
                system needs to grow with
                it.
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Tell Cossa where
                enquiries, follow-up or
                business information are
                becoming difficult to
                manage. We can start from
                the problem and work
                forward.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
              <a
                href="#quote-request"
              >
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 md:min-w-52">
                  Start the conversation

                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>

              <a
                href={
                  whatsappHref
                }
                target="_blank"
                rel="noreferrer"
              >
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
        href={
          whatsappHref
        }
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Cossa on WhatsApp"
        onClick={() =>
          trackGrowthMeasurementEvent(
            "growth_contact_click",
            {
              method:
                "whatsapp",

              placement:
                "floating_button",
            },
          )
        }
        className="fixed bottom-5 right-4 z-40 flex items-center gap-2 rounded-full border border-primary/40 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_40px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-4 w-4" />

        <span className="hidden sm:inline">
          WhatsApp Cossa
        </span>
      </a>

      {/* ------------------------------------------------------------------ */}
      {/* LEAD POPUP                                                          */}
      {/* ------------------------------------------------------------------ */}

      {showLeadPopup ? (
        <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md sm:bottom-24 sm:left-auto sm:right-6 sm:mx-0">
          <div className="relative overflow-hidden rounded-2xl border border-primary/35 bg-card p-5 shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />

            <button
              type="button"
              aria-label="Close message"
              onClick={
                closeLeadPopup
              }
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
                How many opportunities
                could be sitting inside
                inconsistent follow-up?
              </h2>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                If customer enquiries are
                spread across messages,
                calls and notes, start by
                building a clearer system
                around them.
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href="#quote-request"
                  onClick={
                    closeLeadPopup
                  }
                >
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    Tell us the problem

                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>

                <a
                  href={
                    whatsappHref
                  }
                  target="_blank"
                  rel="noreferrer"
                  onClick={
                    closeLeadPopup
                  }
                >
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
  title:
    string;

  description:
    string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-primary/20 bg-card/40 p-4">
      <p className="break-words text-[11px] font-semibold uppercase leading-5 tracking-[0.14em] text-primary sm:text-xs sm:tracking-[0.16em]">
        {
          title
        }
      </p>

      <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
        {
          description
        }
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* OPERATING STEP                                                             */
/* -------------------------------------------------------------------------- */

function OperatingStep({
  icon:
    Icon,

  title,
  description,
}: {
  icon:
    typeof FileText;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>

      <p className="mt-3 text-sm font-semibold text-foreground">
        {
          title
        }
      </p>

      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
        {
          description
        }
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* HOOK CARD                                                                  */
/* -------------------------------------------------------------------------- */

function HookCard({
  icon:
    Icon,

  eyebrow,
  title,
  body,
}: {
  icon:
    typeof UsersRound;

  eyebrow:
    string;

  title:
    string;

  body:
    string;
}) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card/50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        {
          eyebrow
        }
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">
        {
          title
        }
      </h3>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {
          body
        }
      </p>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* BROCHURE SLIDE                                                             */
/* -------------------------------------------------------------------------- */

function BrochureSlide({
  icon:
    Icon,

  eyebrow,
  title,
  description,
}: {
  icon:
    typeof LayoutDashboard;

  eyebrow:
    string;

  title:
    string;

  description:
    string;
}) {
  return (
    <article className="min-w-[85%] snap-center rounded-2xl border border-primary/20 bg-background/50 p-5 sm:min-w-[48%] lg:min-w-[31%]">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        {
          eyebrow
        }
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">
        {
          title
        }
      </h3>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {
          description
        }
      </p>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* DASHBOARD MOCK                                                             */
/* -------------------------------------------------------------------------- */

function DashboardMock({
  type,
}: {
  type:
    DashboardPreview["type"];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-black p-3 shadow-[0_24px_90px_rgba(0,0,0,0.55)] sm:p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,177,36,0.12),transparent_46%)]" />

      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-[#090909]">
        {/* TOP BAR */}

        <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <LayoutDashboard className="h-4 w-4" />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary">
                GROWTH
              </p>

              <p className="text-xs font-semibold">
                Dashboard preview
              </p>
            </div>
          </div>

          <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-primary">
            Illustrative
          </span>
        </div>

        <div className="grid min-h-[420px] grid-cols-[58px_1fr] sm:grid-cols-[160px_1fr]">
          {/* SIDEBAR */}

          <aside className="border-r border-border/50 p-2 sm:p-3">
            <div className="space-y-2">
              {[
                LayoutDashboard,
                UsersRound,
                Workflow,
                BarChart3,
                FileText,
              ].map(
                (
                  Icon,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className={
                      index ===
                      0
                        ? "flex items-center gap-2 rounded-lg bg-primary/10 p-2 text-primary"
                        : "flex items-center gap-2 rounded-lg p-2 text-muted-foreground"
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />

                    <span className="hidden text-[11px] sm:inline">
                      {index ===
                      0
                        ? "Overview"
                        : index ===
                            1
                          ? "CRM"
                          : index ===
                              2
                            ? "Workflow"
                            : index ===
                                3
                              ? "Insights"
                              : "Records"}
                    </span>
                  </div>
                ),
              )}
            </div>
          </aside>

          {/* CONTENT */}

          <div className="min-w-0 p-3 sm:p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <MockMetric
                label="New"
                value="—"
              />

              <MockMetric
                label="In progress"
                value="—"
              />

              <MockMetric
                label="Needs attention"
                value="—"
              />
            </div>

            {type ===
              "crm" ? (
              <CrmPreview />
            ) : type ===
                "pipeline" ? (
              <PipelinePreview />
            ) : type ===
                "operations" ? (
              <OperationsPreview />
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
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-3">
      <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {
          label
        }
      </p>

      <p className="mt-2 font-display text-xl font-semibold text-primary">
        {
          value
        }
      </p>

      <p className="mt-1 text-[9px] text-muted-foreground">
        Live values shown only after
        authorised data exists.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CRM MOCK                                                                   */
/* -------------------------------------------------------------------------- */

function CrmPreview() {
  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-card/30">
      <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 border-b border-border/50 px-3 py-2 text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>
          Enquiry
        </span>

        <span>
          Stage
        </span>

        <span>
          Next action
        </span>
      </div>

      {[
        [
          "Customer enquiry",
          "New",
          "Review",
        ],

        [
          "Quotation request",
          "Follow-up",
          "Contact",
        ],

        [
          "Business enquiry",
          "Progressing",
          "Update",
        ],

        [
          "Service request",
          "New",
          "Assign",
        ],
      ].map(
        (
          row,
        ) => (
          <div
            key={
              row.join(
                "-",
              )
            }
            className="grid grid-cols-[1.2fr_0.8fr_0.8fr] gap-2 border-b border-border/30 px-3 py-3 text-[10px] last:border-b-0 sm:text-xs"
          >
            <span className="truncate">
              {
                row[0]
              }
            </span>

            <span className="text-primary">
              {
                row[1]
              }
            </span>

            <span className="truncate text-muted-foreground">
              {
                row[2]
              }
            </span>
          </div>
        ),
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PIPELINE MOCK                                                              */
/* -------------------------------------------------------------------------- */

function PipelinePreview() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[
        "New",

        "Follow-up",

        "Progressing",
      ].map(
        (
          stage,
          index,
        ) => (
          <div
            key={
              stage
            }
            className="rounded-xl border border-border/60 bg-card/30 p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              {
                stage
              }
            </p>

            <div className="mt-3 space-y-2">
              {Array.from({
                length:
                  index ===
                  1
                    ? 3
                    : 2,
              }).map(
                (
                  _,
                  itemIndex,
                ) => (
                  <div
                    key={
                      itemIndex
                    }
                    className="rounded-lg border border-border/50 bg-background/40 p-2"
                  >
                    <div className="h-2 w-2/3 rounded bg-border" />

                    <div className="mt-2 h-1.5 w-1/2 rounded bg-border/70" />

                    <div className="mt-3 h-1.5 w-1/3 rounded bg-primary/30" />
                  </div>
                ),
              )}
            </div>
          </div>
        ),
      )}
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
          title:
            "Enquiry captured",

          description:
            "Original customer request retained.",
        },

        {
          title:
            "Internal review",

          description:
            "Relevant information checked and organised.",
        },

        {
          title:
            "Next action assigned",

          description:
            "Clear follow-up requirement recorded.",
        },
      ].map(
        (
          item,
          index,
        ) => (
          <div
            key={
              item.title
            }
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/30 p-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
              {
                index +
                1
              }
            </div>

            <div>
              <p className="text-xs font-semibold sm:text-sm">
                {
                  item.title
                }
              </p>

              <p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:text-xs">
                {
                  item.description
                }
              </p>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* INTELLIGENCE MOCK                                                          */
/* -------------------------------------------------------------------------- */

function IntelligencePreview() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-xl border border-border/60 bg-card/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Activity overview
        </p>

        <div className="mt-6 flex h-40 items-end gap-2">
          {[
            36,
            52,
            44,
            68,
            58,
            76,
            63,
            82,
          ].map(
            (
              height,
              index,
            ) => (
              <div
                key={
                  index
                }
                className="flex flex-1 items-end"
              >
                <div
                  className="w-full rounded-t bg-primary/30"
                  style={{
                    height:
                      `${height}%`,
                  }}
                />
              </div>
            ),
          )}
        </div>

        <p className="mt-3 text-[9px] text-muted-foreground">
          Illustration only — not live
          business performance.
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
  title:
    string;

  text:
    string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-3">
      <p className="text-xs font-semibold">
        {
          title
        }
      </p>

      <p className="mt-1 text-[10px] leading-5 text-muted-foreground sm:text-xs">
        {
          text
        }
      </p>
    </div>
  );
}
