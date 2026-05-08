import { createEffect, createSignal, onCleanup, onMount, untrack } from "solid-js";

const CURSOR_ONLY_MS = 1200;
const PAUSE_BEFORE_RETYPE_MS = [120, 220] as const;
const TYPE_DELAY_MS = [20, 55] as const;
const DELETE_DELAY_MS = [15, 35] as const;

type LoadingMode = "idle" | "typing" | "deleting";

function randomBetween([min, max]: readonly [number, number]) {
    return min + Math.round(Math.random() * (max - min));
}

function typeDelayFor(textChunk: string) {
    const delay = randomBetween(TYPE_DELAY_MS);

    if (/[,.:;!?]/.test(textChunk)) return delay + randomBetween([80, 170]);
    if (textChunk === " ") return delay + randomBetween([12, 48]);

    return delay;
}

function getCommonPrefixLength(value: string, otherValue: string) {
    const maxLength = Math.min(value.length, otherValue.length);

    for (let index = 0; index < maxLength; index++) {
        if (value[index] !== otherValue[index]) return index;
    }

    return maxLength;
}

export default function Loading(props: { children?: string; thresholdMs?: number }) {
    const [animationStarted, setAnimationStarted] = createSignal(false);
    const [displayedText, setDisplayedText] = createSignal("");

    let activeTargetText = "";
    let deleteStopLength = 0;
    let mode: LoadingMode = "idle";
    let thresholdTimeout: ReturnType<typeof setTimeout> | undefined;
    let stepTimeout: ReturnType<typeof setTimeout> | undefined;

    const clearStepTimeout = () => {
        if (stepTimeout === undefined) return;
        clearTimeout(stepTimeout);
        stepTimeout = undefined;
    };

    const runStep = () => {
        stepTimeout = undefined;

        const currentText = displayedText();

        if (mode === "deleting") {
            if (currentText.length > deleteStopLength) {
                setDisplayedText(currentText.slice(0, -1));
                queueStep(randomBetween(DELETE_DELAY_MS));
                return;
            }

            mode = currentText === activeTargetText ? "idle" : "typing";
            if (mode === "typing") queueStep(randomBetween(PAUSE_BEFORE_RETYPE_MS));
            return;
        }

        if (mode === "typing") {
            if (currentText === activeTargetText) {
                mode = "idle";
                return;
            }

            if (currentText.length > activeTargetText.length || !activeTargetText.startsWith(currentText)) {
                deleteStopLength = getCommonPrefixLength(currentText, activeTargetText);
                mode = currentText ? "deleting" : "typing";
                queueStep(0);
                return;
            }

            const nextText = activeTargetText.slice(0, currentText.length + 1);
            const nextTextChunk = activeTargetText.slice(currentText.length, nextText.length);
            setDisplayedText(nextText);
            queueStep(typeDelayFor(nextTextChunk));
        }
    };

    const queueStep = (delay: number) => {
        clearStepTimeout();
        stepTimeout = setTimeout(runStep, delay);
    };

    createEffect(() => {
        const nextTargetText = props.children ?? "";

        if (!animationStarted()) return;
        if (nextTargetText === activeTargetText) return;

        activeTargetText = nextTargetText;

        const currentText = untrack(displayedText);
        if (currentText === activeTargetText) {
            mode = "idle";
            clearStepTimeout();
            return;
        }

        deleteStopLength = getCommonPrefixLength(currentText, activeTargetText);
        mode = currentText.length > deleteStopLength ? "deleting" : "typing";
        queueStep(0);
    });

    onMount(() => {
        thresholdTimeout = setTimeout(() => {
            setAnimationStarted(true);
        }, props.thresholdMs ?? CURSOR_ONLY_MS);
    });

    onCleanup(() => {
        if (thresholdTimeout !== undefined) clearTimeout(thresholdTimeout);
        clearStepTimeout();
    });

    return (
        <div class="bg-system-primary text-label-primary motion-opacity-in-0 motion-duration-300 h-dvh w-dvw p-4 antialiased">
            <div class="flex items-center">
                <span
                    class="font-mono text-sm leading-none whitespace-pre"
                    style={{
                        "font-feature-settings": '"liga" 0, "calt" 0',
                        "font-variant-ligatures": "none",
                    }}
                >
                    {displayedText()}
                </span>
                <div class="bg-label-primary motion-opacity-loop-10 motion-duration-1000 motion-loop-infinite motion-ease-linear motion-reduce:motion-paused ml-[0.08ch] h-[1.07em] w-[0.95ch] rounded-[2px]"></div>
            </div>
        </div>
    );
}
