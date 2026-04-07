import { createSignal, Match, Switch } from "solid-js";
import styles from "./IntegrateGithubModal.module.css";
import clsx from "clsx";
import { Dialog } from "@kobalte/core/dialog";
import cloneRepositoryVideo from "./assets/clone-repository-video.mov";

const TEMPLATE_URL = "https://github.com/resumemarkdown/template-jakes-resume";

export default function GithubIntegrationInstructionsModal() {
    const [step, setStep] = createSignal(1);

    return (
        <Dialog open={true}>
            <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <Dialog.Content class="proeminent-button relative flex h-fit w-160 flex-col overflow-hidden rounded-3xl shadow-xl outline-none">
                        <div class={clsx("z-0 px-6 pt-6", styles.modalDiagramContainer)}>
                            <VideoGuide />
                        </div>

                        <div class={clsx("z-10 flex w-full items-end justify-between gap-5 px-5 pt-5 pb-5")}>
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
                                        Authorize ResumeMarkdown to access that repository{" "}
                                        <i class="text-label-secondary font-light">
                                            (choose "Only selected repositories")
                                        </i>
                                    </Match>
                                </Switch>
                            </p>

                            <button
                                class="button-blue flex h-9 cursor-pointer items-center rounded-full pr-3 pl-3.5 font-normal"
                                onClick={() => setStep((prev) => Math.min(prev + 1, 5))}
                            >
                                <Switch>
                                    <Match when={step() < 5}>
                                        Next{" "}
                                        <span class="text-gray-5 ml-2 text-sm font-light tabular-nums">{step()}/5</span>
                                    </Match>
                                    <Match when={step() === 5}>Finish</Match>
                                </Switch>
                            </button>
                        </div>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}

function VideoGuide() {
    return (
        <div class="ring-gray-4 bg-gray-6 shadow-proeminent rounded-xl p-2 ring">
            <video class="ring-gray-4 rounded-md ring" src={cloneRepositoryVideo} autoplay loop muted playsinline />
        </div>
    );
}
