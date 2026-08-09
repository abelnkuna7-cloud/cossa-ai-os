import { Link, useRouterState } from "@tanstack/react-router";
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
import { MODULES } from "@/lib/modules";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="px-2 py-2">
          {collapsed ? (
            <GrowthSymbol className="mx-auto h-9 w-9" />
          ) : (
            <GrowthProductBrand />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {MODULES.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/80">{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.to} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="truncate">{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

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
