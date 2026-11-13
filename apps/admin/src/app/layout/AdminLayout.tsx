import { useEffect, type CSSProperties } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@sda/ui/components/sidebar";
import { onSessionEnd } from "../../shared/api/adminSession";
import { RequireAdmin } from "./routeGuards";
import AppSidebar from "./Sidebar";
import TopBar from "./TopBar";

const SIDEBAR_WIDTH = { "--sidebar-width": "13.75rem" } as CSSProperties;

export default function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(
    () =>
      onSessionEnd(() => {
        queryClient.clear();
        navigate("/admin-login", { replace: true });
      }),
    [navigate, queryClient]
  );

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
