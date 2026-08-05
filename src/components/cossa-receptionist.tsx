import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HardHat,
  Laptop,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const phoneNumber = "067 801 1907";
const phoneHref = "tel:+27678011907";
const emailHref =
  "mailto:cossa@cossanexusholdings.co.za";
const whatsappHref =
  "https://wa.me/27678011907";

type ReceptionistStep =
  | "welcome"
  | "service"
  | "details"
  | "contact"
  | "review"
  | "success";

type SubmitState =
  | "idle"
  | "sending"
  | "error"
  | "sent";

type PreferredContact =
  | "phone"
  | "whatsapp"
  | "email";

type Urgency =
  | "urgent"
  | "this_week"
  | "this_month"
  | "planning";

type ServiceKey =
  | "construction"
  | "facility_services"
  | "technology"
  | "business_growth"
  | "nexdocs"
  | "store"
  | "general";

interface ReceptionistForm {
  service: ServiceKey | "";
  name: string;
  phone: string;
  email: string;
  location: string;
  request: string;
  urgency: Urgency;
  preferredContact: PreferredContact;
}

interface DatabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

interface PublicReceptionistDatabaseClient {
  from: (
    table: "contact_messages" | "leads",
  ) => {
    insert: (
      row: Record<string, unknown>,
    ) => Promise<{
      error: DatabaseError | null;
    }>;
  };
}

interface ServiceOption {
  key: ServiceKey;
  title: string;
  description: string;
  crmService: string;
  icon: typeof HardHat;
}

const initialForm: ReceptionistForm = {
  service: "",
  name: "",
  phone: "",
  email: "",
  location: "",
  request: "",
  urgency: "this_week",
  preferredContact: "whatsapp",
};

const serviceOptions: ServiceOption[] = [
  {
    key: "construction",
    title: "Construction",
    description:
      "Building, renovations, maintenance, painting, ceilings, tiling, roofing and related work.",
    crmService:
      "Cossa Nexus Construction",
    icon: HardHat,
  },
  {
    key: "facility_services",
    title: "Facility Services",
    description:
      "Cleaning, hygiene, property care, landscaping, waste and facility-support services.",
    crmService:
      "Cossa Facility Services",
    icon: Wrench,
  },
  {
    key: "technology",
    title: "Technology",
    description:
      "Websites, AI tools, automation, digital systems, SEO and technology support.",
    crmService: "Cossa Tech",
    icon: Laptop,
  },
  {
    key: "business_growth",
    title: "Business Growth",
    description:
      "Marketing, lead generation, sales systems, CRM, campaigns and business-growth support.",
    crmService:
      "Cossa AI Business Growth",
    icon: Building2,
  },
  {
    key: "nexdocs",
    title: "NexDocs",
    description:
      "Business documents, quotations, proposals, contracts and document-generation support.",
    crmService: "NexDocs",
    icon: ShieldCheck,
  },
  {
    key: "store",
    title: "Cossa Store",
    description:
      "Products, e-commerce enquiries, sourcing, orders and online-store support.",
    crmService: "Cossa Store",
    icon: ShoppingBag,
  },
  {
    key: "general",
    title: "Something else",
    description:
      "A general enquiry or a request that crosses more than one Cossa service.",
    crmService:
      "General Cossa Nexus Holdings enquiry",
    icon: Sparkles,
  },
];

const urgencyOptions: {
  value: Urgency;
  label: string;
}[] = [
  {
    value: "urgent",
    label: "Urgent — as soon as possible",
  },
  {
    value: "this_week",
    label: "This week",
  },
  {
    value: "this_month",
    label: "This month",
  },
  {
    value: "planning",
    label: "Planning for later",
  },
];

const contactOptions: {
  value: PreferredContact;
  label: string;
  icon: typeof Phone;
}[] = [
  {
    value: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
  },
  {
    value: "phone",
    label: "Phone call",
    icon: Phone,
  },
  {
    value: "email",
    label: "Email",
    icon: Mail,
  },
];

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
  const email = value
    .trim()
    .toLowerCase();

  return email || null;
}

function getSelectedService(
  key: ServiceKey | "",
): ServiceOption | null {
  return (
    serviceOptions.find(
      (service) =>
        service.key === key,
    ) ?? null
  );
}

function getUrgencyLabel(
  urgency: Urgency,
): string {
  return (
    urgencyOptions.find(
      (option) =>
        option.value === urgency,
    )?.label ?? urgency
  );
}

