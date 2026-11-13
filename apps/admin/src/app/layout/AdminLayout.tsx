import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@sda/ui/components/sidebar";
import { RequireAdmin } from "./routeGuards";
import AppSidebar from "./Sidebar";
import TopBar from "./TopBar";

const SIDEBAR_WIDTH = { "--sidebar-width": "13.75rem" } as CSSProperties;

export default function AdminLayout() {
  return (
    <RequireAdmin>
      <SidebarProvider style={SIDEBAR_WIDTH}>
        <AppSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <TopBar />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </RequireAdmin>
  );
}
