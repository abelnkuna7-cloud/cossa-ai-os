import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  LockKeyhole,
  Mail,
  Menu,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GrowthProductBrand, ParentBrandEndorsement } from "@/components/brand/growth-brand";
import { CossaReceptionist } from "@/components/cossa-receptionist";
import { GROWTH_BRAND } from "@/lib/brand";

const phoneNumber = "067 801 1907";
const phoneHref = "tel:+27678011907";
const whatsappHref = "https://wa.me/27678011907";
const emailHref = "mailto:cossa@cossanexusholdings.co.za";

const mainWebsiteHref = "https://cossanexusholdings.co.za";

const nexDocsHref = "https://nexdocs.cossanexusholdings.co.za";

interface PublicSiteShellProps {
  children: ReactNode;
  showCallToAction?: boolean;
}

const publicNavigation = [
  {
    label: "For business owners",
    href: "/#contact",
  },
  {
    label: "White-label partnerships",
    href: emailHref,
  },
  {
    label: "Start a conversation",
    href: "/#quote-request",
  },
];

export function PublicSiteShell({ children, showCallToAction = true }: PublicSiteShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2"
            aria-label="GROWTH home"
            onClick={closeMobileMenu}
          >
            <GrowthProductBrand />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-4 text-sm text-muted-foreground xl:flex"
          >
            {publicNavigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="whitespace-nowrap transition-colors hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={phoneHref}
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline lg:inline-flex"
            >
              <Phone className="h-3.5 w-3.5" />
              {phoneNumber}
            </a>

            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex"
            >
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                WhatsApp
              </Button>
            </a>

            <Link to="/login">
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
              >
                <LockKeyhole className="mr-1.5 h-3.5 w-3.5" />

                <span className="hidden sm:inline">Workspace</span>

                <span className="sm:hidden">Login</span>
              </Button>
            </Link>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="xl:hidden"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((current) => !current)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="mx-auto max-w-7xl border-t border-border/60 py-4 xl:hidden"
          >
            <div className="grid gap-1">
              {publicNavigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  {item.label}
                </a>
              ))}

              <div className="my-2 border-t border-border/60" />

              <a
                href={mainWebsiteHref}
                target="_blank"
                rel="noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <span className="inline-flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cossa Nexus Holdings
                </span>

                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <a
                href={nexDocsHref}
                target="_blank"
                rel="noreferrer"
                onClick={closeMobileMenu}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  NexDocs
                </span>

                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </nav>
        )}
      </header>

      <main>{children}</main>

      {showCallToAction && (
        <section className="border-t border-border/60 bg-card/30 px-4 py-10">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-2xl border border-primary/25 bg-primary/5 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Speak with a Cossa specialist
              </p>

              <h2 className="mt-2 font-display text-2xl font-semibold">
                Start with the problem you need solved.
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Tell us what you need, where it is needed and when it matters. Cossa will record
                your enquiry for appropriate follow-up.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
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
                  WhatsApp
                </Button>
              </a>

              <a href="/#contact">
                <Button
                  variant="outline"
                  className="w-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  Request a quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-border/60 px-4 py-6 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="inline-flex items-center gap-2">
            <GrowthProductBrand />
          </Link>

          <p className="max-w-xl text-xs leading-5">
            Business growth intelligence for business owners, teams and white-label partners.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <a href={phoneHref} className="inline-flex items-center gap-1.5 hover:text-primary">
              <Phone className="h-3.5 w-3.5" />
              {phoneNumber}
            </a>

            <a href={emailHref} className="inline-flex items-center gap-1.5 hover:text-primary">
              <Mail className="h-3.5 w-3.5" />
              Email Cossa
            </a>

            <Link to="/login" className="inline-flex items-center gap-1.5 hover:text-primary">
              <LockKeyhole className="h-3.5 w-3.5" />
              Workspace
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-5 flex max-w-7xl flex-col justify-between gap-3 border-t border-border/60 pt-4 text-xs md:flex-row md:items-center">
          <ParentBrandEndorsement />

          <span>
            © {new Date().getFullYear()} Cossa Nexus Holdings (Pty) Ltd. All rights reserved.
          </span>

          <span>{GROWTH_BRAND.brandPromise}</span>
        </div>
      </footer>

      <CossaReceptionist />
    </div>
  );
}
