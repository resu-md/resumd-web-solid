import clsx from "clsx";
import { createEffect, createSignal, onCleanup, onMount, type JSX, Match, Show, Switch } from "solid-js";
import styles from "./IntegrateGithubModal.module.css";

import RoughAnnotation from "@/components/onboarding/RoughAnnotation";
import { Dialog } from "@kobalte/core/dialog";
import { IoArrowUpRightBoxOutline } from "solid-icons/io";
import IntegrateGithubVideoGuide from "./IntegrateGithubVideoGuide";
import { StepProvider, useStep } from "./useStep";

const TEMPLATE_URL = "https://github.com/resumemarkdown/template-jakes-resume";
const MAX_STEP = 7;

export default function IntegrateGithubModal() {
    return (
        <StepProvider minStep={0} maxStep={MAX_STEP} initialStep={0}>
            <IntegrateGithubModalContent />
        </StepProvider>
    );
}

export function IntegrateGithubModalContent() {
    const { stepInRange } = useStep();

    return (
        <Dialog open={true}>
            <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <Dialog.Content class="proeminent-button relative flex aspect-16/13 w-170 flex-col overflow-hidden rounded-3xl shadow-xl outline-none">
                        <Show when={stepInRange(0, MAX_STEP)}>
                            <OnboardingStep />
                        </Show>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}

function OnboardingStep() {
    const { step, setStep, stepInRange, incrementStep, decrementStep, stepIn } = useStep();

    const [showAnnotation, setShowAnnotation] = createSignal(false);

    const openTemplateRepository = () => {
        window.open(TEMPLATE_URL, "_blank");
        incrementStep();
    };

    /**
     * Logic to control showAnnotation and make it so the `RoughAnnotation`s are only triggered when the user comes
     * back from the external tab
     */

    let hasBeenHiddenOnStepFive = false;

    const isPageVisible = () => (typeof document === "undefined" ? true : document.visibilityState === "visible");

    onMount(() => {
        const handlePageVisibilityChange = () => {
            if (step() !== 5) return;
            if (!isPageVisible()) {
                hasBeenHiddenOnStepFive = true;
                return;
            }
            if (hasBeenHiddenOnStepFive && !showAnnotation()) setShowAnnotation(true);
        };

        document.addEventListener("visibilitychange", handlePageVisibilityChange);

        onCleanup(() => {
            document.removeEventListener("visibilitychange", handlePageVisibilityChange);
        });
    });

    createEffect(() => {
        if (step() !== 5) {
            setShowAnnotation(false);
            hasBeenHiddenOnStepFive = false;
            return;
        }
        setShowAnnotation(false);
        hasBeenHiddenOnStepFive = !isPageVisible();
    });

    return (
        <>
            <div class={clsx("absolute z-0 size-full px-14 pt-12", styles.modalDiagramContainer)}>
                <IntegrateGithubVideoGuide step={step()} />
            </div>

            <div
                class={clsx(
                    "proeminent-button absolute right-0 bottom-0 left-0 z-5 h-[28%]",
                    styles.backgroundMask,
                    stepIn(1) ? "opacity-100" : "opacity-0",
                )}
            />

            <div class="z-10 flex w-full flex-1 flex-col items-center justify-end px-5 pt-5">
                <div class="w-full px-3 text-xl">
                    <Switch>
                        <Match when={step() === 0}>
                            <h2 class="text-center">
                                <span class="motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-100 motion-duration-500">
                                    First,
                                </span>
                                <span class="motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-1000 motion-duration-1000">
                                    {" "}
                                    you will need to create a repository{" "}
                                </span>
                                <span class="motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-2200 motion-duration-1000">
                                    for your resume
                                </span>
                            </h2>
                        </Match>
                        <Match when={step() === 1}>
                            {/* <h2>That is, clone a template...</h2> */}
                            <h2 class="text-center">We recommend you to clone a template...</h2>
                        </Match>
                        <Match when={step() === 2}>
                            <h2 class="text-center">Give it a name...</h2>
                        </Match>
                        <Match when={step() === 3}>
                            <h2 class="text-center">And make it private.</h2>
                            <p class="text-label-secondary mt-1 text-center text-sm font-light italic">
                                This one is optional, but recommended.
                            </p>
                        </Match>
                        <Match when={step() === 4}>
                            <h2 class="text-center">So, go ahead and do that</h2>
                        </Match>
                        <Match when={step() === 5}>
                            <h2 class="text-center text-balance">
                                Now, go to your repository, and replace{" "}
                                <span class="text-nowrap">
                                    <RoughAnnotation
                                        type="strike-through"
                                        color="#636366"
                                        class="font-light"
                                        active={showAnnotation()}
                                        delay={1000}
                                        duration={400}
                                        strokeWidth={2}
                                        padding={2}
                                        iterations={2}
                                    >
                                        github
                                    </RoughAnnotation>
                                    .com
                                </span>{" "}
                                with{" "}
                                <span class="text-nowrap">
                                    <RoughAnnotation
                                        type="circle"
                                        color="#ffd600"
                                        class="font-light"
                                        active={showAnnotation()}
                                        delay={2300}
                                        duration={400}
                                        strokeWidth={2}
                                        padding={[6, 6]}
                                        iterations={1}
                                    >
                                        resumemarkdown
                                    </RoughAnnotation>
                                    .com
                                </span>{" "}
                                in the URL
                            </h2>
                        </Match>
                        <Match when={step() === 6}>
                            <h2>And, finally, authorize access to that repository</h2>
                            <p class="text-label-secondary mt-1 text-sm font-light">
                                We recommend choosing{" "}
                                <RoughAnnotation
                                    type="underline"
                                    color="rgba(255, 204, 0, 0.5)"
                                    class="mr-0.25"
                                    delay={500}
                                    duration={800}
                                    strokeWidth={2}
                                    iterations={1}
                                    padding={-0.6}
                                >
                                    <i>Only selected repositories</i>
                                </RoughAnnotation>{" "}
                                and only conceding access to the repository you just created.
                            </p>
                        </Match>
                        <Match when={step() === MAX_STEP}>
                            <h2>
                                You are{" "}
                                <RoughAnnotation
                                    type="underline"
                                    color="#0091ff"
                                    delay={200}
                                    duration={400}
                                    padding={-0.5}
                                    strokeWidth={2}
                                    iterations={2}
                                >
                                    set
                                </RoughAnnotation>
                                !
                            </h2>
                            <p class="text-label-secondary mt-1 text-sm font-light">
                                Make changes to the template resume and commit them. On every commit, a GitHub action
                                will generate a PDF from your resume files.
                            </p>
                        </Match>
                    </Switch>
                </div>

                <div class="mt-3 mb-5 flex w-full items-center gap-3">
                    <Show when={step() === 0}>
                        <div class="flex w-full justify-center">
                            <Button onClick={incrementStep}>Continue</Button>
                        </div>
                    </Show>

                    <Show when={stepInRange(1, MAX_STEP - 1)}>
                        <div class="flex w-full justify-between">
                            <button
                                class="text-label-tertiary hover:text-label-secondary animate-fade-in cursor-pointer rounded-full px-3 text-sm transition-colors duration-100 select-none"
                                onClick={decrementStep}
                            >
                                Prev
                            </button>

                            <Switch>
                                <Match when={stepInRange(1, 3)}>
                                    <Button onClick={incrementStep}>
                                        Next{" "}
                                        <span class="text-gray-5 ml-2 text-sm font-light tabular-nums">{step()}/3</span>
                                    </Button>
                                </Match>
                                <Match when={step() === 4}>
                                    <Button onClick={openTemplateRepository}>
                                        Clone the template <IoArrowUpRightBoxOutline class="ml-0.75 inline size-3" />
                                    </Button>
                                </Match>
                                <Match when={stepInRange(5, MAX_STEP - 1)}>
                                    <Button onClick={incrementStep}>
                                        <i>Done that</i>
                                    </Button>
                                </Match>
                            </Switch>
                        </div>
                    </Show>

                    <Show when={step() === MAX_STEP}>
                        <div class="flex flex-1 justify-end gap-3">
                            <Show when={step() === MAX_STEP}>
                                <button
                                    class="text-label-tertiary hover:text-label-secondary motion-opacity-in motion-delay-1200 motion-duration-300 h-8 cursor-pointer rounded-full px-3 text-sm transition-colors duration-100 select-none"
                                    onClick={() => setStep(-1)}
                                >
                                    Restart guide
                                </button>
                            </Show>
                            <Button onClick={incrementStep}>
                                Go to app {/* <FiArrowRight class="ml-1 inline size-4" /> */}
                            </Button>
                        </div>
                    </Show>
                </div>
            </div>
        </>
    );
}

function Button(props: { children: JSX.Element } & JSX.HTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            class="button-blue flex h-8 cursor-pointer items-center rounded-full px-3 text-sm font-normal select-none"
            {...props}
        >
            {props.children}
        </button>
    );
}
