import type { ReactNode } from "react";
import ProtectedAdmin from "./routeGuards";
import DrawerComponent from "./Sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedAdmin>
      <DrawerComponent >{children}</DrawerComponent>
    </ProtectedAdmin>
  );
}
