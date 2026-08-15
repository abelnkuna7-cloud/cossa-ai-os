import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Mail,
  MessageCircle,
  Phone,
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
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

/* -------------------------------------------------------------------------- */
/* CONTACT DETAILS                                                            */
/* -------------------------------------------------------------------------- */

const phoneNumber = "067 801 1907";
const phoneHref = "tel:+27678011907";
const whatsappHref = "https://wa.me/27678011907";
const emailHref = "mailto:cossa@cossanexusholdings.co.za";

const growthWebsiteUrl =
  "https://growth.cossanexusholdings.co.za/";

/* -------------------------------------------------------------------------- */
/* FORM STATE                                                                 */
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

/* -------------------------------------------------------------------------- */
/* DATABASE TYPES                                                             */
/* -------------------------------------------------------------------------- */

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface PublicGrowthDatabaseClient {
  from: (
    table:
      | "contact_messages"
      | "leads",
  ) => {
    insert: (
      row: Record<string, unknown>,
    ) => Promise<{
      error: DatabaseError | null;
    }>;
  };
}

/* -------------------------------------------------------------------------- */
/* ROUTE                                                                      */
/* -------------------------------------------------------------------------- */

export const Route =
  createFileRoute("/")({
    component: GrowthHome,

    head: () => ({
      meta: [
        {
          title:
            "GROWTH | Business Growth Intelligence",
        },
        {
          name: "description",
          content:
            "GROWTH gives businesses a clearer way to capture leads, follow up, organise operations and make better decisions.",
        },
        {
          property: "og:title",
          content:
            "GROWTH | Business Growth Intelligence",
        },
        {
          property:
            "og:description",
          content:
            "Business growth intelligence for clearer leads, follow-up, operations and measurable growth.",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          property: "og:url",
          content:
            growthWebsiteUrl,
        },
        {
          property:
            "og:site_name",
          content: "GROWTH",
        },
        {
          property:
            "og:locale",
          content: "en_ZA",
        },
        {
          name:
            "twitter:card",
          content: "summary",
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
            "Business growth intelligence for clearer leads, follow-up, operations and measurable growth.",
        },
        {
          name: "robots",
          content:
            "index, follow",
        },
        {
          property:
            "og:image",
          content:
            GROWTH_BRAND.assets
              .growthFull,
        },
      ],

      links: [
        {
          rel: "canonical",
          href:
            growthWebsiteUrl,
        },
      ],
    }),
  });

/* -------------------------------------------------------------------------- */
/* NORMALISATION HELPERS                                                      */
/* -------------------------------------------------------------------------- */

function normalisePhone(
  value: string,
): string {
  return value
    .replace(/[^\d+]/g, "")
    .trim();
}

function normaliseEmail(
  value: string,
): string | null {
  const email =
    value
      .trim()
      .toLowerCase();

  return email || null;
}

function isReasonablePhone(
  value: string,
): boolean {
  const digits =
    value.replace(
      /\D/g,
      "",
    );

  return (
    digits.length >= 9 &&
    digits.length <= 15
  );
}

