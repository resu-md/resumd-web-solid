import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./index.js";
import { assertRuntimeEnvFromProcessEnv } from "./runtime.js";

assertRuntimeEnvFromProcessEnv();

const port = Number(process.env.PORT ?? "8787");

serve(
    {
        fetch: app.fetch,
        port,
    },
    (info) => {
        console.log(`resumd backend listening on http://localhost:${info.port}`);
    },
);
