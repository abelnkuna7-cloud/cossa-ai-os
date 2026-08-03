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
import { PublicSiteShell } from "@/components/public-site-shell";
import { supabase } from "@/integrations/supabase/client";

const phoneNumber = "067 801 1907";
const phoneHref = "tel:+27678011907";
const whatsappHref = "https://wa.me/27678011907";
const emailHref = "mailto:cossa@cossanexusholdings.co.za";

type ContactMessageClient = {
  from: (table: "contact_messages") => {
    insert: (row: {
      name: string;
      email: string | null;
      phone: string;
      subject: string;
      message: string;
      status: string;
    }) => Promise<{ error: { message: string } | null }>;
  };
};

export const Route = createFileRoute("/")({
  component: GrowthHome,
  head: () => ({
    meta: [
      { title: "Cossa AI | Turn more business enquiries into customers" },
      {
        name: "description",
        content:
          "Get a clearer way to capture leads, follow up, organise operations and make better business decisions. Call, WhatsApp, email or request a quote from Cossa AI.",
      },
      { property: "og:title", content: "Cossa AI | Turn more enquiries into customers" },
      {
        property: "og:description",
        content:
          "Practical business growth systems for businesses that need clearer leads, follow-up and operations.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growth.cossanexusholdings.co.za/" },
      { property: "og:site_name", content: "Cossa AI" },
      { property: "og:locale", content: "en_ZA" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Cossa AI | Turn more enquiries into customers" },
      {
        name: "twitter:description",
        content:
          "Practical business growth systems for businesses that need clearer leads, follow-up and operations.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://growth.cossanexusholdings.co.za/" }],
  }),
});

function GrowthHome() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const capabilities = [
    {
      icon: Users,
      title: "Stop leads going cold",
      text: "Bring enquiries, follow-up and customer information into a clearer working process.",
    },
    {
      icon: Bot,
      title: "Get practical AI support",
      text: "Use AI guidance that is grounded in approved company knowledge instead of invented facts.",
    },
    {
      icon: LineChart,
      title: "See what is working",
      text: "Connect the right channels and measure the work before making bigger spending decisions.",
    },
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

  async function submitQuoteRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");

    const contactMessages = supabase as unknown as ContactMessageClient;
    const { error } = await contactMessages.from("contact_messages").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      subject: "Growth website quote request",
      message: form.message.trim(),
      status: "unread",
    });

    if (error) {
      setSubmitState("error");
      return;
    }

    setForm({ name: "", phone: "", email: "", message: "" });
    setSubmitState("sent");
  }

  return (
    <PublicSiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationSchema) }}
      />

      <section id="contact" className="relative overflow-hidden px-4 py-10 md:py-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              More leads. Clearer follow-up. Less business leakage.
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.08] md:text-5xl lg:text-6xl">
              Stop losing good customers because your business is too slow to{" "}
              <span className="text-gradient-gold">respond.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Cossa AI helps businesses turn enquiries into organised leads, stronger follow-up and
              better decisions — while keeping a real person easy to reach when you need one.
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
            <p className="mt-4 text-sm text-muted-foreground">
              Not comfortable with WhatsApp? Call, email or send a quote request instead.
            </p>
          </div>

          <form
            id="quote-request"
            onSubmit={submitQuoteRequest}
            className="rounded-2xl border border-primary/30 bg-card/80 p-5 shadow-[0_16px_60px_rgba(0,0,0,0.22)] md:p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Tell us what you need
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">
              Request a quote or speak with us
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Share the basics. Your request is saved in our enquiry system; for immediate help, call{" "}
              {phoneNumber}.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">
                  Email address <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="message">What can we help with?</Label>
                <Textarea
                  id="message"
                  required
                  rows={3}
                  placeholder="Tell us about the service, project or business challenge."
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitState === "sending"}
              className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {submitState === "sending" ? "Saving your request…" : "Send quote request"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {submitState === "sent" && (
              <p className="mt-3 text-sm text-emerald-500">
                Thank you — your request has been saved. Call {phoneNumber} if you need immediate
                help.
              </p>
            )}
            {submitState === "error" && (
              <p className="mt-3 text-sm text-destructive">
                We could not save that request. Please call {phoneNumber}, WhatsApp us, or email
                cossa@cossanexusholdings.co.za.
              </p>
            )}
          </form>
        </div>
      </section>

      <section id="solutions" className="border-y border-border/60 bg-card/30 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-semibold">
            A practical answer to the work that slows growth
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
              Built for businesses that want better control
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold">
              One clear place to capture opportunities and take the next right step.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Whether you need help with customer growth, construction, facility services,
              technology or an online store, Cossa starts with the problem you need solved — not a
              one-size-fits-all pitch.
            </p>
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-6">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">Controlled by people, not hype</h3>
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
