import { createEffect, createSignal, onCleanup, onMount, type Accessor } from "solid-js";

type ReturnAwareActivationOptions = {
    fallbackMs?: number;
};

export function createReturnAwareActivation(when: Accessor<boolean>, options: ReturnAwareActivationOptions = {}) {
    const [isActive, setIsActive] = createSignal(false);
    let shouldWaitForReturn = false;
    let hasPageLostAttention = false;
    let fallbackTimeout: ReturnType<typeof setTimeout> | undefined;

    const isPageVisible = () => (typeof document === "undefined" ? true : document.visibilityState === "visible");
    const hasPageFocus = () => (typeof document === "undefined" ? true : document.hasFocus());
    const isPageAttended = () => isPageVisible() && hasPageFocus();

    const clearFallbackTimeout = () => {
        if (fallbackTimeout === undefined) return;
        clearTimeout(fallbackTimeout);
        fallbackTimeout = undefined;
    };

    const activate = () => {
        clearFallbackTimeout();
        shouldWaitForReturn = false;
        setIsActive(true);
    };

    const markPageUnattended = () => {
        if (!shouldWaitForReturn || isActive()) return;
        hasPageLostAttention = true;
        clearFallbackTimeout();
    };

    const scheduleAttendedPageFallback = () => {
        clearFallbackTimeout();
        fallbackTimeout = setTimeout(() => {
            fallbackTimeout = undefined;
            if (when() && shouldWaitForReturn && isPageAttended()) activate();
        }, options.fallbackMs ?? 0);
    };

    const activateAfterReturn = () => {
        if (isActive() || !when() || !shouldWaitForReturn) return;

        if (!isPageAttended()) {
            markPageUnattended();
            return;
        }

        if (hasPageLostAttention) {
            activate();
            return;
        }

        scheduleAttendedPageFallback();
    };

    const deferNextActivationUntilReturn = () => {
        if (isActive()) return;
        shouldWaitForReturn = true;
        hasPageLostAttention = false;
        clearFallbackTimeout();
    };

    onMount(() => {
        const handleVisibilityChange = () => {
            if (isPageVisible()) {
                activateAfterReturn();
                return;
            }
            markPageUnattended();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", activateAfterReturn);
        window.addEventListener("pageshow", activateAfterReturn);
        window.addEventListener("blur", markPageUnattended);
        window.addEventListener("pagehide", markPageUnattended);

        onCleanup(() => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", activateAfterReturn);
            window.removeEventListener("pageshow", activateAfterReturn);
            window.removeEventListener("blur", markPageUnattended);
            window.removeEventListener("pagehide", markPageUnattended);
            clearFallbackTimeout();
        });
    });

    createEffect(() => {
        if (isActive()) return;

        if (!when()) {
            clearFallbackTimeout();
            if (shouldWaitForReturn && !hasPageLostAttention && isPageAttended()) {
                shouldWaitForReturn = false;
            }
            return;
        }

        if (shouldWaitForReturn) {
            activateAfterReturn();
            return;
        }

        activate();
    });

    return {
        isActive,
        deferNextActivationUntilReturn,
    };
}
