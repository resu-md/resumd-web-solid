import styles from "./CommitButton.module.css";
import clsx from "clsx";
import { IoEye, IoEyeOff } from "solid-icons/io";
import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";

export default function CommitButton(props: {
    initialShowDiff?: boolean;
    hasChanges?: boolean;
    isCommitting?: boolean;
    diffStats: { added: number; removed: number };
    onShowDiffChange: (show: boolean) => void;
    onUndo: () => void;
    onCommit: (message?: string) => void;
}) {
    const [showDiff, setShowDiff] = createSignal(props.initialShowDiff ?? false);
    const [diffWidth, setDiffWidth] = createSignal<number | null>(null);
    const hasChanges = () => props.hasChanges ?? true;

    let diffCountRef: HTMLDivElement | undefined;

    createEffect(() => {
        setShowDiff(props.initialShowDiff ?? false);
    });

    const measureDiffWidth = () => {
        if (!diffCountRef) return;
        setDiffWidth(diffCountRef.scrollWidth);
    };

    onMount(() => {
        measureDiffWidth();

        if (typeof ResizeObserver === "undefined" || !diffCountRef) return;

        const observer = new ResizeObserver(measureDiffWidth);
        observer.observe(diffCountRef);
        onCleanup(() => observer.disconnect());
    });

    createEffect(() => {
        props.diffStats.added;
        props.diffStats.removed;
        measureDiffWidth();
    });

    const handleCommit = () => {
        if (!hasChanges() || props.isCommitting) return;

        const message = prompt("Commit message (optional):");
        if (message === null) return;

        props.onCommit(message.trim() || undefined);
    };

    const handleShowDiffToggle = () => {
        if (!hasChanges()) return;

        const next = !showDiff();
        setShowDiff(next);
        props.onShowDiffChange(next);
    };

    const handleUndo = () => {
        if (!hasChanges()) return;

        if (confirm("Are you sure you want to undo your changes? This action cannot be undone.")) {
            props.onUndo();
        }
    };

    return (
        <div class="proeminent-button flex items-center rounded-full">
            <button
                type="button"
                class="button-green -m-px flex h-8 items-center gap-2 rounded-full px-3 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCommit}
                disabled={!hasChanges() || props.isCommitting}
                title={!hasChanges() ? "Make changes to commit" : undefined}
            >
                {props.isCommitting ? "Committing..." : "Commit"}
            </button>

            <div
                class={clsx(
                    "relative flex h-7.5 items-center overflow-hidden rounded-r-full transition-[width] duration-200 ease-out motion-reduce:transition-none",
                    styles.swapArea,
                )}
                style={
                    diffWidth() == null
                        ? undefined
                        : ({
                              "--diff-width": `${diffWidth()}px`,
                          } as JSX.CSSProperties)
                }
            >
                <div
                    ref={diffCountRef}
                    class={clsx(
                        "flex h-full shrink-0 items-center pr-3.25 pl-2.25 font-mono text-sm whitespace-nowrap tabular-nums transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none",
                        styles.diffContent,
                    )}
                >
                    <span class="text-[#62BA46]">+{props.diffStats.added}</span>
                    <span class="text-red ml-0.75">-{props.diffStats.removed}</span>
                </div>

                <div
                    class={clsx(
                        "absolute inset-0 flex h-full items-center whitespace-nowrap transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none",
                        styles.actions,
                    )}
                >
                    <button
                        type="button"
                        class={clsx(
                            "hover:bg-fill-quaternary active:bg-fill-secondary text-label-secondary flex h-full items-center justify-center disabled:cursor-not-allowed disabled:opacity-60",
                            styles.actionButton,
                            styles.previewButton,
                        )}
                        title="Preview changes"
                        aria-label={showDiff() ? "Hide diff preview" : "Show diff preview"}
                        onClick={handleShowDiffToggle}
                        disabled={!hasChanges()}
                    >
                        <Show when={!showDiff()} fallback={<IoEye class="size-4" />}>
                            <IoEyeOff class="size-4" />
                        </Show>
                    </button>

                    <button
                        type="button"
                        class={clsx(
                            "hover:bg-fill-quaternary active:bg-fill-secondary text-label-secondary flex h-full items-center justify-center disabled:cursor-not-allowed disabled:opacity-60",
                            styles.actionButton,
                            styles.undoButton,
                        )}
                        title="Undo changes"
                        aria-label="Undo changes"
                        onClick={handleUndo}
                        disabled={!hasChanges()}
                    >
                        <svg
                            stroke-width="2"
                            height="1em"
                            width="1em"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            viewBox="0 0 24 24"
                            color="currentColor"
                            style="overflow: visible;"
                            class="size-4.5"
                        >
                            <path d="m9 14-4-4 4-4"></path>
                            <path d="M5 10h11a4 4 0 1 1 0 8h-1"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
