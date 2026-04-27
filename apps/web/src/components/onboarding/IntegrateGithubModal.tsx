import styles from "./IntegrateGithubModal.module.css";
import { type Accessor, createMemo, For, type JSX, Match, Show, splitProps, Switch } from "solid-js";
import clsx from "clsx";
import RoughAnnotation from "@/components/onboarding/RoughAnnotation";
import { Dialog } from "@kobalte/core/dialog";
import { createPresence } from "@solid-primitives/presence";
import { CgChevronLeft, CgClose, CgUndo } from "solid-icons/cg";
import { IoArrowUpRightBoxOutline } from "solid-icons/io";
import { createReturnAwareActivation } from "./createReturnAwareActivation";
import IntegrateGithubVideoGuide from "./IntegrateGithubVideoGuide";
import { StepProvider, useStep } from "./useStep";
import WithTooltip from "@/components/_ui/WithTooltip";
import { useGithubAuth } from "@/contexts/github/GithubContext";

export const TEMPLATE_URL = "https://github.com/resumemarkdown/template-jakes-resume";
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

export default function IntegrateGithubModal(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return (
        <Dialog open={props.open} onOpenChange={props.onOpenChange}>
            {/* <Dialog.Trigger>{props.children}</Dialog.Trigger> */}
            <Dialog.Portal>
                <Dialog.Overlay
                    class={clsx(
                        "dark:bg-system-secondary fixed inset-0 z-50 bg-white",
                        "motion-duration-250",
                        "data-expanded:motion-opacity-in-0 data-expanded:motion-ease-out",
                        "data-closed:motion-opacity-out-0 data-closed:motion-ease-out data-closed:motion-delay-100",
                    )}
                />
                <Dialog.Overlay
                    class={clsx(
                        "fixed inset-0 z-50 bg-black/25 dark:bg-transparent",
                        "motion-duration-250",
                        "data-expanded:motion-opacity-in-0 data-expanded:motion-ease-out",
                        "data-closed:motion-opacity-out-0 data-closed:motion-ease-out data-closed:motion-delay-100",
                    )}
                />
                <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <Dialog.Content
                        onPointerDownOutside={(event) => event.preventDefault()}
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
    const { step, setStep, incrementStep, decrementStep, stepVisited } = useStep();
    const transition = createOnboardingTransition(step);
    const videoPresence = createPresence(() => (transition.visibleSection() === "intro" ? undefined : true), {
        transitionDuration: STEP_TRANSITION_DURATION_MS,
    });
    const urlRewriteActivation = createReturnAwareActivation(() => step() === URL_REWRITE_ANNOTATION_STEP, {
        fallbackMs: URL_REWRITE_RETURN_FALLBACK_MS,
    });
    const shouldPauseUrlRewriteVideo = () => step() === URL_REWRITE_ANNOTATION_STEP && !urlRewriteActivation.isActive();

    const openTemplateRepository = async () => {
        urlRewriteActivation.deferNextActivationUntilReturn();
        window.open(TEMPLATE_URL, "_blank");
        await new Promise((resolve) => setTimeout(resolve, 100));
        incrementStep();
    };

    return (
        <>
            <Switch>
                <Match when={transition.visibleStep() > 0 && transition.visibleStep() < MAX_STEP}>
                    <WithTooltip
                        as="button"
                        class={clsx(
                            TOP_BUTTON_CLASS,
                            "top-3.75 left-3.75",
                            transition.fadeClass(),
                            !stepVisited(1) && "motion-opacity-in motion-delay-2800 motion-duration-1000",
                        )}
                        tabindex={-1}
                        onClick={decrementStep}
                        tooltip="Prev"
                    >
                        <CgChevronLeft class="text-label-tertiary size-4" />
                    </WithTooltip>
                </Match>
                <Match when={transition.visibleStep() === MAX_STEP}>
                    <WithTooltip
                        as="button"
                        class={clsx(TOP_BUTTON_CLASS, "top-3.75 left-3.75", transition.fadeClass())}
                        tabindex={-1}
                        onClick={() => setStep(0)}
                        tooltip="Restart guide"
                    >
                        <CgUndo class="text-label-tertiary size-4" />
                    </WithTooltip>
                </Match>
            </Switch>

            <Dialog.CloseButton class={clsx(TOP_BUTTON_CLASS, "top-3.75 right-3.75")} tabindex={-1}>
                <CgClose class="text-label-tertiary size-4" />
            </Dialog.CloseButton>

            <div
                class={clsx(
                    "absolute z-0 size-full px-14 pt-9",
                    FADE_TRANSITION_CLASS,
                    isMiddleStep(step()) && transition.presence.isVisible() && styles.videoBottomFade,
                    videoPresence.isVisible() ? !stepVisited(1) && "motion-opacity-in motion-delay-2800" : "opacity-0",
                )}
                aria-hidden={transition.visibleSection() === "intro"}
            >
                <IntegrateGithubVideoGuide step={transition.visibleStep()} paused={shouldPauseUrlRewriteVideo()} />
            </div>

            <Show when={transition.visibleStep() === 1}>
                <div
                    class={clsx(
                        "pointer-events-auto absolute inset-x-8 z-15 cursor-text text-xl select-text",
                        styles.cloneTemplateFloatingCopy,
                        !stepVisited(1) && styles.cloneTemplateLeadIn,
                    )}
                >
                    <CloneTemplateStepCopy />
                </div>
            </Show>

            <div class="z-10 flex w-full flex-1 flex-col items-center justify-end px-5 pt-5">
                <div
                    class={clsx(
                        transition.visibleStep() === 0
                            ? "flex w-full flex-1 items-center justify-center px-3 pt-11 text-xl"
                            : "w-full px-3 text-xl",
                        transition.fadeClass(),
                    )}
                >
                    <Switch fallback={<DoneStepContent />}>
                        <Match when={transition.visibleStep() === 0}>
                            <IntroStepContent />
                        </Match>
                        <Match when={transition.visibleStep() === 1}>
                            <div class={styles.cloneTemplateFlowPlaceholder} aria-hidden="true">
                                <CloneTemplateStepCopy />
                            </div>
                        </Match>
                        <Match when={transition.visibleStep() === 2}>
                            <RepositoryUrlStepContent urlRewriteAnnotationsActive={urlRewriteActivation.isActive()} />
                        </Match>
                        <Match when={transition.visibleStep() === 3}>
                            <AuthorizeRepositoryStepContent />
                        </Match>
                    </Switch>
                </div>

                <div class={clsx("mt-3 mb-5 flex w-full items-center gap-3", transition.fadeClass())}>
                    <Switch>
                        <Match when={transition.visibleSection() === "intro"}>
                            <IntroActions />
                        </Match>
                        <Match when={transition.visibleSection() === "guide"}>
                            <GuideActions
                                visibleGuideStep={transition.visibleGuideStep()}
                                onOpenTemplateRepository={openTemplateRepository}
                            />
                        </Match>
                        <Match when={transition.visibleSection() === "done"}>
                            <DoneActions />
                        </Match>
                    </Switch>
                </div>
            </div>
        </>
    );
}

function IntroStepContent() {
    const { stepVisited } = useStep();

    return (
        <h2 class="text-center">
            <span
                class={clsx(
                    !stepVisited(0) &&
                        "motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-400 motion-duration-700",
                )}
            >
                First,
            </span>
            <span
                class={clsx(
                    !stepVisited(0) &&
                        "motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-1300 motion-duration-800",
                )}
            >
                {" "}
                you will need to create a repository{" "}
            </span>
            <span
                class={clsx(
                    !stepVisited(0) &&
                        "motion-opacity-in-[0%] motion-blur-in-[2px] motion-delay-2200 motion-duration-800",
                )}
            >
                for your resume
            </span>
        </h2>
    );
}

function CloneTemplateStepCopy() {
    const { stepVisited } = useStep();

    return (
        <>
            <h2 class={clsx("text-center text-balance duration-300", !stepVisited(1) && "motion-opacity-in-0")}>
                Clone the template repository template to your GitHub account
            </h2>
            <p
                class={clsx(
                    "text-label-secondary mt-1 text-center text-sm font-light",
                    !stepVisited(1) && "motion-opacity-in motion-delay-1500 motion-duration-500",
                )}
            >
                We recommend keeping its visibility private, but that is optional.
            </p>
        </>
    );
}

function RepositoryUrlStepContent(props: { urlRewriteAnnotationsActive: boolean }) {
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

function IntroActions() {
    const { incrementStep, stepVisited } = useStep();

    return (
        <div
            class={clsx(
                "flex w-full justify-center",
                !stepVisited(0) && "motion-opacity-in motion-delay-2300 motion-duration-1600 motion-ease-linear",
            )}
        >
            <Button onClick={incrementStep}>Continue</Button>
        </div>
    );
}

function GuideActions(props: { visibleGuideStep: number; onOpenTemplateRepository: () => void }) {
    const { setStep, incrementStep, stepVisited } = useStep();

    return (
        <div class="flex w-full">
            <div class="flex-[1_1_0%]"></div>

            <div
                class={clsx(
                    "flex items-center justify-center gap-1.5",
                    !stepVisited(1) && "motion-opacity-in motion-delay-2800",
                )}
            >
                <For each={MIDDLE_INDICATOR_STEPS}>
                    {(indicatorStep) => (
                        <button
                            class={clsx(
                                "hit-area-1 size-1.75 cursor-pointer rounded-full",
                                props.visibleGuideStep === indicatorStep
                                    ? "bg-fill-primary dark:bg-label-secondary/60 w-4.5"
                                    : "bg-fill-tertiary dark:bg-label-tertiary/40 dark:hover:bg-label-secondary/60 hover:bg-fill-primary transition-colors",
                            )}
                            onClick={() => setStep(indicatorStep)}
                        />
                    )}
                </For>
            </div>

            <div class="flex flex-[1_1_0%] justify-end">
                <Show
                    when={props.visibleGuideStep === MIDDLE_STEP_MIN}
                    fallback={
                        <Button onClick={incrementStep}>
                            <i>Done that</i>
                        </Button>
                    }
                >
                    <Button
                        onClick={props.onOpenTemplateRepository}
                        class={clsx(!stepVisited(1) && "motion-opacity-in motion-delay-2800 motion-duration-1000")}
                    >
                        Clone the template <IoArrowUpRightBoxOutline class="ml-1.25 inline size-3" />
                    </Button>
                </Show>
            </div>
        </div>
    );
}

function DoneActions() {
    const { login } = useGithubAuth();

    return (
        <div class="flex w-full">
            <div class="flex-[1_1_0%]">
                {/* <button
                    class="text-label-tertiary hover:text-label-secondary motion-opacity-in motion-delay-1200 motion-duration-300 h-8 cursor-pointer rounded-full px-3 text-sm transition-colors duration-100 select-none"
                    onClick={() => setStep(0)}
                >
                    Restart guide
                </button> */}
            </div>
            <Button onClick={() => login("/manage")}>Go to app</Button>
            <div class="flex-[1_1_0%]"></div>
        </div>
    );
}

function Button(props: { children: JSX.Element; class?: string } & JSX.HTMLAttributes<HTMLButtonElement>) {
    const [local, rest] = splitProps(props, ["children", "class"]);

    return (
        <button
            class={clsx(
                "button-blue flex h-8 cursor-pointer items-center rounded-full px-3 text-sm font-normal select-none",
                local.class,
            )}
            {...rest}
        >
            {local.children}
        </button>
    );
}
