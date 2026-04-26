import clsx from "clsx";
import {
    createEffect,
    createMemo,
    createSignal,
    type Accessor,
    type Component,
    For,
    onCleanup,
    onMount,
    type JSX,
    Show,
    Switch,
    Match,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import styles from "./IntegrateGithubModal.module.css";

import RoughAnnotation from "@/components/onboarding/RoughAnnotation";
import { Dialog } from "@kobalte/core/dialog";
import { IoArrowUpRightBoxOutline } from "solid-icons/io";
import IntegrateGithubVideoGuide from "./IntegrateGithubVideoGuide";
import { StepProvider, useStep } from "./useStep";
import { createPresence } from "@solid-primitives/presence";
import { CgChevronLeft, CgClose, CgUndo } from "solid-icons/cg";

const TEMPLATE_URL = "https://github.com/resumemarkdown/template-jakes-resume";
const MAX_STEP = 4;
const URL_REWRITE_ANNOTATION_STEP = 2;
const URL_REWRITE_RETURN_FALLBACK_MS = 600;
const MIDDLE_STEP_MIN = 1;
const MIDDLE_STEP_MAX = MAX_STEP - 1;
const MIDDLE_INDICATOR_STEPS = [1, 2, 3] as const;
const STEP_TRANSITION_DURATION_MS = 300;

type OnboardingSection = "intro" | "guide" | "done";

const isMiddleStep = (value: number) => value >= MIDDLE_STEP_MIN && value <= MIDDLE_STEP_MAX;
const getStepSection = (value: number): OnboardingSection =>
    value === 0 ? "intro" : value === MAX_STEP ? "done" : "guide";

function createOnboardingTransition(step: Accessor<number>) {
    const section = () => getStepSection(step());
    const presence = createPresence<OnboardingSection>(section, {
        transitionDuration: STEP_TRANSITION_DURATION_MS,
    });
    const visibleSection = () => presence.mountedItem() ?? section();
    const visibleGuideStep = createMemo<number>((previousGuideStep) => {
        const currentStep = step();
        return isMiddleStep(currentStep) ? currentStep : previousGuideStep;
    }, MIDDLE_STEP_MIN);
    const visibleStep = (): number => {
        const currentSection = visibleSection();
        if (currentSection === "intro") return 0;
        if (currentSection === "done") return MAX_STEP;
        return visibleGuideStep();
    };
    const fadeClass = () => clsx(FADE_TRANSITION_CLASS, presence.isVisible() ? "opacity-100" : "opacity-0");

    return {
        presence,
        visibleSection,
        visibleStep,
        visibleGuideStep,
        fadeClass,
    };
}

function createUrlRewriteAnnotationState(step: Accessor<number>) {
    const [urlRewriteAnnotationsActive, setUrlRewriteAnnotationsActive] = createSignal(false);
    let shouldWaitForRepositoryReturn = false;
    let hasPageLostAttentionAfterClone = false;
    let returnFallbackTimeout: ReturnType<typeof setTimeout> | undefined;

    const isPageVisible = () => (typeof document === "undefined" ? true : document.visibilityState === "visible");
    const hasPageFocus = () => (typeof document === "undefined" ? true : document.hasFocus());
    const isPageActive = () => isPageVisible() && hasPageFocus();

    const clearReturnFallbackTimeout = () => {
        if (returnFallbackTimeout === undefined) return;
        clearTimeout(returnFallbackTimeout);
        returnFallbackTimeout = undefined;
    };

    const activateUrlRewriteAnnotations = () => {
        clearReturnFallbackTimeout();
        shouldWaitForRepositoryReturn = false;
        setUrlRewriteAnnotationsActive(true);
    };

    const markPageLostAttention = () => {
        if (!shouldWaitForRepositoryReturn || urlRewriteAnnotationsActive()) return;
        hasPageLostAttentionAfterClone = true;
        clearReturnFallbackTimeout();
    };

    const scheduleActivePageFallback = () => {
        clearReturnFallbackTimeout();
        returnFallbackTimeout = setTimeout(() => {
            returnFallbackTimeout = undefined;
            if (step() === URL_REWRITE_ANNOTATION_STEP && shouldWaitForRepositoryReturn && isPageActive()) {
                activateUrlRewriteAnnotations();
            }
        }, URL_REWRITE_RETURN_FALLBACK_MS);
    };

    const activateAfterRepositoryReturn = () => {
        if (urlRewriteAnnotationsActive() || step() !== URL_REWRITE_ANNOTATION_STEP || !shouldWaitForRepositoryReturn) {
            return;
        }

        if (!isPageActive()) {
            markPageLostAttention();
            return;
        }

        if (hasPageLostAttentionAfterClone) {
            activateUrlRewriteAnnotations();
            return;
        }

        scheduleActivePageFallback();
    };

    const waitForRepositoryReturn = () => {
        if (urlRewriteAnnotationsActive()) return;
        shouldWaitForRepositoryReturn = true;
        hasPageLostAttentionAfterClone = false;
        clearReturnFallbackTimeout();
    };

    onMount(() => {
        const handleVisibilityChange = () => {
            if (isPageVisible()) {
                activateAfterRepositoryReturn();
                return;
            }
            markPageLostAttention();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", activateAfterRepositoryReturn);
        window.addEventListener("pageshow", activateAfterRepositoryReturn);
        window.addEventListener("blur", markPageLostAttention);

        onCleanup(() => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", activateAfterRepositoryReturn);
            window.removeEventListener("pageshow", activateAfterRepositoryReturn);
            window.removeEventListener("blur", markPageLostAttention);
            clearReturnFallbackTimeout();
        });
    });

    createEffect(() => {
        if (urlRewriteAnnotationsActive()) return;

        if (step() !== URL_REWRITE_ANNOTATION_STEP) {
            clearReturnFallbackTimeout();
            if (shouldWaitForRepositoryReturn && !hasPageLostAttentionAfterClone && isPageActive()) {
                shouldWaitForRepositoryReturn = false;
            }
            return;
        }

        if (shouldWaitForRepositoryReturn) {
            activateAfterRepositoryReturn();
            return;
        }

        activateUrlRewriteAnnotations();
    });

    return {
        urlRewriteAnnotationsActive,
        waitForRepositoryReturn,
    };
}

type StepContentProps = {
    urlRewriteAnnotationsActive: boolean;
};

const STEP_CONTENT: Record<number, Component<StepContentProps>> = {
    0: IntroStepContent,
    1: CloneTemplateStepContent,
    2: RepositoryUrlStepContent,
    3: AuthorizeRepositoryStepContent,
    [MAX_STEP]: DoneStepContent,
};

type BottomActionsProps = {
    step: number;
    visibleGuideStep: number;
    setStep: (step: number) => void;
    incrementStep: () => void;
    decrementStep: () => void;
    openTemplateRepository: () => void | Promise<void>;
};

const SECTION_ACTIONS: Record<OnboardingSection, Component<BottomActionsProps>> = {
    intro: IntroActions,
    guide: GuideActions,
    done: DoneActions,
};

export default function IntegrateGithubModal(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            {/* <Dialog.Trigger>{props.children}</Dialog.Trigger> */}
            <Dialog.Portal>
                <Dialog.Overlay
                    class={clsx(
                        "fixed inset-0 z-50 bg-black/25",
                        "motion-duration-250",
                        "data-expanded:motion-opacity-in-0 data-expanded:motion-ease-out",
                        "data-closed:motion-opacity-out-0 data-closed:motion-ease-out data-closed:motion-delay-100",
                    )}
                />
                <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <Dialog.Content
                        class={clsx(
                            "proeminent-button relative flex aspect-16/13 w-170 flex-col overflow-hidden rounded-3xl shadow-xl outline-none",
                            "motion-duration-300",
                            "data-expanded:motion-scale-in-98 data-expanded:motion-opacity-in-0 data-expanded:motion-ease-out",
                            "data-closed:motion-scale-out-98 data-closed:motion-opacity-out-0 data-closed:motion-ease-in",
                        )}
                    >
                        <StepProvider minStep={0} maxStep={MAX_STEP}>
                            <Onboarding />
                        </StepProvider>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}

const FADE_TRANSITION_CLASS = "transition-opacity duration-300 ease-out";
const TOP_BUTTON_CLASS =
    "bg-system-tertiary/75 hit-area-0.5 absolute z-20 w-fit cursor-pointer rounded-full p-0.75 backdrop-blur-md";

function Onboarding() {
    const { step, setStep, incrementStep, decrementStep } = useStep();
    const transition = createOnboardingTransition(step);
    const videoPresence = createPresence(() => (transition.visibleSection() === "intro" ? undefined : true), {
        transitionDuration: STEP_TRANSITION_DURATION_MS,
    });
    const { urlRewriteAnnotationsActive, waitForRepositoryReturn } = createUrlRewriteAnnotationState(step);

    const openTemplateRepository = async () => {
        waitForRepositoryReturn();
        window.open(TEMPLATE_URL, "_blank");
        await new Promise((resolve) => setTimeout(resolve, 100));
        incrementStep();
    };

    return (
        <>
            <Switch>
                <Match when={transition.visibleStep() > 0 && transition.visibleStep() < MAX_STEP}>
                    <button
                        class={clsx(TOP_BUTTON_CLASS, "top-3.75 left-3.75", transition.fadeClass())}
                        tabindex={-1}
                        onClick={decrementStep}
                    >
                        <CgChevronLeft class="text-label-tertiary size-4" />
                    </button>
                </Match>
                <Match when={transition.visibleStep() === MAX_STEP}>
                    <button
                        class={clsx(TOP_BUTTON_CLASS, "top-3.75 left-3.75", transition.fadeClass())}
                        tabindex={-1}
                        onClick={() => setStep(0)}
                    >
                        <CgUndo class="text-label-tertiary size-4" />
                    </button>
                </Match>
            </Switch>

            <Dialog.CloseButton class={clsx(TOP_BUTTON_CLASS, "top-3.75 right-3.75")} tabindex={-1}>
                <CgClose class="text-label-tertiary size-4" />
            </Dialog.CloseButton>

            <Show when={videoPresence.isMounted()}>
                <div
                    class={clsx(
                        "absolute z-0 size-full px-14 pt-12",
                        FADE_TRANSITION_CLASS,
                        styles.modalDiagramContainer,
                        videoPresence.isVisible() ? "opacity-100" : "opacity-0",
                        // step() === 0 && "translate-y-5 opacity-20 blur-[1px]",
                    )}
                >
                    <IntegrateGithubVideoGuide step={step()} />
                </div>
            </Show>

            <div
                class={clsx(
                    "proeminent-button absolute right-0 bottom-0 left-0 z-5 h-[28%]",
                    FADE_TRANSITION_CLASS,
                    styles.backgroundMask,
                    step() === MIDDLE_STEP_MIN && transition.presence.isVisible() ? "opacity-100" : "opacity-0",
                )}
            />

            <div class="z-10 flex w-full flex-1 flex-col items-center justify-end px-5 pt-5">
                <div
                    class={clsx(
                        transition.visibleStep() === 0
                            ? "flex w-full flex-1 items-center justify-center px-3 pt-11 text-xl"
                            : "w-full px-3 text-xl",
                        transition.fadeClass(),
                    )}
                >
                    <Dynamic
                        component={STEP_CONTENT[transition.visibleStep()] ?? DoneStepContent}
                        urlRewriteAnnotationsActive={urlRewriteAnnotationsActive()}
                    />
                </div>

                <div class={clsx("mt-3 mb-5 flex w-full items-center gap-3", transition.fadeClass())}>
                    <Dynamic
                        component={SECTION_ACTIONS[transition.visibleSection()]}
                        step={step()}
                        visibleGuideStep={transition.visibleGuideStep()}
                        setStep={setStep}
                        incrementStep={incrementStep}
                        decrementStep={decrementStep}
                        openTemplateRepository={openTemplateRepository}
                    />
                </div>
            </div>
        </>
    );
}

function IntroStepContent() {
    return (
        <h2 class="text-center">
            <span class="motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-100 motion-duration-700">First,</span>
            <span class="motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-900 motion-duration-800">
                {" "}
                you will need to create a repository{" "}
            </span>
            <span class="motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-1800 motion-duration-800">
                for your resume
            </span>
        </h2>
    );
}

function CloneTemplateStepContent() {
    return (
        <>
            <h2 class="text-center text-balance duration-300 *:transition-opacity">
                Clone the template repository template to your GitHub account
            </h2>
            <p class="text-label-secondary mt-1 text-center text-sm font-light">
                We recommend keeping its visibility private, but that is optional.
            </p>
        </>
    );
}

function RepositoryUrlStepContent(props: StepContentProps) {
    return (
        <h2 class="text-center text-balance">
            Now, go to your repository, and replace{" "}
            <span class="text-nowrap">
                <RoughAnnotation
                    type="strike-through"
                    color="#636366"
                    class="font-light"
                    active={props.urlRewriteAnnotationsActive}
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
                    active={props.urlRewriteAnnotationsActive}
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
    );
}

function AuthorizeRepositoryStepContent() {
    return (
        <>
            <h2>And, finally, authorize access to that repository</h2>
            <p class="text-label-secondary mt-1 text-sm font-light">
                We recommend choosing{" "}
                <RoughAnnotation
                    type="underline"
                    color="rgba(255, 204, 0, 0.5)"
                    class="mr-px"
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
        </>
    );
}

function DoneStepContent() {
    return (
        <>
            <h2>
                <RoughAnnotation
                    type="highlight"
                    color="#00c1e887"
                    delay={700}
                    duration={800}
                    strokeWidth={2}
                    iterations={1}
                >
                    You are set!
                </RoughAnnotation>
            </h2>
            <p class="text-label-secondary mt-1 text-sm font-light">
                Make changes to the template resume and commit them. On every commit, a GitHub action will generate a
                PDF from your resume files.
            </p>
        </>
    );
}

function IntroActions(props: BottomActionsProps) {
    return (
        <div class="motion-opacity-in motion-delay-2000 motion-duration-1600 motion-ease-linear flex w-full justify-center">
            <Button onClick={props.incrementStep}>Continue</Button>
        </div>
    );
}

function GuideActions(props: BottomActionsProps) {
    return (
        <div class="flex w-full">
            <div class="flex-[1_1_0%]"></div>

            <div class="flex items-center justify-center gap-1.5">
                <For each={MIDDLE_INDICATOR_STEPS}>
                    {(indicatorStep) => (
                        <button
                            class={clsx(
                                "hit-area-1 size-1.75 cursor-pointer rounded-full",
                                props.step === indicatorStep
                                    ? "bg-fill-primary w-4.5"
                                    : "bg-fill-tertiary hover:bg-fill-primary transition-colors",
                            )}
                            onClick={() => props.setStep(indicatorStep)}
                        />
                    )}
                </For>
            </div>

            <div class="flex flex-[1_1_0%] justify-end">
                <Button
                    onClick={() =>
                        props.visibleGuideStep === MIDDLE_STEP_MIN
                            ? props.openTemplateRepository()
                            : props.incrementStep()
                    }
                >
                    <Show when={props.visibleGuideStep === MIDDLE_STEP_MIN} fallback={<i>Done that</i>}>
                        <>
                            Clone the template <IoArrowUpRightBoxOutline class="ml-1.25 inline size-3" />
                        </>
                    </Show>
                </Button>
            </div>
        </div>
    );
}

function DoneActions(props: BottomActionsProps) {
    return (
        <div class="flex w-full">
            <div class="flex-[1_1_0%]">
                <button
                    class="text-label-tertiary hover:text-label-secondary motion-opacity-in motion-delay-1200 motion-duration-300 h-8 cursor-pointer rounded-full px-3 text-sm transition-colors duration-100 select-none"
                    onClick={() => props.setStep(0)}
                >
                    Restart guide
                </button>
            </div>
            <Button onClick={props.incrementStep}>Go to app</Button>
            <div class="flex-[1_1_0%]"></div>
        </div>
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
