import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearAdminSession, hasAdminSession } from "../utils/adminSession";

/** Require a stored admin token; otherwise send the user to login. */
export default function ProtectedAdmin({ children }: { children: ReactNode }) {
  if (!hasAdminSession()) {
    clearAdminSession();
    return <Navigate to="/admin-login" replace />;
  }
  return <>{children}</>;
}

/** For routes like login: if already authenticated, skip the screen. */
export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  if (hasAdminSession()) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
