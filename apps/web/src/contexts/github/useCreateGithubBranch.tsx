import type { BranchOutResponse } from "@resumd/api/types";
import { createSignal } from "solid-js";
import { useSelectedRepository } from "./GithubContext";
import { ApiError, apiFetch, withSearch } from "@/lib/fetch";
import { GITHUB_WORKSPACE_STORAGE_KEYS } from "@/lib/storage-keys";

export function useCreateGithubBranch() {
    const { selectedRepository, branches, setSelectedBranch } = useSelectedRepository();

    const [isCreatingBranch, setIsCreatingBranch] = createSignal(false);

    const copyDrafts = (repoFullName: string, baseBranch: string, targetBranch: string) => {
        if (typeof window === "undefined") return;

        const baseKey = GITHUB_WORKSPACE_STORAGE_KEYS.WORKSPACE(repoFullName, baseBranch);
        const targetKey = GITHUB_WORKSPACE_STORAGE_KEYS.WORKSPACE(repoFullName, targetBranch);

        try {
            const stored = window.localStorage.getItem(baseKey);
            if (stored != null) {
                window.localStorage.setItem(targetKey, stored);
            } else {
                window.localStorage.removeItem(targetKey);
            }
        } catch {
            // Ignore localStorage failures; drafts are best-effort.
        }
    };

    const createBranch = async (baseBranch: string, targetBranch: string) => {
        if (isCreatingBranch()) return;

        const repository = selectedRepository();
        if (!repository) return;

        setIsCreatingBranch(true);
        try {
            await apiFetch<BranchOutResponse>(
                withSearch("/api/branch", { owner: repository.owner, repo: repository.repo }),
                {
                    method: "POST",
                    body: JSON.stringify({
                        targetBranch,
                        baseBranch,
                    }),
                },
            );

            copyDrafts(repository.fullName, baseBranch, targetBranch);
            await branches.refetch();

            const updatedBranches = branches.items() ?? [];
            const created = updatedBranches.find((branch) => branch.name === targetBranch);
            if (created) {
                setSelectedBranch(created);
            } else {
                alert("Branch created, but failed to load it. Please refresh and select it manually.");
            }
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "Failed to create branch");
        } finally {
            setIsCreatingBranch(false);
        }
    };

    return {
        createBranch,
        isCreatingBranch,
    };
}
