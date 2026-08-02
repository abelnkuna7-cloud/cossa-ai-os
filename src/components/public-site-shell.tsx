import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const whatsappHref = "https://wa.me/27678011907";

export function PublicSiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
            <span><strong className="font-display text-sm text-gradient-gold">COSSA AI</strong><span className="block text-[10px] uppercase tracking-widest text-muted-foreground">Business Growth OS</span></span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <Link to="/construction-growth" className="hover:text-primary">Construction</Link>
            <Link to="/facility-services-growth" className="hover:text-primary">Facilities</Link>
            <Link to="/sme-growth" className="hover:text-primary">For SMEs</Link>
          </nav>
          <Link to="/login"><Button size="sm" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10"><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Workspace</Button></Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border/60 px-4 py-8 text-sm text-muted-foreground"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 md:flex-row"><span>© {new Date().getFullYear()} Cossa Nexus Holdings (Pty) Ltd.</span><a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Talk to Cossa Nexus on WhatsApp <ArrowRight className="h-3.5 w-3.5" /></a></div></footer>
    </div>
  );
}
