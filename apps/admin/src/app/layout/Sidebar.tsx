import type { ComponentType } from "react";
import { NavLink, useMatch } from "react-router-dom";
import { ChartColumn, House, Images, LogOut, ShieldCheck, TreeDeciduous, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@sda/ui/components/sidebar";
import Logo from "../../assets/logo-color.png";
import { translations } from "../../translations";
import { useLanguage } from "../../useLanguage";
import { useLogout } from "./useLogout";

const NAV_ITEMS: { to: string; labelKey: string; Icon: ComponentType<{ className?: string }> }[] = [
  { to: "/", labelKey: "dashboard", Icon: House },
  { to: "/species", labelKey: "species", Icon: TreeDeciduous },
  { to: "/media", labelKey: "media", Icon: Images },
  { to: "/audit", labelKey: "audit", Icon: ShieldCheck },
  { to: "/users", labelKey: "users", Icon: Users },
  { to: "/analytics", labelKey: "analytics", Icon: ChartColumn },
];

const itemClass =
  "group/nav relative h-auto gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-icon hover:bg-accent hover:text-brand-mid data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-primary";

const iconBoxClass =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-faint transition-colors group-hover/nav:bg-muted group-hover/nav:text-brand-mid group-data-[active=true]/nav:bg-brand-chip group-data-[active=true]/nav:text-primary";

function NavItem({ to, label, Icon }: { to: string; label: string; Icon: ComponentType<{ className?: string }> }) {
  const active = useMatch({ path: to, end: to === "/" }) !== null;
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} className={itemClass}>
        <NavLink to={to} end={to === "/"} onClick={() => setOpenMobile(false)}>
          <span className="absolute top-1/2 left-0 h-6 w-0.75 -translate-y-1/2 rounded-r bg-brand-mid opacity-0 transition-opacity group-hover/nav:opacity-40 group-data-[active=true]/nav:opacity-100" />
          <span className={iconBoxClass}>
            <Icon className="size-4.5" />
          </span>
          <span className="flex-1 truncate">{label}</span>
          {active && <span className="size-1.5 rounded-full bg-brand-mid" />}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AppSidebar() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[key as keyof typeof translations]?.[lang] || key;
  const logout = useLogout();

  return (
    <Sidebar className="border-r-sidebar-border">
      <SidebarHeader className="h-20 items-center justify-center border-b bg-muted p-0">
        <img src={Logo} alt="FINI Logo" className="h-10 w-auto object-contain" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-2.5">
          <SidebarGroupLabel className="h-auto px-2.5 pt-3 pb-2 text-label text-brand-accent uppercase">
            {t("mainMenu")}
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {NAV_ITEMS.map(({ to, labelKey, Icon }) => (
              <NavItem key={to} to={to} label={t(labelKey)} Icon={Icon} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-4 bg-brand-line data-[orientation=horizontal]:w-auto" />
      <SidebarFooter className="px-2.5 pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              className="group/nav h-auto gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-faint hover:bg-destructive-soft hover:text-destructive"
            >
              <span className="flex size-8 shrink-0 items-center justify-center">
                <LogOut className="size-4.5" />
              </span>
              {t("logout")}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
