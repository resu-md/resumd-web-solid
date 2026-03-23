import { ErrorBoundary, type JSXElement } from "solid-js";
import { ApiError } from "@/lib/fetch";

export default function AppErrorBoundary(props: { children?: JSXElement }) {
    return (
        <ErrorBoundary fallback={(error, reset) => <ErrorScreen error={error} onRetry={reset} />}>
            {props.children}
        </ErrorBoundary>
    );
}

function ErrorScreen(props: { error: unknown; onRetry: () => void }) {
    const title = getErrorTitle(props.error);
    const message = getErrorMessage(props.error);

    return (
        <main class="bg-system-primary text-label-primary flex min-h-dvh w-dvw items-center justify-center p-4">
            <section class="bg-system-secondary border-stroke-primary w-full max-w-xl rounded-xl border p-6">
                <p class="text-label-tertiary text-xs font-semibold tracking-wide uppercase">Application error</p>
                <h1 class="mt-2 text-2xl font-semibold">{title}</h1>
                <p class="text-label-secondary mt-3 leading-relaxed">{message}</p>

                <div class="mt-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        class="bg-fill-brand hover:bg-fill-brand-hover active:bg-fill-brand-active rounded-md px-4 py-2 text-sm font-medium"
                        onClick={props.onRetry}
                    >
                        Try again
                    </button>
                    <button
                        type="button"
                        class="bg-fill-secondary hover:bg-fill-tertiary rounded-md border px-4 py-2 text-sm font-medium"
                        onClick={() => {
                            window.location.assign("/");
                        }}
                    >
                        Go to home
                    </button>
                </div>
            </section>
        </main>
    );
}

function getErrorTitle(error: unknown): string {
    if (error instanceof ApiError) {
        if (error.status === 401) return "Not authorized";
        if (error.status >= 500) return "Backend request failed";
        return `Request failed (${error.status})`;
    }

    return "Something went wrong";
}

function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        return error.message || "Unexpected API error.";
    }

    if (error instanceof Error) {
        return error.message || "Unexpected application error.";
    }

    return "Unexpected application error.";
}
