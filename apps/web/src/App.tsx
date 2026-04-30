import { type JSXElement } from "solid-js";
import { Route, Router } from "@solidjs/router";
import { MetaProvider, Title } from "@solidjs/meta";
// Context
import queryClient from "./lib/query-client";
import { QueryClientProvider } from "@tanstack/solid-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
// Pages
import AuthenticatedEditorPage from "./pages/AuthenticatedEditorPage";
import ManageRepositoriesPage from "./pages/ManageRepositoriesPage";
import AnonymousEditorPage from "./pages/AnonymousEditorPage";
import LogoutPage from "./pages/LogoutPage";
import { GithubProvider } from "./contexts/github/GithubContext";

export default function App() {
    const routerBase = import.meta.env.BASE_URL === "/" ? "/" : import.meta.env.BASE_URL.replace(/\/+$/, ""); // TODO: Check if needed

    return (
        <MetaProvider>
            <Title>Resumd</Title>

            <Router base={routerBase} root={ContextProviders}>
                <Route component={GithubProvider}>
                    <Route path="/" component={AnonymousEditorPage} />
                    <Route path="/manage" component={ManageRepositoriesPage} />
                    <Route path="/logout" component={LogoutPage} />
                    <Route path={["/:owner/:repo", "/:owner/:repo/tree/*branch"]} component={AuthenticatedEditorPage} />
                </Route>
            </Router>
        </MetaProvider>
    );
}

function ContextProviders(props: { children?: JSXElement }) {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>{props.children}</ThemeProvider>
        </QueryClientProvider>
    );
}
