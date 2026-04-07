import styles from "./IntegrateGithubModal.module.css";
import { Dialog } from "@kobalte/core/dialog";
import { IoArrowUpRightBoxOutline, IoCaretDown } from "solid-icons/io";
import clsx from "clsx";
import cloneRepositoryVideo from "./assets/clone-repository-video.mov";
import { createSignal, Match, Switch } from "solid-js";

const TEMPLATE_URL = "https://github.com/resumemarkdown/template-jakes-resume";

export default function GithubIntegrationInstructionsModal() {
    const [step, setStep] = createSignal(1);

    return (
        <Dialog open={true}>
            <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <Dialog.Content class="proeminent-button relative h-130 w-160 overflow-hidden rounded-3xl shadow-xl outline-none">
                        {/* <Dialog.CloseButton class="button-red absolute top-3 right-3 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full opacity-50">
                            <FiX class="size-3.25" />
                        </Dialog.CloseButton> */}

                        <div class={clsx("absolute inset-0 z-0 size-full px-6 pt-6", styles.modalDiagramContainer)}>
                            {/* <AnimatedGuide /> */}
                            <VideoGuide />
                        </div>

                        {/* <div class="relative z-10 flex size-full w-full flex-col justify-end">
                            <div class="w-full px-5">
                                <p class="text-center font-light text-balance">
                                    Clone{" "}
                                    <a href={TEMPLATE_URL} target="_blank" class="text-blue-600/80 hover:underline">
                                        this
                                        <IoArrowUpRightBoxOutline class="ml-0.5 inline size-3 -translate-y-px" />
                                    </a>{" "}
                                    repository to your GitHub profile
                                    <span class="text-label-tertiary font-normal">&nbsp;{">"}</span>
                                    <br />
                                    Give it a name<span class="text-label-tertiary font-normal">&nbsp;{">"}</span> Make
                                    it private <i>(optional)</i>
                                </p>
                            </div>
                            <div class="mt-3.5 flex w-full justify-center gap-4 px-5 pb-7">
                                <button
                                    class="button-blue flex h-9 cursor-pointer items-center rounded-full px-3.5 italic"
                                    onClick={() => setStep(2)}
                                >
                                    Done, next step
                                </button>
                            </div>
                        </div> */}

                        <div class="relative z-10 flex size-full w-full flex-col justify-end">
                            <div class="w-full px-5">
                                <p class="text-center text-xl text-balance">Clone the template repository</p>
                                <p class="text-label-secondary mt-px text-center font-light text-balance">
                                    Give it a name. Make it <i>(optional&nbsp;but&nbsp;recommended)</i> a private
                                    repository on your GitHub account.
                                </p>
                            </div>
                            <div class="mt-3 flex w-full items-center justify-between gap-4 px-4 pb-4">
                                <div class="flex-[1_1_0%]">
                                    <Dialog.CloseButton class="text-label-secondary hover:text-label-primary/70 h-9 cursor-pointer px-3.5">
                                        Cancel
                                    </Dialog.CloseButton>
                                </div>

                                {/* <div class="mx-auto flex gap-1.5 px-3">
                                    <div class="bg-label-secondary/50 h-1.75 w-5 rounded-full" />
                                    <div class="bg-label-tertiary/70 size-1.75 rounded-full" />
                                </div> */}

                                <div class="flex flex-[1_1_0%] justify-end">
                                    <button
                                        class="button-blue flex h-9 cursor-pointer items-center rounded-full pr-3 pl-3.5 font-normal"
                                        onClick={() => window.open(TEMPLATE_URL, "_blank")}
                                    >
                                        Clone template <IoArrowUpRightBoxOutline class="ml-1.5 inline size-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* <div class="relative z-10 flex size-full w-full flex-col justify-end">
                            <div class="mt-3 flex w-full items-end justify-between gap-5 px-5 pb-5">
                                <p class="pb-1 pl-1.5 text-xl text-balance">
                                    <Switch>
                                        <Match when={step() === 1}>Clone the template repository</Match>
                                        <Match when={step() === 2}>Give it a name</Match>
                                        <Match when={step() === 3}>
                                            Make it private{" "}
                                            <i class="text-label-secondary font-light">(optional, recommended)</i>
                                        </Match>
                                        <Match when={step() === 4}>
                                            Replace <i class="font-light">github</i>.com with{" "}
                                            <i class="font-light">resumemarkdown</i>.com
                                            <br />
                                            in the cloned resume repository URL
                                        </Match>
                                        <Match when={step() === 5}>
                                            Authorize ResumeMarkdown to access{" "}
                                            <i class="text-label-secondary font-light">(only that)</i> repository.
                                        </Match>
                                    </Switch>
                                </p>

                                <button
                                    class="button-blue flex h-9 cursor-pointer items-center rounded-full pr-3 pl-3.5 font-normal"
                                    onClick={() => setStep((prev) => Math.min(prev + 1, 5))}
                                >
                                    Next{" "}
                                    <span class="text-gray-5 ml-2 text-sm font-light tabular-nums">{step()}/5</span>
                                </button>
                            </div>
                        </div> */}
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}

