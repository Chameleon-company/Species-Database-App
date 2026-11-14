import { queryOptions, useQuery } from "@tanstack/react-query";
import { requestJson, rootUrl } from "../../shared/api/apiClient";

export type Overview = {
  total_users: number;
  active_users: number;
  total_logins: number;
  average_session_duration: number;
  total_species: number;
  species_with_media: number;
};

export type UserActivity = {
  user_id: number;
  name: string;
  role: string;
  is_active: boolean;
  login_count: number | null;
  total_duration: number | null;
  average_duration: number | null;
  last_login: string | null;
};

const overviewQuery = queryOptions({
  queryKey: ["analytics", "overview"],
  queryFn: () => requestJson<Overview>(rootUrl("/analytics/overview")),
});

const userActivityQuery = queryOptions({
  queryKey: ["analytics", "users"],
  queryFn: async () => {
    const data = await requestJson<UserActivity[]>(rootUrl("/analytics/users"));
    return Array.isArray(data) ? data : [];
  },
});

export const useOverview = () => useQuery(overviewQuery);
export const useUserActivity = () => useQuery(userActivityQuery);
