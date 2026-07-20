import type { ReactNode } from "react";
import { Search, Command, Bell, User } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
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
              <Button variant="outline" size="sm" className="hidden sm:inline-flex gap-2 border-primary/40 text-primary hover:bg-primary/10">
                <Command className="h-3.5 w-3.5" />
                <span>Ask Cossa AI</span>
                <span className="rounded border border-primary/40 px-1 py-0.5 text-[10px]">⌘K</span>
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="h-4 w-4" />
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