function AnimatedGuide() {
    return (
        <div class="border-gray-4 mx-auto flex aspect-16/10 max-h-[80%] flex-1 items-center rounded-xl border p-1.5">
            <div class={clsx("border-gray-4 flex size-full flex-col rounded-md border", styles.screenInside)}>
                <div class="border-gray-4 mx-4 box-border flex justify-between border-b px-2 py-2 opacity-90">
                    <div class="flex origin-left scale-[0.8] items-center text-xl">
                        <svg
                            aria-hidden="true"
                            height="16"
                            viewBox="0 0 16 16"
                            version="1.1"
                            width="16"
                            data-view-component="true"
                            class="mr-2 translate-y-[2px] opacity-60"
                        >
                            <path d="M13.25 8a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-.75a.75.75 0 0 1 0-1.5h.75v-.25a.75.75 0 0 1 .75-.75ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2ZM2.75 8a.75.75 0 0 1 .75.75v.268c.083-.012.166-.018.25-.018h.5a.75.75 0 0 1 0 1.5h-.5a.25.25 0 0 0-.25.25v.75c0 .28.114.532.3.714a.75.75 0 1 1-1.05 1.072A2.495 2.495 0 0 1 2 11.5V8.75A.75.75 0 0 1 2.75 8ZM11 .75a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V1.5h-.75A.75.75 0 0 1 11 .75Zm-5 0A.75.75 0 0 1 6.75 0h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 .75Zm0 9A.75.75 0 0 1 6.75 9h2.5a.75.75 0 0 1 0 1.5h-2.5A.75.75 0 0 1 6 9.75ZM4.992.662a.75.75 0 0 1-.636.848c-.436.063-.783.41-.846.846a.751.751 0 0 1-1.485-.212A2.501 2.501 0 0 1 4.144.025a.75.75 0 0 1 .848.637ZM2.75 4a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 2.75 4Zm10.5 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z"></path>
                        </svg>
                        <a
                            class="cursor-pointer text-[#0969da] underline-offset-2 select-none dark:text-[#4493f8]"
                            href={TEMPLATE_URL}
                            target="_blank"
                        >
                            <span class="hover:underline">resumemarkdown</span>
                            <span class="text-label-secondary mx-1">/</span>
                            <span class="font-semibold hover:underline">template</span>
                        </a>
                    </div>
                    <div class="origin-right scale-[0.8] rounded-md border border-[#1F232826] bg-[#1F883D] py-0.75 pr-1.75 pl-3 text-nowrap text-white dark:border-[#ffffff26] dark:bg-[#238636]">
                        Use this template
                        <IoCaretDown class="ml-1.5 inline size-3 opacity-70" />
                    </div>
                </div>
                {/* <div class="bg-border-gray-4 h-px w-full"></div> */}
            </div>
        </div>
    );
}

function VideoGuide() {
    return (
        <div class="ring-gray-4 bg-gray-6 shadow-proeminent rounded-xl p-2 ring">
            <video class="ring-gray-4 rounded-md ring" src={cloneRepositoryVideo} autoplay loop muted playsinline />
        </div>
    );
}
