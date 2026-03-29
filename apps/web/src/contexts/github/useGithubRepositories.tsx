import { useQuery } from "@tanstack/solid-query";
import { apiFetch, apiUrl } from "@/lib/fetch";
import type { RepositoriesResponse } from "@resumd/api/types";

export function useGithubRepositories() {
    const repositoriesQuery = useQuery(() => ({
        queryKey: ["github", "repositories"] as const,
        queryFn: () => apiFetch<RepositoriesResponse>("/api/repositories"),
        retry: false,
        staleTime: 0,
    }));

    const repositories = () => {
        if (repositoriesQuery.isLoading) return undefined;
        return repositoriesQuery.data?.repositories.items;
    };

    return { repositories, refetch: repositoriesQuery.refetch };
}

export const manageRepositories = () => {
    window.location.assign(apiUrl("/api/auth/manage"));
};
