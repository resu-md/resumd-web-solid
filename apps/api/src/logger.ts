import { configure, getConsoleSink, getLogger } from "@logtape/logtape";

await configure({
  sinks: { console: getConsoleSink() },
  loggers: [
    { category: ["hono"], sinks: ["console"], lowestLevel: "info" },
    { category: ["app"], sinks: ["console"], lowestLevel: "info" }
  ],
});

export const log = getLogger(["app"]);
