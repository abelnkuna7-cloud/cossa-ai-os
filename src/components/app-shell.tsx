import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Link,
  useRouter,
} from "@tanstack/react-router";

import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  ChevronDown,
  Command,
  FileText,
  Headphones,
  LayoutDashboard,
  Megaphone,
  MemoryStick,
  Network,
  PackageSearch,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  User,
  UserRoundCog,
  WalletCards,
  Workflow,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/app-sidebar";

import {
  GrowthSymbol,
} from "@/components/brand/growth-brand";

import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface AiToolItem {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

interface AiToolGroup {
  title: string;
  description: string;
  items: AiToolItem[];
}

/* -------------------------------------------------------------------------- */
/* COMPANY NAVIGATION                                                         */
/* -------------------------------------------------------------------------- */

const COMPANY_NAVIGATION = [
  {
    title: "Company",
    to: "/command-center",
    icon: LayoutDashboard,
  },

  {
    title: "Departments",
    to: "/ai/workforce",
    icon: Building2,
  },

  {
    title: "Employees",
    to: "/ai/workforce",
    icon: UsersRound,
  },

  {
    title: "Workflows",
    to: "/ai/workflow",
    icon: Workflow,
  },

  {
    title: "Activity",
    to: "/ai/workforce",
    icon: Activity,
  },

  {
    title: "Integrations",
    to: "/integrations",
    icon: Network,
  },
] as const;

/* -------------------------------------------------------------------------- */
/* AI TOOL ORGANISATION                                                       */
/* -------------------------------------------------------------------------- */

const AI_TOOL_GROUPS: AiToolGroup[] = [
  {
    title: "Leadership & Core AI",

    description:
      "Company intelligence, coordination and workforce management.",

    items: [
      {
        title:
          "Cossa AI",

        description:
          "General Cossa business intelligence and assistance.",

        to:
          "/ai/cossa",

        icon:
          Sparkles,
      },

      {
        title:
          "AI CEO",

        description:
          "Delegate outcomes and coordinate the right employees.",

        to:
          "/ai/ceo",

        icon:
          BrainCircuit,
      },

      {
        title:
          "AI Workforce",

        description:
          "Departments, employees, missions and workforce execution.",

        to:
          "/ai/workforce",

        icon:
          UsersRound,
      },

      {
        title:
          "AI Business Consultant",

        description:
          "Business strategy, diagnosis and decision support.",

        to:
          "/ai/consultant",

        icon:
          BarChart3,
      },
    ],
  },

  {
    title: "Sales & Customers",

    description:
      "Revenue, customer service and CRM operations.",

    items: [
      {
        title:
          "AI Sales Assistant",

        description:
          "Sales support, opportunities and conversion assistance.",

        to:
          "/ai/sales-assistant",

        icon:
          Megaphone,
      },

      {
        title:
          "AI Customer Support",

        description:
          "Customer-service workflows and response assistance.",

        to:
          "/ai/support",

        icon:
          Headphones,
      },

      {
        title:
          "AI CRM Specialist",

        description:
          "CRM intelligence, lead management and pipeline support.",

        to:
          "/ai/crm-specialist",

        icon:
          UsersRound,
      },
    ],
  },

  {
    title: "Operations & Delivery",

    description:
      "Automation, operations and project execution.",

    items: [
      {
        title:
          "AI Automation",

        description:
          "Automate repeatable internal business processes.",

        to:
          "/ai/automation",

        icon:
          Zap,
      },

      {
        title:
          "Workflow Builder",

        description:
          "Design and coordinate structured business workflows.",

        to:
          "/ai/workflow",

        icon:
          Workflow,
      },

      {
        title:
          "AI Operations Manager",

        description:
          "Operational planning and business process coordination.",

        to:
          "/ai/operations-manager",

        icon:
          Settings2,
      },

      {
        title:
          "AI Project Manager",

        description:
          "Project planning, coordination and progress management.",

        to:
          "/ai/project-manager",

        icon:
          PackageSearch,
      },
    ],
  },

  {
    title: "Knowledge & Content",

    description:
      "Company knowledge, prompts, documents and persistent context.",

    items: [
      {
        title:
          "Prompt Library",

        description:
          "Reusable Cossa prompts and operating instructions.",

        to:
          "/ai/prompts",

        icon:
          BookOpen,
      },

      {
        title:
          "Knowledge Base",

        description:
          "Verified company information and AI reference material.",

        to:
          "/ai/knowledge",

        icon:
          FileText,
      },

      {
        title:
          "AI Memory",

        description:
          "Persistent company and workflow memory.",

        to:
          "/ai/memory",

        icon:
          MemoryStick,
      },

      {
        title:
          "AI Document Assistant",

        description:
          "Business documents, analysis and document workflows.",

        to:
          "/ai/document-assistant",

        icon:
          FileText,
      },
    ],
  },

  {
    title: "Business Administration",

    description:
      "Finance, HR and internal business management.",

    items: [
      {
        title:
          "AI Finance Assistant",

        description:
          "Finance support, analysis and financial administration.",

        to:
          "/ai/finance",

        icon:
          WalletCards,
      },

      {
        title:
          "AI HR Assistant",

        description:
          "HR, people operations and workforce support.",

        to:
          "/ai/hr",

        icon:
          UserRoundCog,
      },

      {
        title:
          "Voice AI",

        description:
          "Voice-enabled business and customer workflows.",

        to:
          "/ai/voice",

        icon:
          Bot,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* APP SHELL                                                                  */
/* -------------------------------------------------------------------------- */

export function AppShell({
  children,
}: {
  children:
    ReactNode;
}) {
  const router =
    useRouter();

  const [
    signingOut,
    setSigningOut,
  ] =
    useState(
      false,
    );

  const [
    aiToolsOpen,
    setAiToolsOpen,
  ] =
    useState(
      false,
    );

  const [
    mobileCompanyNavOpen,
    setMobileCompanyNavOpen,
  ] =
    useState(
      false,
    );

  const aiToolsRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  /* ------------------------------------------------------------------------ */
  /* SIGN OUT                                                                 */
  /* ------------------------------------------------------------------------ */

  async function signOut() {
    setSigningOut(
      true,
    );

    const {
      supabase,
    } =
      await import(
        "@/integrations/supabase/client"
      );

    await supabase.auth.signOut();

    await router.navigate({
      to:
        "/login",
    });

    setSigningOut(
      false,
    );
  }

  /* ------------------------------------------------------------------------ */
  /* CLOSE AI MENU WHEN CLICKING OUTSIDE                                      */
  /* ------------------------------------------------------------------------ */

  useEffect(
    () => {
      function handlePointerDown(
        event:
          MouseEvent,
      ) {
        if (
          aiToolsRef.current &&
          !aiToolsRef.current.contains(
            event.target as
              Node,
          )
        ) {
          setAiToolsOpen(
            false,
          );
        }
      }

      document.addEventListener(
        "mousedown",
        handlePointerDown,
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown,
        );
      };
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /* ESCAPE CLOSE                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(
    () => {
      function handleKeyDown(
        event:
          KeyboardEvent,
      ) {
        if (
          event.key ===
          "Escape"
        ) {
          setAiToolsOpen(
            false,
          );

          setMobileCompanyNavOpen(
            false,
          );
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [],
  );

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* EXISTING SIDEBAR */}

        <AppSidebar />

        {/* MAIN APPLICATION */}

        <div className="flex min-w-0 flex-1 flex-col">
          {/* --------------------------------------------------------------- */}
          {/* GLOBAL COMPANY HEADER                                           */}
          {/* --------------------------------------------------------------- */}

          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
            {/* PRIMARY HEADER */}

            <div className="flex h-14 items-center gap-3 px-3 lg:px-4">
              <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />

              {/* BRAND — MOBILE */}

              <Link
                to="/command-center"
                className="flex items-center gap-1.5 md:hidden"
                aria-label="GROWTH command center"
              >
                <GrowthSymbol className="h-7 w-7" />

                <span className="font-display text-xs font-semibold tracking-[0.15em] text-gradient-gold">
                  GROWTH
                </span>
              </Link>

              {/* DESKTOP COMPANY SEARCH */}

              <div className="hidden w-[300px] max-w-full items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-sm text-muted-foreground xl:flex 2xl:w-[380px]">
                <Search className="h-4 w-4 shrink-0" />

                <span className="flex-1 truncate">
                  Search company…
                </span>

                <span className="rounded border border-border/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                  Soon
                </span>
              </div>

              {/* ----------------------------------------------------------- */}
              {/* DESKTOP COMPANY NAVIGATION                                  */}
              {/* ----------------------------------------------------------- */}

              <nav
                className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
                aria-label="Company navigation"
              >
                {COMPANY_NAVIGATION.slice(
                  0,
                  3,
                ).map(
                  (
                    item,
                  ) => {
                    const Icon =
                      item.icon;

                    return (
                      <Link
                        key={
                          item.title
                        }
                        to={
                          item.to
                        }
                        className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        <Icon className="h-3.5 w-3.5" />

                        <span>
                          {
                            item.title
                          }
                        </span>
                      </Link>
                    );
                  },
                )}

                {/* AI TOOLS MEGA MENU */}

                <div
                  ref={
                    aiToolsRef
                  }
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setAiToolsOpen(
                        (
                          current,
                        ) =>
                          !current,
                      )
                    }
                    className={
                      aiToolsOpen
                        ? "flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-2 text-xs font-medium text-primary"
                        : "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                    }
                    aria-expanded={
                      aiToolsOpen
                    }
                    aria-haspopup="menu"
                  >
                    <Sparkles className="h-3.5 w-3.5" />

                    <span>
                      AI Tools
                    </span>

                    <ChevronDown
                      className={
                        aiToolsOpen
                          ? "h-3.5 w-3.5 rotate-180 transition-transform"
                          : "h-3.5 w-3.5 transition-transform"
                      }
                    />
                  </button>

                  {aiToolsOpen ? (
                    <div className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 w-[min(1180px,calc(100vw-3rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-primary/25 bg-background/98 shadow-2xl backdrop-blur-2xl">
                      {/* MENU HEADER */}

                      <div className="flex items-center justify-between gap-4 border-b border-border/60 bg-card/50 px-5 py-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                            Cossa AI
                          </p>

                          <h2 className="mt-1 font-display text-lg font-semibold">
                            Business AI
                            tools
                          </h2>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Open the
                            capability you
                            need without
                            searching through
                            the sidebar.
                          </p>
                        </div>

                        <Button
                          asChild
                          size="sm"
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Link
                            to="/ai/ceo"
                            onClick={() =>
                              setAiToolsOpen(
                                false,
                              )
                            }
                          >
                            <BrainCircuit className="mr-1.5 h-4 w-4" />

                            Ask AI CEO
                          </Link>
                        </Button>
                      </div>

                      {/* GROUPS */}

                      <div className="grid max-h-[72vh] gap-0 overflow-y-auto md:grid-cols-2 xl:grid-cols-5">
                        {AI_TOOL_GROUPS.map(
                          (
                            group,
                          ) => (
                            <section
                              key={
                                group.title
                              }
                              className="border-b border-border/40 p-4 md:border-r xl:border-b-0 last:border-r-0"
                            >
                              <h3 className="text-xs font-semibold text-foreground">
                                {
                                  group.title
                                }
                              </h3>

                              <p className="mt-1 min-h-10 text-[10px] leading-relaxed text-muted-foreground">
                                {
                                  group.description
                                }
                              </p>

                              <div className="mt-3 space-y-1">
                                {group.items.map(
                                  (
                                    item,
                                  ) => {
                                    const Icon =
                                      item.icon;

                                    return (
                                      <Link
                                        key={
                                          item.to
                                        }
                                        to={
                                          item.to
                                        }
                                        onClick={() =>
                                          setAiToolsOpen(
                                            false,
                                          )
                                        }
                                        className="group flex items-start gap-2.5 rounded-xl p-2.5 transition hover:bg-primary/10"
                                      >
                                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
                                          <Icon className="h-3.5 w-3.5" />
                                        </div>

                                        <div className="min-w-0">
                                          <p className="text-[11px] font-medium text-foreground transition group-hover:text-primary">
                                            {
                                              item.title
                                            }
                                          </p>

                                          <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-muted-foreground">
                                            {
                                              item.description
                                            }
                                          </p>
                                        </div>
                                      </Link>
                                    );
                                  },
                                )}
                              </div>
                            </section>
                          ),
                        )}
                      </div>

                      {/* FOOTER */}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card/30 px-5 py-3">
                        <p className="text-[10px] text-muted-foreground">
                          AI employees
                          and company
                          departments remain
                          managed from the
                          AI Workforce.
                        </p>

                        <div className="flex gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-primary/30 text-primary"
                          >
                            <Link
                              to="/ai/workforce"
                              onClick={() =>
                                setAiToolsOpen(
                                  false,
                                )
                              }
                            >
                              <UsersRound className="mr-1.5 h-3.5 w-3.5" />

                              Workforce
                            </Link>
                          </Button>

                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="border-primary/30 text-primary"
                          >
                            <Link
                              to="/integrations"
                              onClick={() =>
                                setAiToolsOpen(
                                  false,
                                )
                              }
                            >
                              <Network className="mr-1.5 h-3.5 w-3.5" />

                              Integrations
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {COMPANY_NAVIGATION.slice(
                  3,
                ).map(
                  (
                    item,
                  ) => {
                    const Icon =
                      item.icon;

                    return (
                      <Link
                        key={
                          item.title
                        }
                        to={
                          item.to
                        }
                        className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        <Icon className="h-3.5 w-3.5" />

                        <span>
                          {
                            item.title
                          }
                        </span>
                      </Link>
                    );
                  },
                )}
              </nav>

              {/* ----------------------------------------------------------- */}
              {/* RIGHT ACTIONS                                               */}
              {/* ----------------------------------------------------------- */}

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                {/* MOBILE COMPANY MENU */}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setMobileCompanyNavOpen(
                      (
                        current,
                      ) =>
                        !current,
                    )
                  }
                  className="gap-1.5 text-muted-foreground hover:text-foreground lg:hidden"
                >
                  <Building2 className="h-4 w-4" />

                  <span className="hidden sm:inline">
                    Company
                  </span>

                  <ChevronDown
                    className={
                      mobileCompanyNavOpen
                        ? "h-3.5 w-3.5 rotate-180 transition-transform"
                        : "h-3.5 w-3.5 transition-transform"
                    }
                  />
                </Button>

                {/* ASK COSSA AI */}

                <Link
                  to="/ai/cossa"
                  className="hidden sm:inline-flex"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Command className="h-3.5 w-3.5" />

                    <span className="hidden xl:inline">
                      Ask Cossa AI
                    </span>

                    <span className="xl:hidden">
                      AI
                    </span>
                  </Button>
                </Link>

                {/* NOTIFICATIONS */}

                <Link to="/notifications">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                </Link>

                {/* PROFILE / SIGN OUT */}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={
                    signOut
                  }
                  disabled={
                    signingOut
                  }
                  className="rounded-full bg-primary/15 text-primary hover:bg-primary/25"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* MOBILE COMPANY NAVIGATION                                     */}
            {/* ------------------------------------------------------------- */}

            {mobileCompanyNavOpen ? (
              <div className="border-t border-border/50 px-3 py-3 lg:hidden">
                <div className="grid gap-2 sm:grid-cols-2">
                  {COMPANY_NAVIGATION.map(
                    (
                      item,
                    ) => {
                      const Icon =
                        item.icon;

                      return (
                        <Link
                          key={
                            item.title
                          }
                          to={
                            item.to
                          }
                          onClick={() =>
                            setMobileCompanyNavOpen(
                              false,
                            )
                          }
                          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>

                          {
                            item.title
                          }
                        </Link>
                      );
                    },
                  )}

                  <Link
                    to="/ai/cossa"
                    onClick={() =>
                      setMobileCompanyNavOpen(
                        false,
                      )
                    }
                    className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs font-medium text-primary sm:col-span-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <Sparkles className="h-4 w-4" />
                    </div>

                    Open Cossa AI Tools
                  </Link>
                </div>
              </div>
            ) : null}
          </header>

          {/* --------------------------------------------------------------- */}
          {/* PAGE CONTENT                                                    */}
          {/* --------------------------------------------------------------- */}

          <main className="flex-1 p-4 md:p-6 lg:p-8">
            {
              children
            }
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
