import { Show } from "solid-js";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { FiChevronDown } from "solid-icons/fi";
import { IoFolderOpenOutline, IoLogoGithub, IoLogOutOutline } from "solid-icons/io";

export default function SaveOptionsButton(props: {
    onExportPdf: () => void;
    onDownloadZip: () => void;
    onPushToGithub?: () => void;
    onManageRepositories?: () => void;
    onLogout?: () => void;
}) {
    return (
        <div class="save-options-button flex items-center gap-0.5">
            <button
                class="button-blue flex h-8 items-center justify-center rounded-[16px_3px_3px_16px] pr-2.5 pl-3 text-nowrap"
                onClick={props.onExportPdf}
            >
                Export as PDF
            </button>
            <DropdownMenu gutter={8}>
                <DropdownMenu.Trigger class="button-blue expanded-active flex h-8 items-center justify-center rounded-[3px_16px_16px_3px] pr-2 pl-1">
                    <FiChevronDown class="size-5 translate-y-px text-white" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content class="proeminent-button flex flex-col rounded-[13px] py-1 text-sm backdrop-blur-lg outline-none">
                        <Show when={props.onPushToGithub}>
                            <DropdownMenu.Item
                                class="group data-highlighted:bg-fill-tertiary mx-1 flex cursor-pointer items-center rounded-[10px] py-0.75 pr-4 pl-1.75 outline-none"
                                onSelect={props.onPushToGithub}
                            >
                                <div class="mr-1.75 ml-px flex w-4 justify-center">
                                    <IoLogoGithub class="text-label-primary size-4" />
                                </div>
                                Commit to Github
                            </DropdownMenu.Item>
                        </Show>
                        <DropdownMenu.Item
                            class="group data-highlighted:bg-fill-tertiary mx-1 flex cursor-pointer items-center rounded-[10px] py-0.75 pr-4 pl-1.75 outline-none"
                            onSelect={props.onDownloadZip}
                        >
                            <div class="mr-1.75 ml-px flex w-4 justify-center">
                                <IoFolderOpenOutline class="text-label-primary size-3.5" />
                            </div>
                            Download sources as .zip
                        </DropdownMenu.Item>
                        <Show when={props.onLogout || props.onManageRepositories}>
                            <DropdownMenu.Separator class="border-separator mx-3 my-1" />
                        </Show>
                        <Show when={props.onManageRepositories}>
                            <DropdownMenu.Item
                                class="group data-highlighted:bg-fill-tertiary mx-1 flex cursor-pointer items-center rounded-[10px] py-0.75 pr-4 pl-1.75 outline-none"
                                onSelect={props.onManageRepositories}
                            >
                                <div class="mr-1.75 ml-px flex w-4 justify-center"></div>
                                Manage repositories...
                            </DropdownMenu.Item>
                        </Show>
                        <Show when={props.onLogout}>
                            <DropdownMenu.Item
                                class="group text-red data-highlighted:bg-fill-tertiary mx-1 flex cursor-pointer items-center rounded-[10px] py-0.75 pr-4 pl-1.75 outline-none"
                                onSelect={props.onLogout}
                            >
                                <div class="mr-1.75 ml-px flex w-4 justify-center">
                                    <IoLogOutOutline class="size-4" />
                                </div>
                                Sign out
                            </DropdownMenu.Item>
                        </Show>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu>
        </div>
    );
}
