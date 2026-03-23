import clsx from "clsx";
import { For, Show } from "solid-js";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { FiChevronDown, FiExternalLink, FiGitBranch, FiRefreshCw } from "solid-icons/fi";
import { useSelectedRepository } from "@/contexts/github/GithubContext";

// TODO: "duplicate" and "navigate to" buttons with tooltips

export default function GithubBranchDropdown() {
    const { selectedRepository, branches, selectedBranch, setSelectedBranch } = useSelectedRepository();

    return (
        <Show when={selectedRepository() !== null}>
            <DropdownMenu placement="bottom-start" gutter={8}>
                <DropdownMenu.Trigger class="proeminent-button text-primary flex h-8 items-center gap-2 rounded-full text-sm">
                    <span class="ml-3 flex items-center">
                        <FiGitBranch class="text-label-secondary mr-1.25" />
                        <Show
                            when={branches.items()}
                            fallback={<span class="text-label-tertiary">Select a branch</span>}
                        >
                            <span class="font-mono">{selectedBranch.information()?.name}</span>
                        </Show>
                    </span>
                    <FiChevronDown class="text-label-tertiary mr-2 size-5 translate-y-px" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content class="bg-system-primary/95 proeminent-button flex max-h-[70vh] flex-col rounded-[13px] py-1 text-sm backdrop-blur-lg outline-none">
                        <div class="mx-1 flex items-center justify-between gap-0.5 px-2.5 pt-1.25 pb-1.25">
                            <span class="text-label-tertiary mr-2 text-xs font-semibold">
                                <a href={selectedRepository()!.url} target="_blank" rel="noopener noreferrer">
                                    {selectedRepository()!.owner}/{selectedRepository()!.repo}
                                </a>
                                's branches
                            </span>
                            <WithTooltip
                                as="button"
                                tooltip="Refresh"
                                class="text-label-tertiary hit-area-x-3 hit-area-y-2 hover:text-label-secondary inline-flex items-center justify-center rounded-full transition-colors"
                                aria-label="Reload branches"
                                onClick={() => void branches.refetch()}
                                disabled={branches.loading()}
                            >
                                <FiRefreshCw
                                    class={clsx(
                                        "size-2.75 transition-transform duration-300",
                                        branches.loading() && "animate-spin",
                                    )}
                                />
                            </WithTooltip>
                        </div>
                        <div class="flex flex-col overflow-y-auto">
                            <For
                                each={branches.items()}
                                fallback={
                                    <span class="text-label-tertiary mx-1 flex items-center justify-between px-2.5 pt-0.75 pr-6 pb-0.5 outline-none">
                                        No branches detected
                                    </span>
                                }
                            >
                                {(branch) => (
                                    <DropdownMenu.Item
                                        class={clsx(
                                            "group mx-1 flex cursor-pointer items-center justify-between gap-1.5 rounded-[10px] px-2.5 py-0.75 pr-2.25 outline-none",
                                            selectedBranch.information()?.name === branch.name
                                                ? "bg-linear-to-b from-[#4da3ff] to-[#007aff] text-white shadow-[inset_0_0_1px_1px_#ffffff33,0_2px_20px_#0000000a]"
                                                : "data-highlighted:bg-fill-tertiary",
                                        )}
                                        onSelect={() => setSelectedBranch(branch)}
                                    >
                                        <span class="font-mono">{branch.name}</span>
                                        <div class="flex gap-1.75">
                                            {/* <WithTooltip
                                                tooltip="Branch out"
                                                class="hit-area-1 opacity-0 group-data-highlighted:opacity-30 hover:opacity-100"
                                            >
                                                <svg
                                                    stroke-width="0"
                                                    height="1em"
                                                    width="1em"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    color="currentColor"
                                                    class="size-3.5 rotate-90"
                                                >
                                                    <path d="m14 4 2.29 2.29-2.88 2.88 1.42 1.42 2.88-2.88L20 10V4zm-4 0H4v6l2.29-2.29 4.71 4.7V20h2v-8.41l-5.29-5.3z"></path>
                                                </svg>
                                            </WithTooltip> */}
                                            <WithTooltip
                                                as="a"
                                                tooltip="Open on Github"
                                                class={clsx(
                                                    "hit-area-1.5 hit-area-t-1.75 opacity-0 transition-colors group-data-highlighted:opacity-100",
                                                    selectedBranch.information()?.name === branch.name
                                                        ? "text-white/50 hover:text-white"
                                                        : "text-label-tertiary hover:text-label-primary",
                                                )}
                                                href={`${selectedRepository()!.url}/tree/${branch.name}`}
                                                target="_blank"
                                            >
                                                <FiExternalLink class="size-3.25" />
                                            </WithTooltip>
                                        </div>
                                    </DropdownMenu.Item>
                                )}
                            </For>
                        </div>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu>
        </Show>
    );
}

import { Tooltip } from "@kobalte/core/tooltip";
import { type JSX, createSignal, splitProps } from "solid-js";

type WithTooltipBaseProps<TAs extends keyof JSX.IntrinsicElements> = {
    children?: JSX.Element;
    tooltip: string;
    class: string;
    as?: TAs;
};

type WithTooltipProps<TAs extends keyof JSX.IntrinsicElements> = WithTooltipBaseProps<TAs> &
    Omit<JSX.IntrinsicElements[TAs], keyof WithTooltipBaseProps<TAs>>;

function WithTooltip<TAs extends keyof JSX.IntrinsicElements>(props: WithTooltipProps<TAs>) {
    const [local, rest] = splitProps(props, ["children", "tooltip", "class", "as"]);
    const [open, setOpen] = createSignal(false);

    return (
        <Tooltip openDelay={0} closeDelay={0} open={open()} onOpenChange={setOpen} gutter={7} placement="bottom">
            <Tooltip.Trigger
                as={local.as}
                onPointerEnter={() => setOpen(true)}
                onPointerLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                class={local.class}
                {...rest}
            >
                {local.children}
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content class="shadow-tertiary rounded-lg">
                    <div class="proeminent-button text-label-primary rounded-lg px-1.5 py-1 text-xs">
                        {local.tooltip}
                    </div>
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip>
    );
}