function getContactLabel(
  contact: PreferredContact,
): string {
  return (
    contactOptions.find(
      (option) =>
        option.value === contact,
    )?.label ?? contact
  );
}

function createReceptionistNotes({
  form,
  service,
}: {
  form: ReceptionistForm;
  service: ServiceOption;
}): string {
  return [
    "Submitted through the Cossa AI public receptionist.",
    "",
    `Requested service: ${service.title}`,
    `Location: ${
      form.location.trim() ||
      "Not supplied"
    }`,
    `Urgency: ${getUrgencyLabel(
      form.urgency,
    )}`,
    `Preferred contact method: ${getContactLabel(
      form.preferredContact,
    )}`,
    "",
    "Customer request:",
    form.request.trim(),
  ].join("\n");
}

function scoreLead(
  form: ReceptionistForm,
): number {
  let score = 40;

  if (form.email.trim()) {
    score += 10;
  }

  if (form.location.trim()) {
    score += 10;
  }

  if (
    form.request.trim().length >= 80
  ) {
    score += 10;
  }

  if (form.urgency === "urgent") {
    score += 20;
  } else if (
    form.urgency === "this_week"
  ) {
    score += 15;
  } else if (
    form.urgency === "this_month"
  ) {
    score += 5;
  }

  return Math.min(score, 100);
}

