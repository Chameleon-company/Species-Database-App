import { QueryClient } from "@tanstack/react-query";
import { SessionEndedError } from "../shared/api/adminFetch";
import { ApiError } from "../shared/api/apiClient";

const isClientError = (error: unknown) =>
  error instanceof SessionEndedError || (error instanceof ApiError && error.status >= 400 && error.status < 500);

/**
 * Queries stay fresh for 30 s, never refetch on window focus, and retry once
 * unless the API answered with a 4xx status. Mutations never retry.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
    },
  },
});
