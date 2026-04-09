import styles from "./IntegrateGithubModal.module.css";
import { createEffect, onCleanup, onMount } from "solid-js";
import clsx from "clsx";
import cloneRepositoryVideo from "./assets/clone-repository-video.mov";

type StepConfig = {
    start: number;
    end?: number;
    paused?: boolean;
    zoomClass?: string;
};

const STEP_CONFIG: StepConfig[] = [
    { start: 0, end: 0, paused: true, zoomClass: styles.zoomRest }, // step 0 (paused)
    { start: 0, end: 2.41, zoomClass: styles.zoomTopRight }, // step 1
    { start: 2.41, end: 6.52, zoomClass: styles.zoomRest }, // step 2
    { start: 6.52, end: 11.06, zoomClass: styles.zoomBottomRight }, // step 3
    { start: 11.06, end: Infinity, zoomClass: styles.zoomAdjustLarge }, // step 4
    { start: Infinity, end: Infinity, zoomClass: styles.zoomAdjustLarger }, // step 5
    { start: Infinity, end: Infinity, zoomClass: styles.zoomAdjustLarger }, // step 6
];

const NORMAL_RATE = 1;
const TIME_EPSILON = 0.04;

export default function IntegrateGithubVideoGuide(props: { step: number }) {
    let videoRef: HTMLVideoElement | undefined;
    let reachedEnd = false;

    const getStepConfig = () =>
        STEP_CONFIG[Math.min(Math.max(props.step, 0), STEP_CONFIG.length - 1)] ?? STEP_CONFIG[0];
    const getStepStart = () => getStepConfig().start ?? 0;
    const getStepEnd = () => getStepConfig().end ?? Infinity;
    const isPausedStep = () => !!getStepConfig().paused;
    const getZoomClass = () => getStepConfig().zoomClass ?? styles.zoomRest;

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
            return;
        }

        if (isPausedStep()) {
            video.pause();
            return;
        }

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
        if (!Number.isFinite(start)) {
            if (Number.isFinite(videoRef.duration)) {
                videoRef.currentTime = videoRef.duration;
            }
            reachedEnd = true;
            videoRef.pause();
            return;
        }
        videoRef.currentTime = start;
        if (isPausedStep()) {
            videoRef.pause();
            return;
        }
        syncPlayback();
    });

    return (
        <div class={clsx("flex flex-col", styles.videoFrame, getZoomClass())}>
            <div class="ring-gray-4 bg-gray-6 shadow-proeminent rounded-t-xl p-1.5 pb-1 ring">
                <div class={clsx("ring-gray-4 aspect-851/540 rounded-t-md ring", styles.videoViewport)}>
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
