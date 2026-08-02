import { useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Search, Command, Bell, User } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    await router.navigate({ to: "/login" });
    setSigningOut(false);
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-3 backdrop-blur-xl">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-sm text-muted-foreground w-[420px] max-w-full">
              <Search className="h-4 w-4" />
              <span className="flex-1 truncate">Search customers, deals, docs, campaigns…</span>
              <span className="rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">Soon</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Link to="/ai/cossa" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
                  <Command className="h-3.5 w-3.5" />
                  <span>Ask Cossa AI</span>
                </Button>
              </Link>
              <Link to="/notifications">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                disabled={signingOut}
                className="rounded-full bg-primary/15 text-primary hover:bg-primary/25"
                aria-label="Sign out"
                title="Sign out"
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
