import { createEffect, createSignal, Match, on, onCleanup, onMount, Show, Switch } from "solid-js";
import styles from "./IntegrateGithubModal.module.css";
import clsx from "clsx";
import { Dialog } from "@kobalte/core/dialog";
import cloneRepositoryVideo from "./assets/clone-repository-video.mov";
import { CgPlayBackwards, CgUndo } from "solid-icons/cg";
import RoughAnnotation from "@/components/rough-notation/RoughAnnotation";
import { IoArrowUpRightBoxOutline } from "solid-icons/io";
import { FiArrowUpRight } from "solid-icons/fi";

const TEMPLATE_URL = "https://github.com/resumemarkdown/template-jakes-resume";

const GITHUB_ANIMATION_DELAY = 400;
const GITHUB_ANIMATION_DURATION = 250;
const RESUME_ANIMATION_DELAY = GITHUB_ANIMATION_DELAY + GITHUB_ANIMATION_DURATION + 500;
const RESUME_ANIMATION_DURATION = 1500;

export default function GithubIntegrationInstructionsModal() {
    const [step, setStep] = createSignal(0);

    const stepIn = (...includes: Array<number>) => {
        const currentStep = step();
        return includes.includes(currentStep);
    };

    return (
        <Dialog open={true}>
            <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <Dialog.Content class="proeminent-button relative flex aspect-16/13 w-170 flex-col overflow-hidden rounded-3xl shadow-xl outline-none">
                        <div class={clsx("absolute z-0 size-full px-10 pt-5", styles.modalDiagramContainer)}>
                            <VideoGuide step={step()} />
                        </div>

                        <div
                            class={clsx(
                                "proeminent-button absolute z-5 size-full",
                                styles.backgroundMask,
                                stepIn(3) && styles.maskMedium,
                                stepIn(4) && styles.maskLarge,
                                stepIn(5, 6) && styles.maskLarger,
                            )}
                        />

                        <div class="z-10 flex w-full flex-1 flex-col items-center justify-end px-5 pt-5">
                            <div class="px-8 pb-1 text-center text-xl">
                                <Switch>
                                    <Match when={step() === 0}>
                                        <h2>First, you will need to create a repository</h2>
                                    </Match>
                                    <Match when={step() === 1}>
                                        {/* <h2>That is, clone a template...</h2> */}
                                        <h2>We recommend you to clone a template...</h2>
                                    </Match>
                                    <Match when={step() === 2}>
                                        <h2>Give it a name...</h2>
                                    </Match>
                                    <Match when={step() === 3}>
                                        <h2>And make it private</h2>
                                        <p class="text-label-secondary mt-0.25 text-sm font-light italic">
                                            This one is optional, but recommended
                                        </p>
                                    </Match>
                                    <Match when={step() === 4}>
                                        <h2>
                                            Now, replace{" "}
                                            <RoughAnnotation
                                                type="strike-through"
                                                color="#636366"
                                                class="font-light"
                                                delay={GITHUB_ANIMATION_DELAY}
                                                duration={GITHUB_ANIMATION_DURATION}
                                                strokeWidth={2}
                                                padding={2}
                                                iterations={2}
                                            >
                                                github
                                            </RoughAnnotation>
                                            .com with{" "}
                                            <RoughAnnotation
                                                type="circle"
                                                color="#ffd600"
                                                class="font-light"
                                                delay={RESUME_ANIMATION_DELAY}
                                                duration={RESUME_ANIMATION_DURATION}
                                                strokeWidth={2}
                                                padding={[6, 6]}
                                                iterations={1}
                                            >
                                                resumemarkdown
                                            </RoughAnnotation>
                                            .com
                                            <br />
                                            in that repository URL
                                        </h2>
                                    </Match>
                                    <Match when={step() === 5}>
                                        <h2>And, finally, authorize access to that repository</h2>
                                        <p class="text-label-secondary mt-0.25 text-sm font-light">
                                            We recommend choosing <i>Only selected repositories</i> and selecting only
                                            the repository you just created
                                        </p>
                                    </Match>
                                    <Match when={step() === 6}>
                                        <h2>
                                            You are{" "}
                                            <RoughAnnotation
                                                type="underline"
                                                color="#0091ff"
                                                delay={200}
                                                duration={400}
                                                strokeWidth={2}
                                                padding={0}
                                                iterations={3}
                                            >
                                                set
                                            </RoughAnnotation>
                                            !
                                        </h2>
                                        <p class="text-label-secondary mt-0.25 text-sm font-light">
                                            Make changes to the template resume and commit them!
                                            <br />
                                            On every commit, a GitHub action will generate your resume as a PDF.
                                        </p>
                                    </Match>
                                </Switch>
                            </div>

                            <div class="mt-2.5 mb-6 flex w-full items-center gap-3">
                                <div class="flex flex-[1_1_0%] items-center justify-start">
                                    <Switch>
                                        <Match when={step() > 0}>
                                            <button
                                                class="text-label-tertiary hover:text-label-secondary animate-fade-in cursor-pointer px-2 text-sm transition-colors duration-100 select-none"
                                                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                                            >
                                                Prev
                                            </button>
                                        </Match>
                                    </Switch>
                                </div>

                                <button
                                    class="button-blue flex h-8 cursor-pointer items-center rounded-full px-3 text-sm font-normal select-none"
                                    onClick={() => setStep((prev) => Math.min(prev + 1, 6))}
                                >
                                    <Switch>
                                        <Match when={step() === 0}>Ok, continue</Match>
                                        <Match when={step() > 0 && step() < 3}>
                                            Next{" "}
                                            <span class="text-gray-5 ml-2 text-sm font-light tabular-nums">
                                                {step()}/3
                                            </span>
                                        </Match>
                                        <Match when={step() === 3}>
                                            Clone the template{" "}
                                            <IoArrowUpRightBoxOutline class="mr-1.25 ml-0.75 inline size-3" /> and
                                            continue
                                            {/* <FiArrowUpRight class="-mr-0.5 ml-0.5 inline size-4.5" /> */}
                                        </Match>
                                        <Match when={step() === 4}>Continue</Match>
                                        <Match when={step() === 5}>
                                            <i>Done that</i>
                                        </Match>
                                        <Match when={step() === 6}>Continue to app</Match>
                                    </Switch>
                                </button>
                                <div class="flex-[1_1_0%]" />
                            </div>
                        </div>
                    </Dialog.Content>
                </div>
            </Dialog.Portal>
        </Dialog>
    );
}

