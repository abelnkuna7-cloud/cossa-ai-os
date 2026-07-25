import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Building2, Palette, Brain } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Cossa AI" },
      { name: "description", content: "Business profile, brand and AI preferences for Cossa AI." },
      { property: "og:title", content: "Settings — Cossa AI" },
      { property: "og:description", content: "Configure your Cossa AI workspace." },
    ],
  }),
});

const STORAGE_KEY = "cossa.settings.v1";

interface SettingsShape {
  businessName: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  timezone: string;
  brandPrimary: string;
  brandAccent: string;
  brandVoice: string;
  aiTone: string;
  aiContext: string;
}

const DEFAULTS: SettingsShape = {
  businessName: "",
  industry: "",
  website: "",
  phone: "",
  email: "",
  address: "",
  currency: "ZAR",
  timezone: "Africa/Johannesburg",
  brandPrimary: "#0A1F44",
  brandAccent: "#D4AF37",
  brandVoice: "",
  aiTone: "professional",
  aiContext: "",
};

function load(): SettingsShape {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SettingsShape>) };
  } catch {
    return DEFAULTS;
  }
}

function SettingsPage() {
  const [state, setState] = useState<SettingsShape>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  function set<K extends keyof SettingsShape>(k: K, v: SettingsShape[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    toast.success("Settings saved");
  }

  if (!hydrated) return null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <section className="glass-card relative overflow-hidden p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary gold-glow">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <StatusBadge status="Live" />
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Configure your business profile, brand and AI preferences. Used across every Cossa AI module.
        </p>
      </section>

      <Section icon={Building2} title="Business profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input value={state.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Acme (Pty) Ltd" />
          </Field>
          <Field label="Industry">
            <Input value={state.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Construction" />
          </Field>
          <Field label="Website">
            <Input value={state.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Phone">
            <Input value={state.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+27" />
          </Field>
          <Field label="Email">
            <Input type="email" value={state.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@" />
          </Field>
          <Field label="Currency">
            <Input value={state.currency} onChange={(e) => set("currency", e.target.value)} placeholder="ZAR" />
          </Field>
          <Field label="Timezone">
            <Input value={state.timezone} onChange={(e) => set("timezone", e.target.value)} placeholder="Africa/Johannesburg" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Textarea value={state.address} onChange={(e) => set("address", e.target.value)} rows={2} />
          </Field>
        </div>
      </Section>

      <Section icon={Palette} title="Brand">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary color">
            <Input value={state.brandPrimary} onChange={(e) => set("brandPrimary", e.target.value)} placeholder="#0A1F44" />
          </Field>
          <Field label="Accent color">
            <Input value={state.brandAccent} onChange={(e) => set("brandAccent", e.target.value)} placeholder="#D4AF37" />
          </Field>
          <Field label="Brand voice" className="sm:col-span-2">
            <Textarea
              value={state.brandVoice}
              onChange={(e) => set("brandVoice", e.target.value)}
              rows={3}
              placeholder="Confident, warm, expert. We speak plainly and never patronise."
            />
          </Field>
        </div>
      </Section>

      <Section icon={Brain} title="AI preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default tone">
            <select
              value={state.aiTone}
              onChange={(e) => set("aiTone", e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="direct">Direct</option>
              <option value="premium">Premium / luxury</option>
            </select>
          </Field>
          <Field label="Business context for AI" className="sm:col-span-2">
            <Textarea
              value={state.aiContext}
              onChange={(e) => set("aiContext", e.target.value)}
              rows={4}
              placeholder="Anything Cossa AI should always know: markets you serve, ideal customers, offers, differentiators."
            />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
          <Save className="mr-1.5 h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof SettingsIcon; title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-display text-lg font-semibold">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
