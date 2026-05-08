import { Show, createEffect, createMemo, createSignal } from "solid-js";
import { useLocation, useNavigate, useParams } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { formatDocumentTitle } from "@/lib/document-title";
import { getLineDiffStats } from "@/lib/line-diff";
import { exportAsPdf } from "@/lib/export-as-pdf";
import { exportAsZip } from "@/lib/export-as-zip";
// Contexts
import { GithubResumeProvider, useGithubResume } from "@/contexts/github/GithubResumeContext";
// Components
import Loading from "@/components/_layout/Loading";
import MonacoEditor from "@/components/editor/monaco-editor/MonacoEditor";
import EditorShell from "@/components/editor/EditorShell";
import ToolbarShell from "@/components/preview/toolbar/ToolbarShell";
import GithubBranchDropdown from "@/components/preview/toolbar/GithubBranchDropdown";
import Preview from "@/components/preview/Preview";
import MonacoDiffEditor from "@/components/editor/monaco-editor/MonacoDiffEditor";
import SaveOptionsButton from "@/components/preview/toolbar/SaveOptionsButton";
import CommitButton from "@/components/preview/toolbar/CommitButton";

import { ApiError } from "@/lib/fetch";
import { useGithubAuth, useSelectedRepository } from "@/contexts/github/GithubContext";
import { useCommitFiles } from "@/contexts/github/useGithubCommit";
import { SESSION_STORAGE_LOGIN_GUARD_KEY } from "@/lib/storage-keys";

export default function AuthenticatedEditorPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const { user, login } = useGithubAuth();
    const { selectedRepository } = useSelectedRepository();

    const [loginBlocked, setLoginBlocked] = createSignal(false);

    const returnToPath = () => `${location.pathname}${location.search}`;
    const loginGuardKey = () => SESSION_STORAGE_LOGIN_GUARD_KEY(returnToPath());

    const shouldRenderEditor = () => {
        if (!user()) return false;
        return selectedRepository() !== null;
    };
    const redirectMessage = () => {
        const currentUser = user();
        if (currentUser === undefined) return "Loading session...";
        if (currentUser === null) return "Redirecting to login...";
        if (selectedRepository() === null) return "Redirecting to manage...";
        return "Loading repository...";
    };

    createEffect(() => {
        // User is logged out, attempt a login
        if (user() === null) {
            // Guard login with session storage flag to prevent redirect loops (in case the server response fails, ...)
            const guardKey = loginGuardKey();
            const hasAttemptedLogin = window.sessionStorage.getItem(guardKey);
            if (hasAttemptedLogin) {
                setLoginBlocked(true);
                return;
            }
            window.sessionStorage.setItem(guardKey, "1");
            login(returnToPath()); // Redirect to login with return path, so user comes back to this page after successful login
        }
    });
    createEffect(() => {
        if (user()) {
            window.sessionStorage.removeItem(loginGuardKey()); // Clear login guard on successful login
            if (loginBlocked()) setLoginBlocked(false);
        }
    });
    createEffect(() => {
        if (user() && selectedRepository() === null) {
            // Logged and no repository selected, redirect to manage page
            navigate("/manage", { replace: true });
        }
    });

    return (
        <Show
            when={shouldRenderEditor()}
            fallback={
                <Show when={user() === null && loginBlocked()} fallback={<Loading>{redirectMessage()}</Loading>}>
                    <LoginError
                        onRetry={() => {
                            setLoginBlocked(false);
                            login(returnToPath());
                        }}
                    />
                </Show>
            }
        >
            <GithubResumeProvider>
                <AuthenticatedEditor />
            </GithubResumeProvider>
        </Show>
    );
}

function LoginError(props: { onRetry?: () => void }) {
    return (
        <div class="flex h-dvh w-dvw flex-col items-center justify-center p-2">
            <div class="mt-2 max-w-100">
                <div class="text-label-primary mb-2 text-lg">Ooops... 😵</div>
                <div class="text-label-secondary mb-1 text-sm">
                    The login failed. This can happen if your authentication did not succeed (or if the server is having
                    some issues). Please try logging in again.
                </div>
                <button
                    class="proeminent-button text-label-secondary mt-4 w-full rounded-full px-5 py-2 text-sm"
                    onClick={props.onRetry}
                >
                    Try logging in again
                </button>
            </div>
        </div>
    );
}

