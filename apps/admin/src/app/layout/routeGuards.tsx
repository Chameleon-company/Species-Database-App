import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearAdminSession, hasAdminSession } from "../../shared/api/adminSession";

export function RequireAdmin({ children }: { children: ReactNode }) {
  if (!hasAdminSession()) {
    clearAdminSession();
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  if (hasAdminSession()) return <Navigate to="/" replace />;
  return children;
}
