import { Show, createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { exportAsPdf } from "@/lib/export-as-pdf";
import { exportAsZip } from "@/lib/export-as-zip";
// Contexts
import { useGithubAuth } from "@/contexts/github/GithubContext";
import { useGithubRepositories } from "@/contexts/github/useGithubRepositories";
import { AnonymousResumeProvider, useAnonymousResume } from "@/contexts/AnonymousResumeContext";
// Components
import Loading from "@/components/_layout/Loading";
import MonacoEditor from "@/components/editor/monaco-editor/MonacoEditor";
import EditorShell from "@/components/editor/EditorShell";
import Preview from "@/components/preview/Preview";
import ToolbarShell from "@/components/preview/toolbar/ToolbarShell";
import SaveOptionsButton from "@/components/preview/toolbar/SaveOptionsButton";
import IntegrateGithubModal from "@/components/onboarding/IntegrateGithubModal";

export default function AnonymousEditorPage() {
    const { user } = useGithubAuth();
    const { repositories } = useGithubRepositories();
    const navigate = useNavigate();

    createEffect(() => {
        if (!user()) return;

        const repos = repositories();
        if (repos === undefined) return; // Repositories are still loading
        if (repos.length === 1) {
            navigate(`/${repos[0].owner}/${repos[0].repo}`, { replace: true });
        } else {
            navigate("/manage", { replace: true });
        }
    });

    return (
        <Show when={user() === undefined || user() === null} fallback={<Loading>Redirecting...</Loading>}>
            {/* User is loading (undefined) or is logged out (null) */}
            <AnonymousResumeProvider>
                <AnonymousEditor />
            </AnonymousResumeProvider>
        </Show>
    );
}

function AnonymousEditor() {
    const { markdown, css, setMarkdown, setCss } = useAnonymousResume();

    const [modalOpen, setModalOpen] = createSignal(false);

    return (
        <main class="bg-system-secondary flex h-dvh w-dvw">
            <EditorShell tabs={["resume.md", "theme.css"]}>
                {(activeTab) => (
                    <MonacoEditor
                        class="size-full"
                        activeTabId={activeTab()}
                        tabs={[
                            {
                                id: "resume.md",
                                language: "markdown",
                                value: markdown(),
                                onChange: setMarkdown,
                            },
                            {
                                id: "theme.css",
                                language: "css",
                                value: css(),
                                onChange: setCss,
                            },
                        ]}
                    />
                )}
            </EditorShell>
            <div class="relative flex-1">
                <Preview markdown={markdown} css={css}>
                    {(parsedMarkdown, html) => (
                        <ToolbarShell
                            trailing={
                                <SaveOptionsButton
                                    onDownloadZip={() => exportAsZip(html(), css(), parsedMarkdown().metadata)}
                                    onExportPdf={() => exportAsPdf(html(), css(), parsedMarkdown().metadata)}
                                    onPushToGithub={() => setModalOpen(true)}
                                />
                            }
                        />
                    )}
                </Preview>
            </div>
            <IntegrateGithubModal open={modalOpen()} onOpenChange={setModalOpen} />
        </main>
    );
}
