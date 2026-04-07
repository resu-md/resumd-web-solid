import { createEffect, createSignal, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import styles from "./IntegrateGithubModal.module.css";
import clsx from "clsx";
import { Dialog } from "@kobalte/core/dialog";
import cloneRepositoryVideo from "./assets/clone-repository-video.mov";
import { CgPlayBackwards, CgUndo } from "solid-icons/cg";

const TEMPLATE_URL = "https://github.com/resumemarkdown/template-jakes-resume";

export default function GithubIntegrationInstructionsModal() {
    const [step, setStep] = createSignal(1);

    return (
        <Dialog open={true}>
            <Dialog.Portal>
                <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
                <div class="fixed inset-0 z-50 flex items-center justify-center">
                    <Dialog.Content class="proeminent-button relative flex aspect-16/12 w-170 flex-col overflow-hidden rounded-3xl shadow-xl outline-none">
                        <div class={clsx("absolute z-0 size-full px-10 pt-5", styles.modalDiagramContainer)}>
                            <VideoGuide step={step()} />
                        </div>

                        <div
                            class={clsx(
                                "proeminent-button absolute z-5 size-full",
                                styles.backgroundMask,
                                step() < 4 ? styles.maskCompact : styles.maskExpanded,
                            )}
                        />

                        <div class="z-10 flex w-full flex-1 items-end justify-between gap-5 px-5 pt-5 pb-5">
                            <p class="pb-1 pl-1.5 text-xl text-balance">
                                <Switch>
                                    <Match when={step() === 1}>Create a new repository from the template</Match>
                                    <Match when={step() === 2}>Give it a name</Match>
                                    <Match when={step() === 3}>
                                        Make it private{" "}
                                        <i class="text-label-secondary text-sm font-light">
                                            (optional but recommended)
                                        </i>
                                    </Match>
                                    <Match when={step() === 4}>
                                        Replace <i class="font-light">github</i>.com with{" "}
                                        <i class="font-light">resumemarkdown</i>.com
                                        <br />
                                        in the cloned resume repository URL
                                    </Match>
                                    <Match when={step() === 5}>
                                        Authorize ResumeMarkdown access to that repository{" "}
                                        <i class="text-label-secondary text-sm font-light">
                                            (choose "Only selected repositories")
                                        </i>
                                    </Match>
                                </Switch>
                            </p>

                            <div class="flex items-center gap-3">
                                <Switch>
                                    <Match when={step() > 1 && step() < 5}>
                                        <button
                                            class="text-label-tertiary hover:text-label-secondary cursor-pointer px-0.5 font-medium transition-colors duration-100 select-none"
                                            onClick={() => setStep((prev) => Math.max(prev - 1, 1))}
                                        >
                                            <CgPlayBackwards size={20} />
                                        </button>
                                    </Match>
                                    <Match when={step() === 5}>
                                        <button
                                            class="text-label-tertiary hover:text-label-secondary cursor-pointer px-0.5 font-medium transition-colors duration-100 select-none"
                                            onClick={() => setStep(1)}
                                        >
                                            <CgUndo size={20} />
                                        </button>
                                    </Match>
                                </Switch>

                                <button
                                    class="button-blue flex h-9 cursor-pointer items-center rounded-full pr-3 pl-3.5 font-normal"
                                    onClick={() => setStep((prev) => Math.min(prev + 1, 5))}
                                >
                                    <Switch>
                                        <Match when={step() === 1}>Next</Match>
                                        <Match when={step() > 1 && step() < 5}>
                                            Next{" "}
                                            <span class="text-gray-5 ml-2 text-sm font-light tabular-nums">
                                                {step()}/5
                                            </span>
                                        </Match>
                                        <Match when={step() === 5}>Done</Match>
                                    </Switch>
                                </button>
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
    const WIND_RATE = 10;
    const TIME_EPSILON = 0.04;
    let videoRef: HTMLVideoElement | undefined;
    let reachedEnd = false;
    let lastStep = props.step;

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
            if (video.playbackRate !== WIND_RATE) video.playbackRate = WIND_RATE;
            if (video.paused) void video.play().catch(() => undefined);
            return;
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
        const currentStep = props.step;
        if (videoRef && currentStep < lastStep) {
            const start = getStepStart();
            reachedEnd = false;
            videoRef.playbackRate = NORMAL_RATE;
            videoRef.currentTime = start;
        }
        lastStep = currentStep;
        reachedEnd = false;
        syncPlayback();
    });

    return (
        <div class={clsx("flex flex-col", styles.videoFrame, getZoomClass())}>
            <div class="ring-gray-4 bg-gray-6 shadow-proeminent rounded-t-xl p-1.75 pb-1.25 ring">
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
            <div class="bg-gray-6 ring-gray-4 shadow-proeminent -mx-7 h-4 rounded-b-lg ring" />
        </div>
    );
}
