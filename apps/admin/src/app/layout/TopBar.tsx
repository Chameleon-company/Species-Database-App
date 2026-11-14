import { CircleUserRound, LogOut } from "lucide-react";
import { Button } from "@sda/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sda/ui/components/dropdown-menu";
import { SidebarTrigger } from "@sda/ui/components/sidebar";
import LanguageSwitch from "../../shared/ui/LanguageSwitch";
import { useLanguage } from "../../useLanguage";
import { useLogout } from "./useLogout";

function AccountMenu() {
  const { t } = useLanguage();
  const logout = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("accountMenu")} className="rounded-full text-icon">
          <CircleUserRound className="size-7" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-xl">
        <DropdownMenuLabel className="text-label font-normal tracking-normal text-faint">
          <p>{t("signedAs")}</p>
          <p>{t("signedIn")}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={logout}>
          <LogOut />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function TopBar() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-card px-4">
      <SidebarTrigger aria-label={t("openMenu")} className="text-body md:hidden" />
      <div className="flex-1" />
      <LanguageSwitch />
      <AccountMenu />
    </header>
  );
}
