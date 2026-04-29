import styles from "./IntegrateGithubModal.module.css";
import { createEffect, createSignal, onCleanup, onMount, on } from "solid-js";
import clsx from "clsx";
import cloneRepositoryVideo from "./assets/clone-repository-video.mp4";

type ZoomSection = {
    start: number;
    end?: number;
    zoomClass: string;
};

type StepConfig = {
    playDelayMs?: number;
    paused?: boolean;
    sections: ZoomSection[];
};

const STEP_CONFIG: StepConfig[] = [
    {
        paused: true,
        sections: [{ start: 0, zoomClass: styles.zoomRest }],
    },
    {
        playDelayMs: 4200,
        sections: [
            { start: 0, end: 0.01, zoomClass: styles.zoomRest },
            { start: 0.01, end: 2.35, zoomClass: styles.zoomTopRight },
            { start: 2.35, end: 6.27, zoomClass: styles.zoomRest },
            { start: 6.27, end: 9.37, zoomClass: styles.zoomBottomRight },
            { start: 9.37, end: 11.46, zoomClass: styles.zoomRest },
        ],
    },
    {
        sections: [
            { start: 11.45, end: 16, zoomClass: styles.zoomCenterClose },
            { start: 16, end: 17.1, zoomClass: styles.zoomAdjustLarger },
        ],
    },
    {
        sections: [
            { start: 17.1, end: 22, zoomClass: styles.zoomAdjustLarger },
            { start: 22, end: 29, zoomClass: styles.zoomCenter },
            { start: 29, zoomClass: styles.zoomAdjustLarger },
        ],
    },
    {
        paused: true,
        sections: [{ start: Infinity, zoomClass: styles.zoomOut }],
    },
];

const NORMAL_RATE = 1;
const TIME_EPSILON = 0.04;

