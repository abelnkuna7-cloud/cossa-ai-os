import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Brain,
  Building2,
  Palette,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";
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
      {
        name: "description",
        content: "Device preferences plus links to persistent Cossa account and access controls.",
      },
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
  brandPrimary: "#000000",
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

  function set<K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    toast.success("Device preferences saved", {
      description: "These preferences are stored in this browser only.",
    });
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
        <h1 className="mt-4 font-display text-3xl font-semibold">Administration & Settings</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Browser-local workspace preferences are kept separate from persistent Supabase account profiles and role permissions. This prevents device settings from being mistaken for company-wide configuration.
        </p>
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-semibold">Persistent Team & Access</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your real Supabase profile and, for authorised admins, team role permissions. These settings persist across devices and sessions.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/administration/team-access">Open Team & Access</Link>
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Device-local preference boundary:</strong> the fields below currently use browser localStorage. They are useful personal preferences, but they are not presented as authoritative company records or global Cossa AI knowledge.
      </section>

      <Section icon={Building2} title="Device business preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input value={state.businessName} onChange={(event) => set("businessName", event.target.value)} placeholder="Cossa Nexus Holdings" />
          </Field>
          <Field label="Industry">
            <Input value={state.industry} onChange={(event) => set("industry", event.target.value)} placeholder="Construction" />
          </Field>
          <Field label="Website">
            <Input value={state.website} onChange={(event) => set("website", event.target.value)} placeholder="https://" />
          </Field>
          <Field label="Phone">
            <Input value={state.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+27" />
          </Field>
          <Field label="Email">
            <Input type="email" value={state.email} onChange={(event) => set("email", event.target.value)} placeholder="hello@" />
          </Field>
          <Field label="Currency">
            <Input value={state.currency} onChange={(event) => set("currency", event.target.value)} placeholder="ZAR" />
          </Field>
          <Field label="Timezone">
            <Input value={state.timezone} onChange={(event) => set("timezone", event.target.value)} placeholder="Africa/Johannesburg" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Textarea value={state.address} onChange={(event) => set("address", event.target.value)} rows={2} />
          </Field>
        </div>
      </Section>

      <Section icon={Palette} title="Device brand preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary color">
            <Input value={state.brandPrimary} onChange={(event) => set("brandPrimary", event.target.value)} placeholder="#000000" />
          </Field>
          <Field label="Accent color">
            <Input value={state.brandAccent} onChange={(event) => set("brandAccent", event.target.value)} placeholder="#D4AF37" />
          </Field>
          <Field label="Brand voice" className="sm:col-span-2">
            <Textarea
              value={state.brandVoice}
              onChange={(event) => set("brandVoice", event.target.value)}
              rows={3}
              placeholder="Professional, direct, evidence-led."
            />
          </Field>
        </div>
      </Section>

      <Section icon={Brain} title="Device AI preferences">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default tone">
            <select
              value={state.aiTone}
              onChange={(event) => set("aiTone", event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="direct">Direct</option>
              <option value="premium">Premium / luxury</option>
            </select>
          </Field>
          <Field label="Personal AI context" className="sm:col-span-2">
            <Textarea
              value={state.aiContext}
              onChange={(event) => set("aiContext", event.target.value)}
              rows={4}
              placeholder="Optional personal working preference for this browser. Do not use this field as authoritative company truth."
            />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} className="bg-primary text-primary-foreground hover:bg-primary/90 gold-glow">
          <Save className="mr-1.5 h-4 w-4" /> Save device preferences
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
