import { createContext, createEffect, createMemo, useContext, type Accessor, type JSXElement } from "solid-js";
import type {
    BootstrapResponse,
    BranchInformation,
    EditorFiles,
    FilesResponse,
    GithubUser,
    RepositoryInformation,
} from "@resumd/api/types";
import { useQuery } from "@tanstack/solid-query";
import { apiFetch, apiUrl, withSearch } from "@/lib/fetch";
import { useNavigate, useParams } from "@solidjs/router";
import queryClient, { clearPersistedQueryClient } from "@/lib/query-client";

type FileInformation = {
    workspaceKey: string;
    files: EditorFiles;
    commitSha: string | undefined;
};

const GithubAuthContext = createContext<{
    /**
     * undefined: no cached user, fetching from remote
     * null: no user (not logged in)
     * GithubUser: logged in user
     */
    user: Accessor<GithubUser | null | undefined>;
    login: (returnTo?: string) => void;
    logout: () => Promise<void>;
}>();

const SelectedRepositoryContext = createContext<{
    selectedRepository: Accessor<RepositoryInformation | null | undefined>;
    // setSelectedRepository: (repository: RepositoryInformation) => void;
    branches: {
        items: Accessor<BranchInformation[] | null | undefined>;
        loading: Accessor<boolean>;
        refetch: () => void;
    };
    selectedBranch: {
        information: Accessor<BranchInformation | null>;
        files: {
            markdown: Accessor<EditorFiles["markdown"] | null | undefined>;
            css: Accessor<EditorFiles["css"] | null | undefined>;
            commitSha: Accessor<string | undefined>;
            loading: Accessor<boolean>;
            refetch: () => void;
        };
    };
    setSelectedBranch: (branch: BranchInformation) => void;
}>();

// TODO: error handling of queryfns
// TODO: handle selectedRepository becoming null

