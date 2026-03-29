import type { ReactNode } from "react";
import ProtectedAdmin from "./ProtectedAdmin";
import DrawerComponent from "./DrawerComponent";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedAdmin>
      <DrawerComponent >{children}</DrawerComponent>
    </ProtectedAdmin>
  );
}
