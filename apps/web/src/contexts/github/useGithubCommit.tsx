import { createSignal } from "solid-js";
import { useSelectedRepository } from "./GithubContext";
import type { SaveRepoResponse } from "@resumd/api/types";
import { apiFetch, withSearch } from "@/lib/fetch";
import { useGithubResume } from "./GithubResumeContext";

export function useCommitFiles() {
    const { selectedRepository, selectedBranch } = useSelectedRepository();
    const { markdown, css, clearDraft } = useGithubResume();

    const [isCommitting, setIsCommitting] = createSignal(false);

    const commit = async (message?: string) => {
        const repository = selectedRepository();
        const branch = selectedBranch.information();
        if (!repository || !branch || isCommitting()) return;

        setIsCommitting(true);
        try {
            await apiFetch<SaveRepoResponse>(
                withSearch("/api/save", { owner: repository.owner, repo: repository.repo }),
                {
                    method: "POST",
                    body: JSON.stringify({
                        targetBranch: branch.name,
                        expectedHeadSha: selectedBranch.files.commitSha() ?? branch.commitSha,
                        message,
                        files: {
                            markdown: markdown(),
                            css: css(),
                            markdownPath: selectedBranch.files.markdown()?.path ?? "resume.md",
                            cssPath: selectedBranch.files.css()?.path ?? "resume.css",
                        },
                    }),
                },
            );

            await selectedBranch.files.refetch();

            if (
                selectedBranch.files.markdown()?.content === markdown() &&
                selectedBranch.files.css()?.content === css()
            ) {
                clearDraft();
            }
        } finally {
            setIsCommitting(false);
        }
    };

    return { commit, isCommitting };
}