export function GithubProvider(props: { children?: JSXElement }) {
    const params = useParams<{ owner: string; repo: string; branch?: string }>();
    const navigate = useNavigate();

    /**
     * Route handling
     */

    const routeRepository = createMemo(() => {
        const owner = normalizeRouteParams(params.owner);
        const repo = normalizeRouteParams(params.repo);
        if (!owner || !repo) return null;
        return { owner, repo };
    });

    const routeBranchName = createMemo(() => {
        if (params.branch === undefined) return undefined;
        const rawPath = params.branch.startsWith("/") ? params.branch.slice(1) : params.branch;
        if (!rawPath) return "";
        return decodeBranchPath(rawPath);
    });

    /**
     * useGithubAuth
     */

    const bootstrapQuery = useQuery(() => {
        const repo = routeRepository();
        return {
            queryKey: repo
                ? (["github", "bootstrap", repo.owner, repo.repo] as const)
                : (["github", "bootstrap", null, null] as const),
            queryFn: () =>
                apiFetch<BootstrapResponse>(withSearch("/api/bootstrap", { owner: repo?.owner, repo: repo?.repo })),
            retry: false,
            // retry: false,

            // Best UX for persisted auth/session bootstrap:
            // staleTime: Infinity,
            // refetchOnMount: false,
            // refetchOnReconnect: false,
            // refetchOnWindowFocus: false,
        };
    });

    const user = createMemo(() => {
        if (bootstrapQuery.isPending) return undefined;
        return bootstrapQuery.data?.user ?? null;
    });

    createEffect(() => {
        console.log("user():", user());
    });

    const logout = async () => {
        await queryClient.cancelQueries();
        try {
            await apiFetch("/api/auth/logout", { method: "POST" });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            await clearPersistedQueryClient();
        }
    };

    const login = (returnTo?: string) => {
        const query = new URLSearchParams();
        if (returnTo) query.set("returnTo", returnTo);
        const loginUrl = query.size > 0 ? `/api/auth/start?${query.toString()}` : "/api/auth/start";
        window.location.assign(apiUrl(loginUrl));
    };

    /**
     * useSelectedRepository
     */

    // Selected repository information

    const selectedRepositoryInformation = createMemo(() => {
        if (bootstrapQuery.isPending) return undefined;
        return bootstrapQuery.data?.selected?.repository ?? null;
    });

    // Selected repository's branches

    const selectedRepositoryBranches = createMemo(() => {
        if (bootstrapQuery.isPending) return undefined;
        return bootstrapQuery.data?.selected?.branches.items ?? null;
    });

    const isBranchesLoading = createMemo(() => bootstrapQuery.isFetching || bootstrapQuery.isPending);

    const refetchBranches = async () => await bootstrapQuery.refetch(); // TODO: what is the consequence of this if selectedRepository changes, current branch gets renamed, etc?

    // Selected branch

    // Derived value from the route, matches it when is present, fallback branch otherwise
    const selectedBranch = createMemo(() => {
        const branchList = selectedRepositoryBranches() ?? [];
        if (!branchList.length) return null;

        const branchFromRoute = routeBranchName();
        if (branchFromRoute) {
            const found = branchList.find((branch) => branch.name === branchFromRoute);
            if (found) return found;
        }

        return getFallbackBranch(branchList);
    });

    // To update selected branch, we update the URL's /tree/<branch> path, and the selectedBranch memo will react to it
    const setSelectedBranch = (branch: BranchInformation) => {
        const repo = routeRepository();
        if (!repo) return;
        const encodedBranch = encodeBranchPath(branch.name);
        navigate(`/${repo.owner}/${repo.repo}/tree/${encodedBranch}`);
    };

    // When /tree/<branch> is invalid or missing, normalize to the default branch
    createEffect(() => {
        const branchList = selectedRepositoryBranches();
        if (!branchList?.length) return;

        const fallbackBranch = getFallbackBranch(branchList);
        if (!fallbackBranch) return;

        if (params.branch === undefined) return;

        const branchFromRoute = routeBranchName();
        if (!branchFromRoute || !branchList.some((b) => b.name === branchFromRoute)) {
            const repo = routeRepository();
            if (!repo) return;

            const encodedFallback = encodeBranchPath(fallbackBranch.name);
            navigate(`/${repo.owner}/${repo.repo}/tree/${encodedFallback}`, { replace: true });
        }
    });

    // Selected branch's files

    // Object if selected repository and branch are resolved, null if not resolved yet
    const currentWorkspace = createMemo(() => {
        const repo = selectedRepositoryInformation();
        const branchName = selectedBranch()?.name;
        if (!repo || !branchName) return null;

        return {
            key: ["files", repo.owner, repo.repo, branchName] as const,
            workspaceKey: `${repo.owner}/${repo.repo}:${branchName}`,
            repo,
            branchName,
        };
    });

    const filesQuery = useQuery(() => {
        const workspace = currentWorkspace();

        return {
            queryKey: workspace?.key ?? (["files", null, null, null] as const),
            enabled: !!workspace, // Only run query if workspace is resolved (when repository and branch are selected)
            queryFn: async () => {
                if (!workspace) throw new Error("Repository or branch not resolved"); // TODO: Necessary?

                return apiFetch<FilesResponse>(
                    withSearch("/api/files", {
                        owner: workspace.repo.owner,
                        repo: workspace.repo.repo,
                        branch: workspace.branchName,
                    }),
                );
            },
            staleTime: 60_000,
        };
    });

    // Files will stay its old value until the new value is resolved, to prevent flashing "no files" state
    const files = createMemo<FileInformation | null | undefined>((previous) => {
        const workspace = currentWorkspace();
        if (!workspace) return null; // No workspace, no files

        const data = filesQuery.data;

        if (data)
            return {
                workspaceKey: workspace.workspaceKey,
                files: data.files, // TODO: Maybe files response could only include EditorFiles
                commitSha: data.branch.commitSha,
            }; // New data, return it

        return previous; // Still loading, keep previous files
    });
    const css = createMemo(() => files()?.files.css);
    const markdown = createMemo(() => files()?.files.markdown);
    const commitSha = createMemo(() => files()?.commitSha);

    const isFilesLoading = createMemo(() => {
        const workspace = currentWorkspace();
        if (!workspace) {
            if (selectedRepositoryInformation() === undefined || selectedRepositoryBranches() === undefined)
                return true;
            return false;
        }
        return files()?.workspaceKey !== workspace.workspaceKey || filesQuery.isPending; // TODO: isFetching?
    });

    const refetchFiles = async () => await filesQuery.refetch();

    return (
        <GithubAuthContext.Provider
            value={{
                user,
                login,
                logout,
            }}
        >
            <SelectedRepositoryContext.Provider
                value={{
                    selectedRepository: selectedRepositoryInformation,
                    branches: {
                        items: selectedRepositoryBranches,
                        loading: isBranchesLoading,
                        refetch: refetchBranches,
                    },
                    selectedBranch: {
                        information: selectedBranch,
                        files: {
                            css: css,
                            markdown: markdown,
                            commitSha: commitSha,
                            loading: isFilesLoading,
                            refetch: refetchFiles,
                        },
                    },
                    setSelectedBranch,
                }}
            >
                {props.children}
            </SelectedRepositoryContext.Provider>
        </GithubAuthContext.Provider>
    );
}

const normalizeRouteParams = (value: string | undefined) => {
    const normalized = value?.trim();
    return normalized ? normalized : undefined;
};

const decodeBranchPath = (value: string) =>
    value
        .split("/")
        .map((segment) => {
            try {
                return decodeURIComponent(segment);
            } catch {
                return segment;
            }
        })
        .join("/");

const encodeBranchPath = (value: string) =>
    value
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

const getFallbackBranch = (branchList: BranchInformation[]) => {
    return branchList.find((branch) => branch.isDefault) ?? branchList[0] ?? null;
};

export function useGithubAuth() {
    const context = useContext(GithubAuthContext);
    if (!context) throw new Error("useGithubAuth must be used within a GithubAuthProvider");
    return context;
}

export function useSelectedRepository() {
    const context = useContext(SelectedRepositoryContext);
    if (!context) throw new Error("useSelectedRepository must be used within a SelectedRepositoryProvider");
    return context;
}
