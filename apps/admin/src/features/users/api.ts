import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl, requestJson } from "../../shared/api/apiClient";

export type AuthProvider = "local" | "google";

export type User = {
  user_id: number;
  name: string;
  role: string;
  is_active: boolean;
  auth_provider: AuthProvider;
  created_at?: string;
};

export type UserInput = {
  name: string;
  role: string;
  is_active: boolean;
  auth_provider: AuthProvider;
  password: string;
};

const usersKey = ["users"] as const;

const usersQuery = queryOptions({
  queryKey: usersKey,
  queryFn: () => requestJson<User[]>(apiUrl("/users")),
});

export const useUsers = () => useQuery(usersQuery);

/** Request body: trimmed name and role; the password only for local users that set one. */
function toPayload({ name, role, is_active, auth_provider, password }: UserInput) {
  return {
    name: name.trim(),
    role: role.trim(),
    is_active,
    auth_provider,
    ...(auth_provider === "local" && password.trim() ? { password } : {}),
  };
}

function useUserMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }),
  });
}

export const useSaveUser = () =>
  useUserMutation(({ userId, input }: { userId: number | null; input: UserInput }) =>
    requestJson(apiUrl(userId === null ? "/users" : `/users/${userId}`), {
      method: userId === null ? "POST" : "PUT",
      json: toPayload(input),
    })
  );

export const useDeleteUser = () =>
  useUserMutation((userId: number) => requestJson(apiUrl(`/users/${userId}`), { method: "DELETE" }));