export function CossaReceptionist() {
  const [open, setOpen] =
    useState(false);
  const [minimised, setMinimised] =
    useState(false);
  const [step, setStep] =
    useState<ReceptionistStep>(
      "welcome",
    );
  const [form, setForm] =
    useState<ReceptionistForm>(
      initialForm,
    );
  const [
    submitState,
    setSubmitState,
  ] = useState<SubmitState>("idle");
  const [
    submitError,
    setSubmitError,
  ] = useState<string | null>(
    null,
  );

  const selectedService =
    useMemo(
      () =>
        getSelectedService(
          form.service,
        ),
      [form.service],
    );

  const progress = useMemo(() => {
    const steps: ReceptionistStep[] = [
      "welcome",
      "service",
      "details",
      "contact",
      "review",
      "success",
    ];

    const index =
      steps.indexOf(step);

    return Math.max(
      0,
      Math.min(
        100,
        ((index + 1) /
          steps.length) *
          100,
      ),
    );
  }, [step]);

  function openReceptionist() {
    setOpen(true);
    setMinimised(false);
  }

  function closeReceptionist() {
    setOpen(false);
    setMinimised(false);
  }

  function resetReceptionist() {
    setForm(initialForm);
    setStep("welcome");
    setSubmitState("idle");
    setSubmitError(null);
  }

  function nextFromService() {
    if (!form.service) {
      setSubmitError(
        "Please choose the service you need.",
      );
      return;
    }

    setSubmitError(null);
    setStep("details");
  }

  function nextFromDetails() {
    if (
      form.request
        .trim()
        .length < 10
    ) {
      setSubmitError(
        "Please describe what you need in at least 10 characters.",
      );
      return;
    }

    setSubmitError(null);
    setStep("contact");
  }

  function nextFromContact() {
    const name =
      form.name.trim();
    const phone =
      normalisePhone(form.phone);
    const email =
      normaliseEmail(form.email);

    if (!name) {
      setSubmitError(
        "Please enter your name.",
      );
      return;
    }

    if (!phone) {
      setSubmitError(
        "Please enter a phone number.",
      );
      return;
    }

    if (
      form.preferredContact ===
        "email" &&
      !email
    ) {
      setSubmitError(
        "Please enter an email address because email is your preferred contact method.",
      );
      return;
    }

    setSubmitError(null);
    setStep("review");
  }

  async function submitEnquiry(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      submitState === "sending"
    ) {
      return;
    }

    if (!selectedService) {
      setSubmitState("error");
      setSubmitError(
        "Please select a service before submitting.",
      );
      return;
    }

    const name =
      form.name.trim();
    const phone =
      normalisePhone(form.phone);
    const email =
      normaliseEmail(form.email);
    const location =
      form.location.trim() ||
      null;
    const request =
      form.request.trim();

    if (
      !name ||
      !phone ||
      request.length < 10
    ) {
      setSubmitState("error");
      setSubmitError(
        "Your name, phone number and request details are required.",
      );
      return;
    }

    setSubmitState("sending");
    setSubmitError(null);

    const database =
      supabase as unknown as PublicReceptionistDatabaseClient;

    const notes =
      createReceptionistNotes({
        form,
        service:
          selectedService,
      });

    const {
      error:
        contactMessageError,
    } = await database
      .from("contact_messages")
      .insert({
        name,
        phone,
        email,
        subject: `Cossa receptionist enquiry — ${selectedService.title}`,
        message: notes,
        status: "unread",
      });

    if (contactMessageError) {
      console.error(
        "Cossa receptionist contact-message error:",
        contactMessageError,
      );

      setSubmitState("error");
      setSubmitError(
        "We could not record your request. Please call or WhatsApp Cossa directly.",
      );
      return;
    }

    const {
      error: leadError,
    } = await database
      .from("leads")
      .insert({
        full_name: name,
        name,
        phone,
        email,
        service:
          selectedService.crmService,
        location,
        source:
          "cossa_public_receptionist",
        status: "New",
        stage: "New",
        notes,
        score: scoreLead(form),
        value: 0,
        estimated_value: 0,
      });

    if (leadError) {
      console.error(
        "Cossa receptionist lead-creation error:",
        leadError,
      );

      setSubmitState("error");
      setSubmitError(
        "Your enquiry was recorded, but the CRM lead could not be completed. Please call or WhatsApp Cossa so we can assist.",
      );
      return;
    }

    setSubmitState("sent");
    setStep("success");
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={
            openReceptionist
          }
          className={cn(
            "fixed bottom-4 right-4 z-50",
            "flex items-center gap-3 rounded-full",
            "border border-primary/40 bg-primary px-4 py-3",
            "text-primary-foreground shadow-xl",
            "transition-transform hover:scale-[1.02]",
          )}
          aria-label="Open Cossa AI receptionist"
        >
          <span className="relative">
            <Bot className="h-5 w-5" />

            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-primary bg-emerald-500" />
          </span>

          <span className="hidden text-left sm:block">
            <span className="block text-xs font-semibold">
              Cossa Receptionist
            </span>

            <span className="block text-[10px] opacity-80">
              Tell us what you need
            </span>
          </span>
        </button>
      )}

      {open && (
        <section
          className={cn(
            "fixed bottom-4 right-4 z-50",
            "w-[calc(100vw-2rem)] max-w-[430px]",
            "overflow-hidden rounded-2xl border border-primary/30",
            "bg-background shadow-2xl",
          )}
          aria-label="Cossa AI receptionist"
        >
          <header className="border-b border-border/60 bg-card/80">
            <div className="flex items-center gap-3 p-4">
              <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary gold-glow">
                <Bot className="h-5 w-5" />

                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-display text-base font-semibold">
                    Cossa Receptionist
                  </h2>

                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-widest text-primary">
                    Production
                  </span>
                </div>

                <p className="truncate text-xs text-muted-foreground">
                  Customer enquiry and service routing
                </p>
              </div>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() =>
                  setMinimised(
                    (current) =>
                      !current,
                  )
                }
                aria-label={
                  minimised
                    ? "Expand receptionist"
                    : "Minimise receptionist"
                }
              >
                {minimised ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={
                  closeReceptionist
                }
                aria-label="Close receptionist"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!minimised && (
              <div className="h-1 bg-border/40">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            )}
          </header>

          {!minimised && (
            <div className="max-h-[72vh] overflow-y-auto">
              {step === "welcome" && (
                <WelcomeStep
                  onContinue={() =>
                    setStep("service")
                  }
                />
              )}

              {step === "service" && (
                <ServiceStep
                  value={form.service}
                  error={submitError}
                  onChange={(service) => {
                    setForm(
                      (current) => ({
                        ...current,
                        service,
                      }),
                    );
                    setSubmitError(
                      null,
                    );
                  }}
                  onBack={() =>
                    setStep("welcome")
                  }
                  onContinue={
                    nextFromService
                  }
                />
              )}

              {step === "details" && (
                <DetailsStep
                  form={form}
                  error={submitError}
                  onChange={setForm}
                  onBack={() =>
                    setStep("service")
                  }
                  onContinue={
                    nextFromDetails
                  }
                />
              )}

              {step === "contact" && (
                <ContactStep
                  form={form}
                  error={submitError}
                  onChange={setForm}
                  onBack={() =>
                    setStep("details")
                  }
                  onContinue={
                    nextFromContact
                  }
                />
              )}

              {step === "review" &&
                selectedService && (
                  <ReviewStep
                    form={form}
                    service={
                      selectedService
                    }
                    submitState={
                      submitState
                    }
                    error={submitError}
                    onBack={() =>
                      setStep(
                        "contact",
                      )
                    }
                    onSubmit={
                      submitEnquiry
                    }
                  />
                )}

              {step === "success" &&
                selectedService && (
                  <SuccessStep
                    name={form.name}
                    service={
                      selectedService
                    }
                    preferredContact={
                      form.preferredContact
                    }
                    onReset={
                      resetReceptionist
                    }
                  />
                )}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function WelcomeStep({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <div className="p-5">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />

          <p className="text-sm font-semibold">
            Welcome to Cossa
          </p>
        </div>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          I can help identify the
          right Cossa service and
          record your request in our
          customer follow-up system.
        </p>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

          <p className="text-muted-foreground">
            Choose the service you
            need.
          </p>
        </div>

        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

          <p className="text-muted-foreground">
            Tell us about the project
            or business requirement.
          </p>
        </div>

        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

          <p className="text-muted-foreground">
            Your enquiry will be saved
            as a CRM lead for human
            follow-up.
          </p>
        </div>
      </div>

      <Button
        type="button"
        onClick={onContinue}
        className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Start enquiry
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <a href={phoneHref}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-primary/30 text-primary"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </a>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-primary/30 text-primary"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        </a>

        <a href={emailHref}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-primary/30 text-primary"
          >
            <Mail className="h-4 w-4" />
          </Button>
        </a>
      </div>
    </div>
  );
}

function ServiceStep({
  value,
  error,
  onChange,
  onBack,
  onContinue,
}: {
  value: ServiceKey | "";
  error: string | null;
  onChange: (
    service: ServiceKey,
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Step 1
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">
        What can Cossa help you
        with?
      </h3>

      <p className="mt-1 text-sm text-muted-foreground">
        Choose the service that best
        matches your requirement.
      </p>

      <div className="mt-4 grid gap-2">
        {serviceOptions.map(
          (service) => {
            const Icon =
              service.icon;
            const active =
              value === service.key;

            return (
              <button
                type="button"
                key={service.key}
                onClick={() =>
                  onChange(service.key)
                }
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 bg-card/40 hover:border-primary/30 hover:bg-primary/5",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {service.title}
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {
                      service.description
                    }
                  </span>
                </span>
              </button>
            );
          },
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <StepButtons
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  );
}

function DetailsStep({
  form,
  error,
  onChange,
  onBack,
  onContinue,
}: {
  form: ReceptionistForm;
  error: string | null;
  onChange: (
    value: ReceptionistForm,
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Step 2
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">
        Tell us about the request
      </h3>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receptionist-location">
            Location{" "}
            <span className="text-muted-foreground">
              (optional)
            </span>
          </Label>

          <Input
            id="receptionist-location"
            autoComplete="address-level2"
            maxLength={160}
            placeholder="Example: Centurion, Pretoria"
            value={form.location}
            onChange={(event) =>
              onChange({
                ...form,
                location:
                  event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receptionist-request">
            What do you need?
          </Label>

          <Textarea
            id="receptionist-request"
            required
            minLength={10}
            maxLength={3000}
            rows={5}
            placeholder="Describe the service, problem, project size, preferred timeline or business goal."
            value={form.request}
            onChange={(event) =>
              onChange({
                ...form,
                request:
                  event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receptionist-urgency">
            When do you need help?
          </Label>

          <select
            id="receptionist-urgency"
            value={form.urgency}
            onChange={(event) =>
              onChange({
                ...form,
                urgency:
                  event.target
                    .value as Urgency,
              })
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
          >
            {urgencyOptions.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <StepButtons
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  );
}

function ContactStep({
  form,
  error,
  onChange,
  onBack,
  onContinue,
}: {
  form: ReceptionistForm;
  error: string | null;
  onChange: (
    value: ReceptionistForm,
  ) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Step 3
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">
        How should Cossa contact
        you?
      </h3>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="receptionist-name">
            Your name
          </Label>

          <Input
            id="receptionist-name"
            required
            maxLength={120}
            autoComplete="name"
            value={form.name}
            onChange={(event) =>
              onChange({
                ...form,
                name:
                  event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receptionist-phone">
            Phone number
          </Label>

          <Input
            id="receptionist-phone"
            type="tel"
            inputMode="tel"
            required
            maxLength={30}
            autoComplete="tel"
            value={form.phone}
            onChange={(event) =>
              onChange({
                ...form,
                phone:
                  event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="receptionist-email">
            Email address{" "}
            <span className="text-muted-foreground">
              (optional unless email
              is preferred)
            </span>
          </Label>

          <Input
            id="receptionist-email"
            type="email"
            inputMode="email"
            maxLength={254}
            autoComplete="email"
            value={form.email}
            onChange={(event) =>
              onChange({
                ...form,
                email:
                  event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>
            Preferred contact method
          </Label>

          <div className="grid grid-cols-3 gap-2">
            {contactOptions.map(
              (option) => {
                const Icon =
                  option.icon;
                const active =
                  form.preferredContact ===
                  option.value;

                return (
                  <button
                    type="button"
                    key={
                      option.value
                    }
                    onClick={() =>
                      onChange({
                        ...form,
                        preferredContact:
                          option.value,
                      })
                    }
                    className={cn(
                      "rounded-lg border p-3 text-center text-xs transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    <Icon className="mx-auto mb-1 h-4 w-4" />
                    {option.label}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <StepButtons
        onBack={onBack}
        onContinue={onContinue}
      />
    </div>
  );
}

function ReviewStep({
  form,
  service,
  submitState,
  error,
  onBack,
  onSubmit,
}: {
  form: ReceptionistForm;
  service: ServiceOption;
  submitState: SubmitState;
  error: string | null;
  onBack: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        Final step
      </p>

      <h3 className="mt-2 font-display text-xl font-semibold">
        Review your enquiry
      </h3>

      <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-card/40 p-4 text-sm">
        <ReviewRow
          label="Service"
          value={service.title}
        />

        <ReviewRow
          label="Name"
          value={form.name}
        />

        <ReviewRow
          label="Phone"
          value={form.phone}
        />

        <ReviewRow
          label="Email"
          value={
            form.email ||
            "Not supplied"
          }
        />

        <ReviewRow
          label="Location"
          value={
            form.location ||
            "Not supplied"
          }
        />

        <ReviewRow
          label="Urgency"
          value={getUrgencyLabel(
            form.urgency,
          )}
        />

        <ReviewRow
          label="Preferred contact"
          value={getContactLabel(
            form.preferredContact,
          )}
        />

        <div className="border-t border-border/60 pt-3">
          <p className="text-xs font-semibold text-muted-foreground">
            Request
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
            {form.request}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-primary/25 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
        Your enquiry will be saved
        as an original contact message
        and as an actionable CRM lead.
        This receptionist does not
        promise that work has already
        been assigned or completed.
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={
            submitState ===
            "sending"
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          type="submit"
          disabled={
            submitState ===
            "sending"
          }
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {submitState ===
          "sending" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit enquiry
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function SuccessStep({
  name,
  service,
  preferredContact,
  onReset,
}: {
  name: string;
  service: ServiceOption;
  preferredContact: PreferredContact;
  onReset: () => void;
}) {
  return (
    <div className="p-5 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
        <CheckCircle2 className="h-7 w-7" />
      </div>

      <h3 className="mt-4 font-display text-xl font-semibold">
        Thank you, {name}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Your {service.title} enquiry
        has been recorded in the Cossa
        customer follow-up system.
      </p>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Preferred contact method:{" "}
        {getContactLabel(
          preferredContact,
        )}.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
        >
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp now
          </Button>
        </a>

        <a href={phoneHref}>
          <Button
            variant="outline"
            className="w-full border-primary/40 text-primary hover:bg-primary/10"
          >
            <Phone className="mr-2 h-4 w-4" />
            Call Cossa
          </Button>
        </a>
      </div>

      <Button
        type="button"
        variant="ghost"
        onClick={onReset}
        className="mt-3 text-primary"
      >
        Submit another enquiry
      </Button>
    </div>
  );
}

function StepButtons({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Button
        type="button"
        onClick={onContinue}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs text-muted-foreground">
        {label}
      </span>

      <span className="text-right text-xs font-medium">
        {value}
      </span>
    </div>
  );
}