import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logoutAdmin } from "../../shared/api/adminSession";

/** Ends the admin session, drops all cached server data and opens the login route. */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async () => {
    await logoutAdmin(import.meta.env.VITE_API_BASE);
    queryClient.clear();
    void navigate("/admin-login");
  };
}
