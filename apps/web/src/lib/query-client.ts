import { QueryClient } from "@tanstack/solid-query";
import { persistQueryClientRestore, persistQueryClientSubscribe } from "@tanstack/query-persist-client-core";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QUERY_CACHE_STORAGE_KEYS } from "./storage-keys";

const QUERY_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const QUERY_CACHE_BUSTER = "v1";

const persister =
    typeof window !== "undefined"
        ? createAsyncStoragePersister({
              storage: window.localStorage,
              key: QUERY_CACHE_STORAGE_KEYS.TANSTACK_QUERY,
              throttleTime: 1_000,
          })
        : undefined;

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: QUERY_CACHE_MAX_AGE_MS,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

let restorePromise: Promise<void> | null = null;
let unsubscribePersist: (() => void) | null = null;

export async function restorePersistedQueryClient() {
    if (!persister) return;

    if (restorePromise) {
        await restorePromise;
        return;
    }

    restorePromise = (async () => {
        await persistQueryClientRestore({
            queryClient,
            persister,
            maxAge: QUERY_CACHE_MAX_AGE_MS,
            buster: QUERY_CACHE_BUSTER,
        });

        unsubscribePersist?.();
        unsubscribePersist = persistQueryClientSubscribe({
            queryClient,
            persister,
            buster: QUERY_CACHE_BUSTER,
        });
    })();

    await restorePromise;
}

export async function clearPersistedQueryClient() {
    unsubscribePersist?.();
    unsubscribePersist = null;
    restorePromise = null;

    await persister?.removeClient();
    queryClient.clear();
}

export default queryClient;

declare global {
    interface Window {
        __TANSTACK_QUERY_CLIENT__?: QueryClient;
    }
}

if (typeof window !== "undefined") {
    window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}

if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        unsubscribePersist?.();
        unsubscribePersist = null;
        restorePromise = null;
    });
}

// https://chatgpt.com/share/69c43934-2754-83e9-ab83-074b1796e982
