import styles from "./IntegrateGithubModal.module.css";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
import clsx from "clsx";
import cloneRepositoryVideo from "./assets/clone-repository-video.mp4";

type StepConfig = {
    start: number;
    end?: number;
    paused?: boolean;
    playDelayMs?: number;
    zoomClass?: string;
    zoomSections?: {
        start: number;
        end?: number;
        zoomClass: string;
    }[];
};

const STEP_CONFIG: StepConfig[] = [
    { start: 0, end: 0, paused: true, zoomClass: styles.zoomRest },
    {
        start: 0,
        end: 11.46,
        playDelayMs: 4200,
        zoomClass: styles.zoomRest,
        zoomSections: [
            { start: 0, end: 0.01, zoomClass: styles.zoomRest },
            { start: 0.01, end: 2.35, zoomClass: styles.zoomTopRight },
            { start: 2.35, end: 6.27, zoomClass: styles.zoomRest },
            { start: 6.27, end: 9.37, zoomClass: styles.zoomBottomRight },
            { start: 9.37, end: Infinity, zoomClass: styles.zoomRest },
        ],
    },
    {
        start: 11.46,
        end: 17,
        zoomClass: styles.zoomCenterClose,
        zoomSections: [
            { start: 11.45, end: 16, zoomClass: styles.zoomCenterClose },
            { start: 16, end: 17, zoomClass: styles.zoomAdjustLarger },
        ],
    },
    {
        start: 17,
        end: Infinity,
        zoomClass: styles.zoomAdjustLarger,
        zoomSections: [
            { start: 17, end: 22, zoomClass: styles.zoomAdjustLarger },
            { start: 22, end: 29, zoomClass: styles.zoomCenter },
            { start: 29, end: Infinity, zoomClass: styles.zoomAdjustLarger },
        ],
    },
    { start: Infinity, end: Infinity, paused: true, zoomClass: styles.zoomOut },
];

const NORMAL_RATE = 1;
const TIME_EPSILON = 0.04;

export default function IntegrateGithubVideoGuide(props: { step: number; paused?: boolean }) {
    let videoRef: HTMLVideoElement | undefined;
    let reachedEnd = false;
    let canPlayCurrentStep = true;
    let playbackDelayTimeout: ReturnType<typeof setTimeout> | undefined;
    const [currentTime, setCurrentTime] = createSignal(0);

    const getStepConfig = () =>
        STEP_CONFIG[Math.min(Math.max(props.step, 0), STEP_CONFIG.length - 1)] ?? STEP_CONFIG[0];
    const getStepStart = () => getStepConfig().start ?? 0;
    const getStepEnd = () => getStepConfig().end ?? Infinity;
    const isPausedStep = () => !!getStepConfig().paused;
    const isExternallyPaused = () => props.paused ?? false;
    const getStepPlayDelayMs = () => getStepConfig().playDelayMs ?? 0;
    const getZoomClass = () => {
        const step = getStepConfig();
        if (step.zoomSections?.length) {
            const time = currentTime();
            const match = step.zoomSections.find((section) => {
                const sectionEnd = section.end ?? Infinity;
                return time + TIME_EPSILON >= section.start && time <= sectionEnd + TIME_EPSILON;
            });
            if (match) return match.zoomClass;
        }
        return step.zoomClass ?? styles.zoomRest;
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

        const start = getStepStart();
        const end = getStepEnd();
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

        if (isPausedStep() || isExternallyPaused()) {
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

    createEffect(() => {
        const externallyPaused = isExternallyPaused();
        props.step;
        if (!videoRef) return;
        const start = getStepStart();
        const playDelayMs = getStepPlayDelayMs();

        clearPlaybackDelayTimeout();
        canPlayCurrentStep = !externallyPaused && playDelayMs <= 0;

        if (!externallyPaused && playDelayMs > 0) {
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
        if (isPausedStep() || externallyPaused || !canPlayCurrentStep) {
            videoRef.pause();
            return;
        }
        syncPlayback();
    });

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