function createLeadNotes(
  message: string,
): string {
  return [
    "[source_platform:growth]",
    "[source_form:growth_quote_request]",
    `[source_url:${growthWebsiteUrl}]`,
    "",
    "Submitted through growth.cossanexusholdings.co.za.",
    "",
    "Customer request:",
    message,
  ].join("\n");
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
    useState<SubmitState>(
      "idle",
    );

  const [
    submitError,
    setSubmitError,
  ] =
    useState<
      string | null
    >(null);

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
      growthWebsiteUrl,

    email:
      "cossa@cossanexusholdings.co.za",

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
  /* SUBMISSION                                                               */
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

    /* ---------------------------------------------------------------------- */
    /* VALIDATION                                                             */
    /* ---------------------------------------------------------------------- */

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

    if (
      name.length <
      2
    ) {
      setSubmitState(
        "error",
      );

      setSubmitError(
        "Please enter your full name.",
      );

      return;
    }

    if (
      !isReasonablePhone(
        phone,
      )
    ) {
      setSubmitState(
        "error",
      );

      setSubmitError(
        "Please enter a valid phone number.",
      );

      return;
    }

    if (
      message.length <
      10
    ) {
      setSubmitState(
        "error",
      );

      setSubmitError(
        "Please provide a little more detail about what you need.",
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
      supabase as unknown as PublicGrowthDatabaseClient;

    try {
      /* -------------------------------------------------------------------- */
      /* RECORD 1 — ORIGINAL ENQUIRY                                          */
      /* -------------------------------------------------------------------- */

      /*
       * Keep the customer's original public message in contact_messages.
       *
       * IMPORTANT:
       * We deliberately use only columns already proven by the existing
       * application. Do not add unverified contact_messages columns here.
       */
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

        throw new Error(
          "contact_message_failed",
        );
      }

      /* -------------------------------------------------------------------- */
      /* RECORD 2 — CENTRAL COSSA CRM LEAD                                    */
      /* -------------------------------------------------------------------- */

      /*
       * This record MUST belong to the same Cossa organisation used by the
       * GROWTH dashboard and Sales → Leads.
       *
       * Without organisation_id the lead can be invisible to the organisation
       * scoped CRM queries even when Supabase accepted the row.
       */
      const {
        error:
          leadError,
      } =
        await database
          .from("leads")
          .insert({
            organisation_id:
              COSSA_ORGANISATION_ID,

            full_name:
              name,

            name,

            phone,

            email,

            service:
              "Business enquiry",

            location:
              null,

            /*
             * Keep the public source simple and stable.
             * More precise intake information is retained safely in notes.
             */
            source:
              "growth",

            status:
              "new",

            stage:
              "new",

            notes:
              createLeadNotes(
                message,
              ),

            /*
             * Temporary neutral starting score.
             *
             * This is not presented as AI qualification.
             * A later Lead Intake / Scoring workflow should calculate the
             * genuine score from verified information.
             */
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
          "Growth enquiry was recorded but CRM lead creation failed:",
          leadError,
        );

        setSubmitState(
          "error",
        );

        setSubmitError(
          "Your request was received, but our customer follow-up record could not be completed. Please call or WhatsApp Cossa so we can assist immediately.",
        );

        /*
         * The original enquiry already exists in contact_messages.
         * We intentionally do not tell the customer that the entire request
         * was lost.
         */
        return;
      }

      /* -------------------------------------------------------------------- */
      /* SUCCESS                                                              */
      /* -------------------------------------------------------------------- */

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
            "growth",
          form:
            "growth_quote_request",
        },
      );
    } catch (
      error
    ) {
      console.error(
        "Growth quote request submission failed:",
        error,
      );

      setSubmitState(
        "error",
      );

      setSubmitError(
        "We could not save your request. Please call, WhatsApp or email Cossa directly.",
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

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

      <section
        id="contact"
        className="relative flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden px-4 py-8 md:py-10"
      >
        <div className="pointer-events-none absolute -left-32 top-8 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-[42%] bg-[radial-gradient(ellipse_at_top_right,rgba(217,177,36,0.12),transparent_70%)] lg:block" />

        <div className="relative mx-auto grid w-full max-w-6xl items-start gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          {/* ---------------------------------------------------------------- */}
          {/* HERO                                                             */}
          {/* ---------------------------------------------------------------- */}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Business Growth
              Intelligence for
              ambitious teams
            </p>

            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.08] md:text-5xl lg:text-[3.75rem]">
              Build a clearer
              growth system for{" "}
              <span className="text-gradient-gold">
                your business.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              GROWTH helps
              business owners,
              teams and
              white-label
              partners capture
              enquiries,
              organise
              follow-up and make
              better customer
              decisions from one
              place.
            </p>

            <div className="mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
              {/* PHONE */}

              <a
                href={
                  phoneHref
                }
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

                  Talk to
                  Cossa
                </Button>
              </a>

              {/* WHATSAPP */}

              <a
                href={
                  whatsappHref
                }
                target="_blank"
                rel="noopener noreferrer"
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

                  WhatsApp
                  Cossa
                </Button>
              </a>
            </div>

            {/* EMAIL */}

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
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Mail className="h-4 w-4" />

              Prefer email?
              cossa@cossanexusholdings.co.za
            </a>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* CONTACT FORM                                                     */}
          {/* ---------------------------------------------------------------- */}

          <form
            id="quote-request"
            onSubmit={
              submitQuoteRequest
            }
            className="relative isolate overflow-hidden rounded-2xl border border-primary/35 bg-card/95 shadow-[0_20px_70px_rgba(0,0,0,0.5)]"
          >
            {/* -------------------------------------------------------------- */}
            {/* FORM BRAND HEADER                                              */}
            {/* -------------------------------------------------------------- */}

            <section className="relative min-h-[190px] overflow-hidden border-b border-primary/25 bg-black p-5 md:min-h-[210px] md:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(217,177,36,0.16),transparent_52%)]" />

              <GrowthEagleArtwork
                eager
                className="absolute -bottom-10 -right-10 h-[118%] w-[70%] object-contain object-[center_58%] opacity-100 md:-right-2 md:w-[62%]"
              />

              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.92)_43%,rgba(0,0,0,0.34)_76%,rgba(0,0,0,0.1)_100%)]" />

              <div className="relative flex min-h-[150px] flex-col justify-between md:min-h-[162px]">
                <div className="max-w-[59%] sm:max-w-[54%]">
                  <GrowthProductBrand className="max-w-full" />

                  <h2 className="mt-5 font-display text-xl font-semibold leading-tight text-foreground md:text-2xl">
                    A clearer
                    route from
                    enquiry to
                    response.
                  </h2>
                </div>

                <ParentBrandEndorsement className="max-w-[60%]" />
              </div>
            </section>

            {/* -------------------------------------------------------------- */}
            {/* FORM FIELDS                                                    */}
            {/* -------------------------------------------------------------- */}

            <div className="relative p-5 md:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Start the
                conversation
              </p>

              <h2 className="mt-1 font-display text-xl font-semibold md:text-2xl">
                Tell us what
                growth needs
                next.
              </h2>

              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Share the
                essentials and
                Cossa will
                review your
                request.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* NAME */}

                <div className="space-y-2">
                  <Label htmlFor="name">
                    Your name
                  </Label>

                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    minLength={
                      2
                    }
                    maxLength={
                      120
                    }
                    value={
                      form.name
                    }
                    disabled={
                      submitState ===
                      "sending"
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

                {/* PHONE */}

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone
                    number
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
                    disabled={
                      submitState ===
                      "sending"
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

                {/* EMAIL */}

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">
                    Email
                    address{" "}
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
                    disabled={
                      submitState ===
                      "sending"
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

                {/* MESSAGE */}

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="message">
                    What can we
                    help with?
                  </Label>

                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={3}
                    minLength={
                      10
                    }
                    maxLength={
                      3000
                    }
                    placeholder="Tell us what you want to improve and when you need support."
                    value={
                      form.message
                    }
                    disabled={
                      submitState ===
                      "sending"
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

              {/* ------------------------------------------------------------ */}
              {/* SUBMIT BUTTON                                                */}
              {/* ------------------------------------------------------------ */}

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

              {/* ------------------------------------------------------------ */}
              {/* SUCCESS                                                      */}
              {/* ------------------------------------------------------------ */}

              {submitState ===
                "sent" && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 text-sm text-emerald-500"
                >
                  Thank you. Your
                  request has been
                  recorded and
                  added to our
                  customer
                  follow-up
                  system. Call{" "}
                  {
                    phoneNumber
                  }{" "}
                  for urgent
                  assistance.
                </p>
              )}

              {/* ------------------------------------------------------------ */}
              {/* ERROR                                                        */}
              {/* ------------------------------------------------------------ */}

              {submitState ===
                "error" && (
                <p
                  role="alert"
                  aria-live="assertive"
                  className="mt-3 text-sm text-destructive"
                >
                  {submitError ??
                    `We could not complete your request. Please call ${phoneNumber}, WhatsApp us, or email cossa@cossanexusholdings.co.za.`}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </PublicSiteShell>
  );
}