export default function IntegrateGithubVideoGuide(props: { step: number; paused?: boolean }) {
    let videoRef: HTMLVideoElement | undefined;
    let reachedEnd = false;
    let canPlayCurrentStep = true;
    let playbackDelayTimeout: ReturnType<typeof setTimeout> | undefined;
    const [currentTime, setCurrentTime] = createSignal(0);

    const getStepConfig = (stepIndex: number) =>
        STEP_CONFIG[Math.min(Math.max(stepIndex, 0), STEP_CONFIG.length - 1)] ?? STEP_CONFIG[0];
    const getZoomClass = () => {
        const step = getStepConfig(props.step);
        const time = currentTime();
        const match = step.sections.find((section) => {
            const sectionEnd = section.end ?? Infinity;
            return time + TIME_EPSILON >= section.start && time <= sectionEnd + TIME_EPSILON;
        });
        return match?.zoomClass ?? step.sections[0]?.zoomClass ?? styles.zoomRest;
    };

    const updateCurrentTime = () => {
        if (!videoRef) return;
        setCurrentTime(videoRef.currentTime);
    };

    const clearPlaybackDelayTimeout = () => {
        if (playbackDelayTimeout === undefined) return;
        clearTimeout(playbackDelayTimeout);
        playbackDelayTimeout = undefined;
    };

    const syncPlayback = () => {
        const video = videoRef;
        if (!video) return;

        const step = getStepConfig(props.step);
        const start = step.sections[0]?.start ?? 0;
        const end = step.sections[step.sections.length - 1]?.end ?? Infinity;
        const time = video.currentTime;

        if (!Number.isFinite(start)) {
            if (Number.isFinite(video.duration)) {
                video.currentTime = video.duration;
            }
            reachedEnd = true;
            video.pause();
            updateCurrentTime();
            return;
        }

        if (step.paused || props.paused) {
            video.pause();
            updateCurrentTime();
            return;
        }

        if (!Number.isFinite(end) && reachedEnd) {
            video.pause();
            updateCurrentTime();
            return;
        }

        if (!canPlayCurrentStep) {
            video.pause();
            updateCurrentTime();
            return;
        }

        if (time + TIME_EPSILON < start) {
            video.currentTime = start;
        }

        if (video.playbackRate !== NORMAL_RATE) video.playbackRate = NORMAL_RATE;

        if (Number.isFinite(end) && time + TIME_EPSILON >= end) {
            video.currentTime = end;
            video.pause();
            updateCurrentTime();
            return;
        }

        if (!Number.isFinite(end) && Number.isFinite(video.duration) && time + TIME_EPSILON >= video.duration) {
            reachedEnd = true;
            video.currentTime = video.duration;
            video.pause();
            updateCurrentTime();
            return;
        }

        if (video.paused) void video.play().catch(() => undefined);
        updateCurrentTime();
    };

    onMount(() => {
        const video = videoRef;
        if (!video) return;

        const handleTimeUpdate = () => syncPlayback();
        const handleLoadedMetadata = () => syncPlayback();
        const handleEnded = () => {
            reachedEnd = true;
            video.pause();
            updateCurrentTime();
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("ended", handleEnded);

        video.load();
        syncPlayback();

        onCleanup(() => {
            clearPlaybackDelayTimeout();
            video.removeEventListener("timeupdate", handleTimeUpdate);
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("ended", handleEnded);
        });
    });

    createEffect(
        on(
            () => props.step,
            (stepIndex) => {
                if (!videoRef) return;
                const step = getStepConfig(stepIndex);
                const start = step.sections[0]?.start ?? 0;
                const playDelayMs = step.playDelayMs ?? 0;

                clearPlaybackDelayTimeout();
                canPlayCurrentStep = !props.paused && playDelayMs <= 0;

                if (!props.paused && playDelayMs > 0) {
                    playbackDelayTimeout = setTimeout(() => {
                        canPlayCurrentStep = true;
                        syncPlayback();
                    }, playDelayMs);
                }

                reachedEnd = false;
                videoRef.playbackRate = NORMAL_RATE;

                if (!Number.isFinite(start)) {
                    if (Number.isFinite(videoRef.duration)) {
                        videoRef.currentTime = videoRef.duration;
                    }
                    reachedEnd = true;
                    videoRef.pause();
                    updateCurrentTime();
                    return;
                }

                videoRef.currentTime = start;
                updateCurrentTime();

                if (step.paused || props.paused || !canPlayCurrentStep) {
                    videoRef.pause();
                    return;
                }
                syncPlayback();
            },
            { defer: false },
        ),
    );

    createEffect(
        on(
            () => props.paused,
            (paused) => {
                if (!videoRef) return;
                if (paused) {
                    clearPlaybackDelayTimeout();
                    canPlayCurrentStep = false;
                    videoRef.pause();
                    updateCurrentTime();
                } else {
                    const step = getStepConfig(props.step);
                    const playDelayMs = step.playDelayMs ?? 0;
                    if (playDelayMs > 0 && !canPlayCurrentStep) {
                        clearPlaybackDelayTimeout();
                        playbackDelayTimeout = setTimeout(() => {
                            canPlayCurrentStep = true;
                            syncPlayback();
                        }, playDelayMs);
                    } else {
                        canPlayCurrentStep = true;
                        syncPlayback();
                    }
                }
            },
            { defer: true },
        ),
    );

    return (
        <div class={clsx("flex flex-col", styles.videoFrame, getZoomClass())}>
            <div class="ring-gray-4 bg-gray-6 shadow-proeminent rounded-t-xl p-1.5 pb-1 ring">
                <div class={clsx("ring-gray-4 aspect-3024/1898 rounded-t-md ring", styles.videoViewport)}>
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
            <div class="bg-gray-6 ring-gray-4 shadow-proeminent -mx-9 flex h-3.5 items-start justify-center rounded-b-lg ring">
                <div class="from-gray-4/50 to-gray-4/70 border-gray-4 h-1.5 w-20 rounded-b-md border-x border-b bg-linear-to-b" />
            </div>
        </div>
    );
}
