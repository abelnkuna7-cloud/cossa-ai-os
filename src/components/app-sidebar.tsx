import {
  Link,
  useRouterState,
} from "@tanstack/react-router";

import {
  BarChart3,
  Building2,
  Code2,
  Command,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Settings2,
  ShoppingCart,
  Store,
  TrendingUp,
  UsersRound,
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
/* CEO / COMPANY SIDEBAR                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Important:
 *
 * This sidebar intentionally exposes only the company's main operating areas.
 *
 * Detailed AI tools are available from the global top navigation.
 * Nothing is deleted. Routes remain available throughout the product.
 *
 * The sidebar should answer:
 *
 * "Where in the company do I want to work?"
 *
 * The top navigation / search should answer:
 *
 * "Which exact tool or employee do I need?"
 */
const COMPANY_SIDEBAR: SidebarNavigationGroup[] = [
  {
    label:
      "Company",

    items: [
      {
        title:
          "Command Center",

        description:
          "Company overview, priorities and operating command.",

        to:
          "/command-center",

        icon:
          LayoutDashboard,

        matchPrefixes: [
          "/command-center",
        ],
      },

      {
        title:
          "AI Company",

        description:
          "Departments, employees and workforce coordination.",

        to:
          "/ai/workforce",

        icon:
          Building2,

        matchPrefixes: [
          "/ai/workforce",
          "/ai/ceo",
        ],
      },
    ],
  },

  {
    label:
      "Revenue",

    items: [
      {
        title:
          "Marketing & Growth",

        description:
          "Content, campaigns, social media, SEO and advertising.",

        to:
          "/ai/workforce",

        icon:
          Megaphone,

        matchPrefixes: [
          "/marketing",
          "/growth",
          "/social",
          "/campaign",
          "/seo",
          "/ads",
        ],
      },

      {
        title:
          "Sales & Revenue",

        description:
          "Leads, CRM, sales activity, opportunities and customer growth.",

        to:
          "/crm",

        icon:
          TrendingUp,

        matchPrefixes: [
          "/crm",
          "/sales",
          "/leads",
          "/deals",
          "/customers",
          "/revenue",
        ],
      },
    ],
  },

  {
    label:
      "Businesses",

    items: [
      {
        title:
          "Cossa Store",

        description:
          "Products, catalogue, suppliers and store operations.",

        to:
          "/store",

        icon:
          Store,

        matchPrefixes: [
          "/store",
          "/products",
          "/catalog",
          "/catalogue",
          "/suppliers",
        ],
      },

      {
        title:
          "Cossa Tech",

        description:
          "Websites, software, automation and technical delivery.",

        to:
          "/tech",

        icon:
          Code2,

        matchPrefixes: [
          "/tech",
          "/websites",
          "/website",
          "/development",
        ],
      },
    ],
  },

  {
    label:
      "Operations",

    items: [
      {
        title:
          "Workflows",

        description:
          "Company workflows, automation and coordinated execution.",

        to:
          "/ai/workflow",

        icon:
          Workflow,

        matchPrefixes: [
          "/ai/workflow",
          "/automation",
          "/workflows",
        ],
      },

      {
        title:
          "Operations",

        description:
          "Internal execution, service delivery and business operations.",

        to:
          "/operations",

        icon:
          Wrench,

        matchPrefixes: [
          "/operations",
          "/projects",
          "/tasks",
          "/service",
        ],
      },
    ],
  },

  {
    label:
      "Platform",

    items: [
      {
        title:
          "Integrations",

        description:
          "Connected accounts, publishing channels and external systems.",

        to:
          "/integrations",

        icon:
          PackageSearch,

        matchPrefixes: [
          "/integrations",
          "/connections",
        ],
      },

      {
        title:
          "Administration",

        description:
          "Platform configuration, business settings and system control.",

        to:
          "/settings",

        icon:
          Settings2,

        matchPrefixes: [
          "/settings",
          "/admin",
          "/organisation",
          "/organization",
        ],
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function isNavigationItemActive(
  pathname: string,
  item: SidebarNavigationItem,
): boolean {
  if (
    pathname ===
    item.to
  ) {
    return true;
  }

  const prefixes =
    item.matchPrefixes ??
    [];

  return prefixes.some(
    (
      prefix,
    ) =>
      pathname ===
        prefix ||
      pathname.startsWith(
        `${prefix}/`,
      ),
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
          {collapsed ? (
            <Link
              to="/command-center"
              aria-label="GROWTH command center"
            >
              <GrowthSymbol className="mx-auto h-9 w-9" />
            </Link>
          ) : (
            <Link
              to="/command-center"
              aria-label="GROWTH command center"
            >
              <GrowthProductBrand />
            </Link>
          )}
        </div>
      </SidebarHeader>

      {/* ------------------------------------------------------------------ */}
      {/* COMPANY NAVIGATION                                                 */}
      {/* ------------------------------------------------------------------ */}

      <SidebarContent>
        {COMPANY_SIDEBAR.map(
          (
            group,
          ) => (
            <SidebarGroup
              key={
                group.label
              }
            >
              {!collapsed ? (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80">
                  {
                    group.label
                  }
                </SidebarGroupLabel>
              ) : null}

              <SidebarGroupContent>
                <SidebarMenu>
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
                            tooltip={
                              collapsed
                                ? {
                                    children:
                                      (
                                        <div className="max-w-56">
                                          <p className="font-medium">
                                            {
                                              item.title
                                            }
                                          </p>

                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {
                                              item.description
                                            }
                                          </p>
                                        </div>
                                      ),
                                  }
                                : item.title
                            }
                            className={
                              active
                                ? "min-h-10 bg-primary/10 text-primary"
                                : "min-h-10"
                            }
                          >
                            <Link
                              to={
                                item.to
                              }
                              className="flex items-center gap-2"
                            >
                              <Icon className="h-4 w-4 shrink-0" />

                              {!collapsed ? (
                                <div className="min-w-0">
                                  <span className="block truncate text-sm">
                                    {
                                      item.title
                                    }
                                  </span>
                                </div>
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
