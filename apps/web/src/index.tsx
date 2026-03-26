/* @refresh reload */
import { render } from "solid-js/web";
import "./index.css";
import App from "./App.tsx";
import queryClient, { restorePersistedQueryClient } from "./lib/query-client.ts";
import { QueryClientProvider } from "@tanstack/solid-query";

const root = document.getElementById("root");

async function start() {
    await restorePersistedQueryClient();

    render(
        () => (
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        ),
        root!,
    );
}

void start();
