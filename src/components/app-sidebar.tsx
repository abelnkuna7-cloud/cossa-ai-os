import {
  Link,
  useRouterState,
} from "@tanstack/react-router";

import {
  Building2,
  Code2,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Settings2,
  Store,
  TrendingUp,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import {
  GrowthProductBrand,
  GrowthSymbol,
  ParentBrandEndorsement,
} from "@/components/brand/growth-brand";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface SidebarNavigationItem {
  title: string;
  description: string;
  to: string;
  icon: LucideIcon;
  matchPrefixes?: readonly string[];
}

interface SidebarNavigationGroup {
  label: string;
  items: readonly SidebarNavigationItem[];
}

/* -------------------------------------------------------------------------- */
/* COMPANY NAVIGATION                                                         */
/* -------------------------------------------------------------------------- */

/**
 * CEO-style navigation.
 *
 * Important:
 * - Every destination below points to a route that actually exists.
 * - AI tools are intentionally excluded from this sidebar.
 * - Detailed AI tools belong in the global top navigation.
 * - The sidebar represents the structure of the company.
 */
const COMPANY_SIDEBAR: SidebarNavigationGroup[] = [
  {
    label: "Company",

    items: [
      {
        title: "Command Center",

        description:
          "Company overview, priorities, health and operating command.",

        to: "/command-center",

        icon: LayoutDashboard,

        matchPrefixes: [
          "/command-center",
          "/mission-control",
          "/business-health",
          "/opportunity-radar",
          "/ai-recommendations",
        ],
      },

      {
        title: "AI Company",

        description:
          "AI departments, employees, workforce coordination and executive control.",

        to: "/ai/workforce",

        icon: Building2,

        matchPrefixes: [
          "/ai/workforce",
          "/ai/ceo",
        ],
      },
    ],
  },

  {
    label: "Revenue",

    items: [
      {
        title: "Marketing & Growth",

        description:
          "Marketing strategy, SEO, campaigns, content, social media and advertising.",

        to: "/marketing/ai-director",

        icon: Megaphone,

        matchPrefixes: [
          "/marketing",
        ],
      },

      {
        title: "Sales & Revenue",

        description:
          "CRM, leads, customers, pipeline, opportunities, quotations and revenue intelligence.",

        to: "/sales/crm",

        icon: TrendingUp,

        matchPrefixes: [
          "/sales",
        ],
      },
    ],
  },

  {
    label: "Businesses",

    items: [
      {
        title: "Cossa Store",

        description:
          "Store workforce, product intelligence, suppliers, merchandising and commercial operations.",

        /**
         * There is currently no /store route in src/routes.
         *
         * Until a dedicated Cossa Store page is created, this correctly opens
         * the AI Company where the Store department already exists.
         */
        to: "/ai/workforce",

        icon: Store,

        matchPrefixes: [],
      },

      {
        title: "Cossa Tech",

        description:
          "Technical workforce, website delivery, software, automation and technology operations.",

        /**
         * There is currently no /tech route in src/routes.
         *
         * The Tech department currently lives inside AI Company.
         */
        to: "/ai/workforce",

        icon: Code2,

        matchPrefixes: [],
      },
    ],
  },

  {
    label: "Operations",

    items: [
      {
        title: "Workflows",

        description:
          "Workflow design, coordinated execution and automation.",

        to: "/ai/workflow",

        icon: Workflow,

        matchPrefixes: [
          "/ai/workflow",
          "/ai/automation",
          "/operations/automation",
        ],
      },

      {
        title: "Operations",

        description:
          "Projects, tasks, calendars, documents, reports and business operations.",

        /**
         * /operations itself does not exist.
         *
         * /operations/projects is the first real Operations route.
         */
        to: "/operations/projects",

        icon: Wrench,

        matchPrefixes: [
          "/operations",
        ],
      },
    ],
  },

  {
    label: "Platform",

    items: [
      {
        title: "Integrations",

        description:
          "Connected accounts, external systems and authorised business integrations.",

        to: "/integrations",

        icon: PackageSearch,

        matchPrefixes: [
          "/integrations",
        ],
      },

      {
        title: "Administration",

        description:
          "Workspace configuration, platform settings and administrative control.",

        to: "/settings",

        icon: Settings2,

        matchPrefixes: [
          "/settings",
        ],
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalisePathname(
  pathname: string,
): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(
    /\/+$/,
    "",
  );
}

function pathMatchesPrefix(
  pathname: string,
  prefix: string,
): boolean {
  const normalisedPathname =
    normalisePathname(
      pathname,
    );

  const normalisedPrefix =
    normalisePathname(
      prefix,
    );

  return (
    normalisedPathname ===
      normalisedPrefix ||
    normalisedPathname.startsWith(
      `${normalisedPrefix}/`,
    )
  );
}

function isNavigationItemActive(
  pathname: string,
  item: SidebarNavigationItem,
): boolean {
  if (
    pathMatchesPrefix(
      pathname,
      item.to,
    )
  ) {
    return true;
  }

  return (
    item.matchPrefixes?.some(
      (
        prefix,
      ) =>
        pathMatchesPrefix(
          pathname,
          prefix,
        ),
    ) ??
    false
  );
}

/* -------------------------------------------------------------------------- */
/* APP SIDEBAR                                                                */
/* -------------------------------------------------------------------------- */

export function AppSidebar() {
  const {
    state,
  } =
    useSidebar();

  const collapsed =
    state ===
    "collapsed";

  const pathname =
    useRouterState({
      select:
        (
          routerState,
        ) =>
          routerState.location.pathname,
    });

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border"
    >
      {/* ------------------------------------------------------------------ */}
      {/* BRAND                                                              */}
      {/* ------------------------------------------------------------------ */}

      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-2 py-2">
          <Link
            to="/command-center"
            aria-label="GROWTH Command Center"
            className="block"
          >
            {collapsed ? (
              <GrowthSymbol className="mx-auto h-9 w-9" />
            ) : (
              <GrowthProductBrand />
            )}
          </Link>
        </div>
      </SidebarHeader>

      {/* ------------------------------------------------------------------ */}
      {/* COMPANY NAVIGATION                                                 */}
      {/* ------------------------------------------------------------------ */}

      <SidebarContent className="py-1">
        {COMPANY_SIDEBAR.map(
          (
            group,
          ) => (
            <SidebarGroup
              key={
                group.label
              }
              className="py-1"
            >
              {!collapsed ? (
                <SidebarGroupLabel className="h-7 px-2 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  {
                    group.label
                  }
                </SidebarGroupLabel>
              ) : null}

              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {group.items.map(
                    (
                      item,
                    ) => {
                      const active =
                        isNavigationItemActive(
                          pathname,
                          item,
                        );

                      const Icon =
                        item.icon;

                      return (
                        <SidebarMenuItem
                          key={
                            `${group.label}-${item.title}`
                          }
                        >
                          <SidebarMenuButton
                            asChild
                            isActive={
                              active
                            }
                            tooltip={{
                              children:
                                (
                                  <div className="max-w-60">
                                    <p className="font-medium">
                                      {
                                        item.title
                                      }
                                    </p>

                                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                      {
                                        item.description
                                      }
                                    </p>
                                  </div>
                                ),
                            }}
                            className={
                              active
                                ? [
                                    "min-h-10",
                                    "rounded-lg",
                                    "border",
                                    "border-primary/20",
                                    "bg-primary/10",
                                    "font-medium",
                                    "text-primary",
                                    "hover:bg-primary/15",
                                    "hover:text-primary",
                                  ].join(
                                    " ",
                                  )
                                : [
                                    "min-h-10",
                                    "rounded-lg",
                                    "border",
                                    "border-transparent",
                                    "text-sidebar-foreground/80",
                                    "transition-colors",
                                    "hover:border-sidebar-border",
                                    "hover:bg-sidebar-accent",
                                    "hover:text-sidebar-accent-foreground",
                                  ].join(
                                    " ",
                                  )
                            }
                          >
                            <Link
                              to={
                                item.to
                              }
                              className="flex w-full items-center gap-2"
                            >
                              <Icon
                                className={
                                  active
                                    ? "h-4 w-4 shrink-0 text-primary"
                                    : "h-4 w-4 shrink-0"
                                }
                              />

                              {!collapsed ? (
                                <span className="min-w-0 flex-1 truncate text-sm">
                                  {
                                    item.title
                                  }
                                </span>
                              ) : null}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    },
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ),
        )}
      </SidebarContent>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER                                                             */}
      {/* ------------------------------------------------------------------ */}

      <SidebarFooter className="border-t border-sidebar-border">
        {collapsed ? (
          <GrowthSymbol className="mx-auto h-6 w-6 opacity-75" />
        ) : (
          <ParentBrandEndorsement className="px-1 py-1" />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
