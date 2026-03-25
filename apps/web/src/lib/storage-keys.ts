export const ANONYMOUS_WORKSPACE_STORAGE_KEYS = {
    MARKDOWN: "resumd.v1.anonymous_workspace.resume.md",
    CSS: "resumd.v1.anonymous_workspace.resume.css",
};

export const QUERY_CACHE_STORAGE_KEYS = {
    TANSTACK_QUERY: "resumd.v1.tanstack_query.cache",
};

export const GITHUB_WORKSPACE_STORAGE_KEYS = {
    // MARKDOWN: (repoFullName: string, branchName: string) =>
    //     `resumd.github_workspace.${repoFullName}_${branchName}.resume.md`,
    // CSS: (repoFullName: string, branchName: string) =>
    //     `resumd.github_workspace.${repoFullName}_${branchName}.resume.css`,
    WORKSPACE: (repoFullName: string, branchName: string) =>
        `resumd.v1.github_workspace.resume.${repoFullName}_${branchName}`,
};

export const SESSION_STORAGE_LOGIN_GUARD_KEY = (path: string) => `resumd.login_guard.${path}`;