function VideoGuide(props: { step: number }) {
    // Keep the last boundary as Infinity to mean "play until the end".
    // If you add more steps, insert their timestamps before Infinity.
    const STEP_BOUNDARIES = [0, 2.41, 6.52, 11.06, Infinity];
    const NORMAL_RATE = 1;
    const TIME_EPSILON = 0.04;
    let videoRef: HTMLVideoElement | undefined;
    let reachedEnd = false;

    const LAST_BOUNDARY_INDEX = STEP_BOUNDARIES.length - 1;
    const MAX_START_INDEX = Math.max(0, LAST_BOUNDARY_INDEX - 1);

    const getStepStart = () => STEP_BOUNDARIES[Math.min(Math.max(props.step - 1, 0), MAX_START_INDEX)] ?? 0;
    const getStepEnd = () => STEP_BOUNDARIES[Math.min(Math.max(props.step, 1), LAST_BOUNDARY_INDEX)] ?? Infinity;
    const getZoomClass = () => {
        if (props.step === 1) return styles.zoomTopRight;
        if (props.step === 2) return styles.zoomCenter;
        if (props.step === 3) return styles.zoomBottomRight;
        return styles.zoomRest;
    };

    const syncPlayback = () => {
        const video = videoRef;
        if (!video) return;

        const start = getStepStart();
        const end = getStepEnd();
        const time = video.currentTime;

        if (!Number.isFinite(end) && reachedEnd) {
            video.pause();
            return;
        }

        if (time + TIME_EPSILON < start) {
            video.currentTime = start;
        }

        if (video.playbackRate !== NORMAL_RATE) video.playbackRate = NORMAL_RATE;

        if (Number.isFinite(end) && time + TIME_EPSILON >= end) {
            video.currentTime = end;
            video.pause();
            return;
        }

        if (!Number.isFinite(end) && Number.isFinite(video.duration) && time + TIME_EPSILON >= video.duration) {
            reachedEnd = true;
            video.currentTime = video.duration;
            video.pause();
            return;
        }

        if (video.paused) void video.play().catch(() => undefined);
    };

    onMount(() => {
        const video = videoRef;
        if (!video) return;

        const handleTimeUpdate = () => syncPlayback();
        const handleLoadedMetadata = () => syncPlayback();
        const handleEnded = () => {
            reachedEnd = true;
            video.pause();
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("ended", handleEnded);

        syncPlayback();

        onCleanup(() => {
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("ended", handleEnded);
        });
    });

    createEffect(() => {
        props.step;
        if (!videoRef) return;
        const start = getStepStart();
        reachedEnd = false;
        videoRef.playbackRate = NORMAL_RATE;
        videoRef.currentTime = start;
        syncPlayback();
    });

    return (
        <div class={clsx("flex flex-col", styles.videoFrame, getZoomClass())}>
            <div class="ring-gray-4 bg-gray-6 shadow-proeminent rounded-t-xl p-1.5 pb-1 ring">
                <div class={clsx("ring-gray-4 rounded-t-md ring", styles.videoViewport)}>
                    <video
                        ref={videoRef}
                        class="size-full"
                        src={cloneRepositoryVideo}
                        autoplay
                        muted
                        playsinline
                        preload="auto"
                    />
                </div>
            </div>
            <div class="bg-gray-6 ring-gray-4 shadow-proeminent -mx-8 flex h-3.5 items-start justify-center rounded-b-lg ring">
                <div class="from-gray-4/50 to-gray-4/70 border-gray-4 h-1.5 w-20 rounded-b-md border-x border-b bg-linear-to-b" />
            </div>
        </div>
    );
}