function AuthenticatedEditor() {
    const navigate = useNavigate();
    const params = useParams<{ owner: string; repo: string }>();

    const { selectedBranch } = useSelectedRepository();
    const {
        markdown: draftMarkdown,
        css: draftCss,
        setMarkdown: setDraftMarkdown,
        setCss: setDraftCss,
        clearDraft,
    } = useGithubResume();
    const { commit, isCommitting } = useCommitFiles();

    const [diffMode, setDiffMode] = createSignal(false);

    const tabTitle = () => {
        const formattedRoute = [params.owner, params.repo].filter(Boolean).join("/");
        const branch = selectedBranch.information();
        return formatDocumentTitle(branch ? `${branch.name} · ${formattedRoute}` : formattedRoute);
    };
    const remoteMarkdown = () => selectedBranch.files.markdown()?.content ?? "";
    const remoteCss = () => selectedBranch.files.css()?.content ?? "";
    const blockEditor = () => selectedBranch.files.loading() || isCommitting(); // TODO: Move logic to context?
    const hasDiff = () => {
        // if (selectedBranch.files.loading()) return false;
        return draftMarkdown() !== remoteMarkdown() || draftCss() !== remoteCss();
    };
    const diffStats = createMemo(() => {
        if (!hasDiff()) return { added: 0, removed: 0 };

        const markdownDiff = getLineDiffStats(remoteMarkdown(), draftMarkdown());
        const cssDiff = getLineDiffStats(remoteCss(), draftCss());

        return {
            added: markdownDiff.added + cssDiff.added,
            removed: markdownDiff.removed + cssDiff.removed,
        };
    });

    const handleUndo = () => {
        if (blockEditor()) return;
        clearDraft();
        setDiffMode(false);
    };

    const handleMarkdownChange = (value: string) => {
        if (blockEditor()) return;
        setDraftMarkdown(value);
    };

    const handleCssChange = (value: string) => {
        if (blockEditor()) return;
        setDraftCss(value);
    };

    const handleCommit = async (message?: string) => {
        if (blockEditor() || !hasDiff()) return;

        try {
            await commit(message);
            setDiffMode(false);
        } catch (error) {
            alert(error instanceof ApiError ? error.message : "Failed to commit changes");
        }
    };

    const handleLogout = () => {
        if (
            confirm(
                "Sign out?\nYour changes will be kept saved in this browser and will be available when you log back in.",
            )
        )
            navigate("/logout");
    };

    createEffect(() => {
        if (!hasDiff() && diffMode()) {
            setDiffMode(false);
        }
    });

    return (
        <>
            <Title>{tabTitle()}</Title>
            <main class="bg-system-secondary flex h-dvh w-dvw">
                <EditorShell tabs={["resume.md", "theme.css"]}>
                    {(activeTab) =>
                        !diffMode() ? (
                            <MonacoEditor
                                class="size-full"
                                activeTabId={activeTab()}
                                readOnly={blockEditor()}
                                tabs={[
                                    {
                                        id: "resume.md",
                                        language: "markdown",
                                        value: draftMarkdown(),
                                        onChange: handleMarkdownChange,
                                    },
                                    {
                                        id: "theme.css",
                                        language: "css",
                                        value: draftCss(),
                                        onChange: handleCssChange,
                                    },
                                ]}
                            />
                        ) : (
                            <MonacoDiffEditor
                                class="size-full"
                                activeTabId={activeTab()}
                                tabs={[
                                    {
                                        id: "resume.md",
                                        language: "markdown",
                                        originalValue: remoteMarkdown(),
                                        modifiedValue: draftMarkdown(),
                                    },
                                    {
                                        id: "theme.css",
                                        language: "css",
                                        originalValue: remoteCss(),
                                        modifiedValue: draftCss(),
                                    },
                                ]}
                            />
                        )
                    }
                </EditorShell>
                <div class="relative flex-1">
                    <Preview markdown={draftMarkdown} css={draftCss}>
                        {(parsedMarkdown, html) => (
                            <ToolbarShell
                                leading={
                                    <>
                                        <GithubBranchDropdown />
                                        {/* TODO: Implement proper loading state handling */}
                                        <Show when={!blockEditor() && hasDiff()}>
                                            <CommitButton
                                                initialShowDiff={diffMode()}
                                                isCommitting={isCommitting()}
                                                diffStats={diffStats()}
                                                onShowDiffChange={(show) => setDiffMode(show && hasDiff())}
                                                onUndo={handleUndo}
                                                onCommit={(message) => {
                                                    void handleCommit(message);
                                                }}
                                            />
                                        </Show>
                                    </>
                                }
                                trailing={
                                    <SaveOptionsButton
                                        onDownloadZip={() => exportAsZip(draftMarkdown(), draftCss())}
                                        onExportPdf={() =>
                                            exportAsPdf(html(), draftCss(), {
                                                title: parsedMarkdown().metadata.title,
                                            })
                                        }
                                        onManageRepositories={() => navigate("/manage")}
                                        onLogout={handleLogout}
                                    />
                                }
                            />
                        )}
                    </Preview>
                </div>
            </main>
        </>
    );
}
